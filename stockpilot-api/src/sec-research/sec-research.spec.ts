import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {SecResearchService} from './sec-research.service';
import {SecIngestionService} from './sec-ingestion.service';
import {SecAccessError} from './sec-cache.service';
import {emptyLayers, type Checkpoint, type CompanyResearch} from './sec-research.types';

type ConstructorArgs = ConstructorParameters<typeof SecResearchService>;
function fixture() {
  const checkpoints = new Map<string, Checkpoint>();
  const companies = new Map<string, CompanyResearch>();
  let run: Record<string, unknown> | null = null;
  let fetches = 0;
  let extracts = 0;
  let fail = true;
  const service = new SecResearchService(
    {
      getUniverse: async () => [{symbol: 'AAA'}, {symbol: 'BBB'}, {symbol: 'NOSEC.L'}],
    } as unknown as ConstructorArgs[0],
    {
      acquire: async () => true,
      renew: async () => undefined,
      release: async () => undefined,
      activeFinancialRun: async () => 'financial-run',
      runState: async () => run,
      saveRun: async (_id: string, value: Record<string, unknown>) => {
        run = {...run, ...value};
      },
      checkpoints: async () => new Map(checkpoints),
      checkpoint: async (_id: string, value: Checkpoint) => {
        checkpoints.set(value.symbol, value);
      },
      company: async (cik: string) => companies.get(cik) ?? null,
      publish: async (value: CompanyResearch) => {
        companies.set(value.cik, value);
      },
    } as unknown as ConstructorArgs[1],
    {assertConfigured: () => undefined} as unknown as ConstructorArgs[2],
    {
      tickers: async () => [
        {ticker: 'AAA', cik_str: 1},
        {ticker: 'BBB', cik_str: 2},
      ],
      filings: async (cik: string) => {
        fetches++;
        if (cik.endsWith('2') && fail) throw new Error('Temporary filing failure');
        return [
          {
            accession: '0000000001-26-000001',
            form: '20-F',
            filedAt: '2026-01-01',
            reportDate: '',
            primaryDocument: 'a.htm',
          },
        ];
      },
      extractFiling: async () => {
        extracts++;
        return [{version: 1, layers: emptyLayers(), warnings: []}];
      },
    } as unknown as ConstructorArgs[3],
  );
  return {
    service,
    checkpoints,
    companies,
    recover: () => {
      fail = false;
    },
    stats: () => ({fetches, extracts}),
    expire: () => {
      run = {...run, completedAt: 0};
    },
  };
}

test('partial runs resume failed companies and preserve completed checkpoints across retries', async () => {
  const setup = fixture();
  const first = await setup.service.refresh();
  assert.equal(first.status, 'partial');
  assert.equal(first.failed, 1);
  assert.equal(first.noSecMatch, 1);
  const saved = setup.checkpoints.get('AAA');
  setup.recover();
  const second = await setup.service.refresh();
  assert.equal(second.status, 'complete');
  assert.equal(setup.checkpoints.get('AAA'), saved);
  assert.deepEqual(setup.stats(), {fetches: 3, extracts: 2});
  await setup.service.refresh();
  assert.deepEqual(setup.stats(), {fetches: 3, extracts: 2});
});

test('a new daily check skips extraction when filings have not changed', async () => {
  const setup = fixture();
  setup.recover();
  await setup.service.refresh();
  setup.expire();
  await new Promise((resolve) => setTimeout(resolve, 2));
  await setup.service.refresh();
  assert.deepEqual(setup.stats(), {fetches: 4, extracts: 2});
  assert.equal(setup.checkpoints.get('AAA')?.status, 'unchanged');
});

