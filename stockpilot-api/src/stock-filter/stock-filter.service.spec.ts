import assert from 'node:assert/strict';
import {test} from 'node:test';
import {StockFilterService} from './stock-filter.service';
import {StockFilterRepository} from './stock-filter.repository';
import {SCORE_KEYS, type FilterStock} from './stock-filter.types';
function savedStock(symbol: string): FilterStock {
  return {
    symbol,
    companyName: symbol,
    logoUrl: null,
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Software',
    currency: 'USD',
    price: 1,
    marketCap: 1e9,
    changePercentage: null,
    quoteAsOf: '2026-09-27T00:00:00Z',
    calculatedAt: '2026-09-27T00:00:00Z',
    stale: false,
    score: 8,
    coverage: 0.8,
    riskScore: 2,
    riskLevel: 'low',
    volatilityScore: 3,
    scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, 8])) as FilterStock['scores'],
    metrics: {},
    secMetricsIncluded: false
  };
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function setup(rows = [savedStock('AAA'), savedStock('BBB'), savedStock('CCC')]) {
  let activeRun = 'run-1';
  let loads = 0;
  let blocked = new Set<string>();
  const repository = {
    activeRun: async () => activeRun,
    load: async (_runId: string) => {
      loads += 1;
      return rows;
    },
    blockedSymbols: async () => ({ids: blocked, revision: [...blocked].sort().join(',')}),
  };
  return {
    repository,
    service: new StockFilterService(repository as unknown as StockFilterRepository),
    loads: () => loads,
    setRun: (value: string) => {
      activeRun = value;
    },
    block: (symbols: string[]) => {
      blocked = new Set(symbols);
    }
  };
}
test('cold loading returns a loading response, then the saved options', async () => {
  const {service} = setup();
  assert.equal((await service.options()).status, 'loading');
  await tick();
  const result = await service.options();
  assert.equal(result.status, 'ready');
  if (result.status === 'ready')
    assert.equal(result.total, 3);
});
test('simultaneous requests share one Firestore load', async () => {
  const {service, loads} = setup();
  await Promise.all([service.options(), service.options(), service.options()]);
  await tick();
  await service.options();
  assert.equal(loads(), 1);
});
test('filtering and paging reuse the saved snapshot rather than re-reading all stocks', async () => {
  const {service, loads} = setup();
  await service.options();
  await tick();
  const query = {
    runId: 'run-1',
    selectedIds: [],
    sort: 'symbol' as const,
    limit: 2,
    offset: 0
  };
  const first = await service.query(query);
  assert.equal(first.status, 'ready');
  if (first.status === 'ready') {
    assert.deepEqual(first.items.map((stock) => stock.symbol), ['AAA', 'BBB']);
    assert.equal(first.nextOffset, 2);
  }
  const second = await service.query({...query, offset: 2});
  if (second.status === 'ready') {
    assert.deepEqual(second.items.map((stock) => stock.symbol), ['CCC']);
    assert.equal(second.nextOffset, null);
  }
  assert.equal(loads(), 1);
});
test('a newly published run invalidates old result-page requests', async () => {
  const {service, setRun, loads} = setup();
  await service.options();
  await tick();
  setRun('run-2');
  assert.equal((await service.options()).status, 'loading');
  await tick();
  await assert.rejects(service.query({
    runId: 'run-1',
    selectedIds: [],
    sort: 'symbol',
    limit: 50,
    offset: 0
  }), /newer stock snapshot/i);
  assert.equal(loads(), 2);
});
test('new access restrictions are reflected in options and results', async () => {
  const {service, block} = setup();
  await service.options();
  await tick();
  block(['BBB']);
  const options = await service.options();
  if (options.status === 'ready')
    assert.equal(options.total, 2);
  const result = await service.query({
    runId: 'run-1',
    selectedIds: [],
    sort: 'symbol',
    limit: 50,
    offset: 0
  });
  if (result.status === 'ready')
    assert.deepEqual(result.items.map((stock) => stock.symbol), ['AAA', 'CCC']);
});
test('unknown selections fail instead of returning the entire universe', async () => {
  const {service} = setup();
  await service.options();
  await tick();
  await assert.rejects(service.query({
    runId: 'run-1',
    selectedIds: ['not-real'],
    sort: 'symbol',
    limit: 50,
    offset: 0
  }), /no longer available/i);
});
test('failed cache loads are reported, not silently returned as an empty universe', async () => {
  const {service, repository} = setup();
  repository.load = async () => {
    throw new Error('Firestore unavailable');
  };
  assert.equal((await service.options()).status, 'loading');
  await tick();
  await assert.rejects(service.options(), /Could not read the saved Firestore/i);
});