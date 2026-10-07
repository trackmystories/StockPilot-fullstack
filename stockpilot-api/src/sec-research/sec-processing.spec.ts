import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {focusFilings, runWorkers} from './sec-processing';
import {SecCacheService} from './sec-cache.service';
import type {Filing} from './sec-research.types';

const filing = (
  accession: string,
  form: string,
  filedAt: string,
  reportDate = '2025-12-31',
): Filing => ({accession, form, filedAt, reportDate, primaryDocument: 'a.htm'});

test('focused selection keeps annual base and amendment, quarterly, and limits recent disclosures', () => {
  const rows = [
    filing('old', '10-K', '2025-01-01'),
    filing('annual', '10-K', '2026-02-01'),
    filing('amendment', '10-K/A', '2026-03-01'),
    filing('quarter', '10-Q', '2026-08-01'),
    filing('stale', '8-K', '2026-01-01'),
    ...Array.from({length: 12}, (_, i) => filing(`event${i}`, '8-K', '2026-09-01')),
  ];
  const selected = focusFilings(rows, Date.parse('2026-09-26'));
  assert.equal(selected.length, 9);
  assert.ok(selected.some((row) => row.accession === 'annual'));
  assert.ok(selected.some((row) => row.accession === 'amendment'));
  assert.ok(!selected.some((row) => row.accession === 'old' || row.accession === 'stale'));
  assert.equal(
    focusFilings(
      [filing('foreign', '20-F', '2026-04-01'), filing('interim', '6-K', '2026-08-01')],
      Date.parse('2026-09-26'),
    ).length,
    2,
  );
});

test('workers are bounded and drain before surfacing fatal errors', async () => {
  let active = 0;
  let maximum = 0;
  let finished = 0;
  await assert.rejects(
    runWorkers([1, 2, 3, 4, 5], 2, async (value) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, value === 1 ? 1 : 20));
      active--;
      if (value === 1) throw new Error('fatal');
      finished++;
    }),
    /fatal/,
  );
  assert.equal(maximum, 2);
  assert.equal(active, 0);
  assert.equal(finished, 1);
});

test('salvage never fetches missing SEC sources and accepts stale cached sources', async () => {
  const cache = new SecCacheService();
  const objects = new Map<string, Buffer>();
  cache.readBytes = async (key) => objects.get(key) ?? null;
  cache.writeBytes = async (key, bytes) => {
    objects.set(key, bytes);
  };
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response('cached disclosure');
  };
  try {
    await cache.useCachedSources(() =>
      assert.rejects(cache.get('https://www.sec.gov/missing.htm', 0), /not cached/),
    );
    assert.equal(requests, 0);
    await cache.get('https://www.sec.gov/cached.htm', 0);
    await cache.useCachedSources(() => cache.get('https://www.sec.gov/cached.htm', 0));
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test('concurrent SEC calls reserve distinct rate-limit slots', async () => {
  const cache = new SecCacheService();
  const start = Date.now();
  const times: number[] = [];
  await Promise.all(
    [1, 2, 3].map(async () => {
      await cache.reserveRequest();
      times.push(Date.now() - start);
    }),
  );
  assert.ok(times[1] >= 450);
  assert.ok(times[2] >= 950);
});

test('timeout is retried and in-flight duplicate requests are shared', async () => {
  const cache = new SecCacheService();
  const objects = new Map<string, Buffer>();
  cache.readBytes = async (key) => objects.get(key) ?? null;
  cache.writeBytes = async (key, bytes) => {
    objects.set(key, bytes);
  };
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls === 1) throw new DOMException('timed out', 'TimeoutError');
    return new Response('ok');
  };
  try {
    const values = await Promise.all([
      cache.get('https://www.sec.gov/retry.htm', 0),
      cache.get('https://www.sec.gov/retry.htm', 0),
    ]);
    assert.equal(calls, 2);
    assert.equal(values[0].sha256, values[1].sha256);
    assert.equal(cache.metrics.retries, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test('invalid mode cannot acquire a lease', async () => {
  const {SecResearchService} = await import('./sec-research.service');
  let acquired = false;
  const repository = {
    activeFinancialRun: async () => 'run',
    acquire: async () => {
      acquired = true;
      return true;
    },
  };
  const service = new SecResearchService(
    {} as never,
    repository as never,
    {assertConfigured() {}} as never,
    {} as never,
  );
  const before = process.env.SEC_RESEARCH_MODE;
  process.env.SEC_RESEARCH_MODE = 'invalid';
  try {
    await assert.rejects(service.refresh(), /SEC_RESEARCH_MODE/);
    assert.equal(acquired, false);
  } finally {
    if (before === undefined) delete process.env.SEC_RESEARCH_MODE;
    else process.env.SEC_RESEARCH_MODE = before;
  }
});

test('salvage has a separate run identity and partial filing results are published', async () => {
  const {SecResearchService} = await import('./sec-research.service');
  const runs = new Map<string, Record<string, unknown>>();
  const checkpoints = new Map<string, Map<string, unknown>>();
  let published: Record<string, unknown> | undefined;
  let extractionCalls = 0;
  const repository = {
    activeFinancialRun: async () => 'run',
    acquire: async () => true,
    renew: async () => undefined,
    release: async () => undefined,
    runState: async (id: string) => runs.get(id),
    saveRun: async (id: string, value: object) => {
      runs.set(id, {...runs.get(id), ...value});
    },
    checkpoints: async (id: string) => checkpoints.get(id) ?? new Map(),
    checkpoint: async (id: string, value: {symbol: string}) => {
      if (!checkpoints.has(id)) checkpoints.set(id, new Map());
      checkpoints.get(id)!.set(value.symbol, value);
    },
    company: async () => null,
    publish: async (value: Record<string, unknown>) => {
      published = value;
    },
  };
  const {emptyLayers} = await import('./sec-research.types');
  const service = new SecResearchService(
    {getUniverse: async () => [{symbol: 'AAA'}]} as never,
    repository as never,
    {assertConfigured() {}, useCachedSources: (task: () => Promise<unknown>) => task()} as never,
    {
      tickers: async () => [{ticker: 'AAA', cik_str: 1}],
      filings: async () => [
        filing('annual', '10-K', '2026-01-01'),
        filing('quarter', '10-Q', '2026-07-01'),
      ],
      extractFiling: async (_cik: string, row: Filing) => {
        extractionCalls++;
        if (row.accession === 'quarter') throw new Error('timeout');
        return [
          {source: {url: 'https://www.sec.gov/example'}, warnings: [], layers: emptyLayers()},
        ];
      },
    } as never,
  );
  const salvaged = await service.salvage();
  assert.ok(salvaged.runId.endsWith('-salvage'));
  assert.equal(salvaged.partial, 1);
  assert.equal(published?.failedFilingCount, 1);
  assert.equal(published?.documentCount, 1);
  const online = await service.refresh();
  assert.notEqual(online.runId, salvaged.runId);
  assert.equal(extractionCalls, 4);
});