test('historical submission pages are included when their filing range overlaps the window', async () => {
  const calls: string[] = [];
  const columns = (accession: string) => ({
    form: ['6-K'],
    accessionNumber: [accession],
    filingDate: ['2026-01-01'],
    primaryDocument: ['a.htm'],
  });
  const ingestion = new SecIngestionService({
    get: async (url: string) => {
      calls.push(url);
      return {
        bytes: Buffer.from(
          JSON.stringify(
            url.endsWith('-001.json')
              ? columns('0000000001-26-000002')
              : {
                  cik: '1',
                  filings: {
                    recent: columns('0000000001-26-000001'),
                    files: [
                      {name: 'CIK0000000001-submissions-001.json', filingTo: '2026-02-01'},
                      {name: 'CIK0000000001-submissions-002.json', filingTo: '2020-01-01'},
                    ],
                  },
                },
          ),
        ),
      };
    },
  } as unknown as ConstructorParameters<typeof SecIngestionService>[0]);
  const filings = await ingestion.filings('0000000001', '2025-01-01', async () => undefined);
  assert.equal(filings.length, 2);
  assert.equal(calls.length, 2);
});

test('6-K attached EX-99 disclosures are extracted with their own source URL', async () => {
  const cache = new Map<string, unknown>();
  const ingestion = new SecIngestionService({
    get: async (url: string) => ({
      sha256: url,
      rawPath: 'raw',
      bytes: Buffer.from(
        url.endsWith('-index.html')
          ? '<table class="tableFile"><tr><td>2</td><td>Release</td><td><a href="ex99.htm">ex99.htm</a></td><td>EX-99.1</td></tr></table>'
          : url.endsWith('ex99.htm')
            ? '<p>Our self-mining hash rate reached 12 EH/s during the quarter ended March 31, 2026.</p>'
            : '<p>Report of foreign issuer.</p>',
      ),
    }),
    readJson: async (key: string) => cache.get(key) ?? null,
    writeJson: async (key: string, value: unknown) => {
      cache.set(key, value);
    },
  } as unknown as ConstructorParameters<typeof SecIngestionService>[0]);
  const result = await ingestion.extractFiling(
    '0000000001',
    {
      accession: '0000000001-26-000001',
      form: '6-K',
      filedAt: '2026-04-01',
      reportDate: '',
      primaryDocument: 'primary.htm',
    },
    async () => undefined,
  );
  const evidence = result.flatMap((item) => item.layers.operatingKpis.evidence);
  assert.equal(evidence.length, 1);
  assert.match(evidence[0].source.url, /ex99\.htm$/);
});

test('unsupported exhibits are reported and a cached filing avoids all source reads', async () => {
  const cache = new Map<string, unknown>();
  let sourceReads = 0;
  const ingestion = new SecIngestionService({
    get: async (url: string) => {
      sourceReads++;
      return {
        sha256: url,
        rawPath: 'raw',
        bytes: Buffer.from(
          url.endsWith('-index.html')
            ? '<table class="tableFile"><tr><td>2</td><td>Certification</td><td><a href="ex31.htm">ex31.htm</a></td><td>EX-31.1</td></tr><tr><td>3</td><td>Report</td><td><a href="ex99.pdf">ex99.pdf</a></td><td>EX-99.1</td></tr></table>'
            : '<p>Report of foreign issuer.</p>',
        ),
      };
    },
    readJson: async (key: string) => cache.get(key) ?? null,
    writeJson: async (key: string, value: unknown) => {
      cache.set(key, value);
    },
  } as unknown as ConstructorParameters<typeof SecIngestionService>[0]);
  const filing = {
    accession: '0000000001-26-000001',
    form: '6-K',
    filedAt: '2026-04-01',
    reportDate: '',
    primaryDocument: 'primary.htm',
  };
  const first = await ingestion.extractFiling('0000000001', filing, async () => undefined);
  assert.ok(first.flatMap((item) => item.warnings).some((value) => value.includes('EX-31.1')));
  assert.ok(first.flatMap((item) => item.warnings).some((value) => value.includes('ex99.pdf')));
  const second = await ingestion.extractFiling('0000000001', filing, async () => undefined);
  assert.deepEqual(first, second);
  assert.equal(sourceReads, 2);
});