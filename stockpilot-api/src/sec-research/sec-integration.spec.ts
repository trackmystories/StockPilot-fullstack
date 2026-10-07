import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {WeeklyIntelligenceJob} from '../intelligence/jobs/weekly-intelligence.job';
import {SecResearchRepository} from './sec-research.repository';

test('financial publication survives SEC failure and returns an explicit retry status', async () => {
  const events: string[] = [];
  type Args = ConstructorParameters<typeof WeeklyIntelligenceJob>;
  const job = new WeeklyIntelligenceJob(
    {run: async () => ({screeners: {}, snapshots: []})} as unknown as Args[0],
    {rank: () => []} as unknown as Args[1],
    {
      acquireLease: async () => true,
      getResumableRun: async () => 'existing-run',
      renewLease: async () => undefined,
      assertCompleteCheckpoints: async () => undefined,
      saveScreenerResults: async () => undefined,
      saveStockSnapshots: async () => undefined,
      completeRun: async () => undefined,
      activateRun: async () => {
        events.push('financial-published');
      },
      releaseLease: async () => {
        events.push('financial-lease-released');
      },
    } as unknown as Args[2],
    {
      refresh: async () => {
        events.push('sec-started');
        throw new Error('SEC temporarily unavailable');
      },
    } as unknown as Args[3],
  );
  const result = await job.refresh();
  assert.equal(result.financialRunId, 'existing-run');
  assert.equal(result.secResearch.status, 'failed');
  assert.deepEqual(events, ['financial-published', 'financial-lease-released', 'sec-started']);
});

test('a worker that lost its lease cannot publish layers or checkpoints', async () => {
  const writes: unknown[] = [];
  const ref = {doc: () => ref, collection: () => ref};
  const tx = {
    get: async () => ({data: () => ({owner: 'new-worker', expiresAt: Date.now() + 600000})}),
    set: (...args: unknown[]) => writes.push(args),
  };
  const repository = new SecResearchRepository({
    db: {
      collection: () => ref,
      runTransaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
    },
  } as unknown as ConstructorParameters<typeof SecResearchRepository>[0]);
  await assert.rejects(
    repository.checkpoint(
      'run',
      {
        symbol: 'AAA',
        cik: null,
        status: 'no_sec_match',
        checkedAt: new Date().toISOString(),
        error: null,
      },
      'old-worker',
    ),
    /lease was lost/,
  );
  assert.equal(writes.length, 0);
});