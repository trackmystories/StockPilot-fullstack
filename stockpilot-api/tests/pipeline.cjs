const assert = require('node:assert/strict');
const {test} = require('node:test');
const {PreparedStockRepository} = require('../src/intelligence/repositories/prepared-stock.repository');
const {ScreenerResultsRepository} = require('../src/intelligence/repositories/screener-results.repository');
const {StockIntelligenceRunnerService} = require('../src/intelligence/pipeline/stock-intelligence-runner.service');
const {ScreenerRankingService} = require('../src/intelligence/pipeline/screener-ranking.service');
const {MarketService} = require('../src/mobile/market.service');
const {WeeklyIntelligenceJob} = require('../src/intelligence/jobs/weekly-intelligence.job');
// Storage double exercises the actual repository's document paths and atomic write behavior.
class MemoryDb {
  constructor() {
    this.rows = new Map();
    this.failCommit = false;
  }
  collection(path) {
    return new Collection(this, path);
  }
  batch() {
    const ops = [];
    const api = {
      set: (ref, data, options) =>
        ops.push(() => this.rows.set(ref.path, options?.merge ? {...this.rows.get(ref.path), ...data} : data)),
      delete: (ref) => ops.push(() => this.rows.delete(ref.path)),
      commit: async () => {
        if (this.failCommit) {
          this.failCommit = false;
          throw Error('injected commit failure');
        }
        ops.forEach((op) => op());
      },
    };
    return api;
  }
  async getAll(...refs) {
    return Promise.all(refs.map((ref) => ref.get()));
  }
  async runTransaction(fn) {
    const batch = this.batch();
    const result = await fn({...batch, get: (ref) => ref.get()});
    await batch.commit();
    return result;
  }
}
class Doc {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split('/').pop();
  }
  collection(name) {
    return new Collection(this.db, this.path + '/' + name);
  }
  async get() {
    const data = this.db.rows.get(this.path);
    return {id: this.id, ref: this, exists: !!data, data: () => data};
  }
  async set(data, options) {
    const b = this.db.batch();
    b.set(this, data, options);
    await b.commit();
  }
}
class Collection {
  constructor(db, path, filters = [], ordering = null, limit = Infinity, offset = 0) {
    Object.assign(this, {db, path, filters, ordering, maximum: limit, skip: offset});
  }
  select() {
    return this;
  }
  doc(id) {
    return new Doc(this.db, this.path + '/' + id);
  }
  where(key, op, value) {
    return new Collection(
      this.db,
      this.path,
      [...this.filters, [key, op, value]],
      this.ordering,
      this.maximum,
      this.skip,
    );
  }
  orderBy(key, direction) {
    return new Collection(this.db, this.path, this.filters, [key, direction], this.maximum, this.skip);
  }
  limit(limit) {
    return new Collection(this.db, this.path, this.filters, this.ordering, limit, this.skip);
  }
  offset(offset) {
    return new Collection(this.db, this.path, this.filters, this.ordering, this.maximum, offset);
  }
  async get() {
    let rows = [...this.db.rows.entries()].filter(
      ([key, data]) =>
        key.startsWith(this.path + '/') &&
        !key.slice(this.path.length + 1).includes('/') &&
        this.filters.every(([field, op, value]) =>
          op === '=='
            ? data[field] === value
            : op === 'in'
              ? value.includes(data[field])
              : op === '<='
                ? data[field] <= value
                : true,
        ),
    );
    if (this.ordering) {
      const [key, direction] = this.ordering;
      rows.sort(
        (a, b) => (a[1][key] < b[1][key] ? -1 : a[1][key] > b[1][key] ? 1 : 0) * (direction === 'desc' ? -1 : 1),
      );
    }
    const docs = await Promise.all(
      rows.slice(this.skip, this.skip + this.maximum).map(([key]) => new Doc(this.db, key).get()),
    );
    return {docs, size: docs.length, empty: !docs.length};
  }
}
function setup() {
  const db = new MemoryDb();
  const firebase = {db};
  const prepared = new PreparedStockRepository(firebase);
  const results = new ScreenerResultsRepository(firebase);
  let fetches = 0;
  const candidate = {
    symbol: 'TEST',
    companyName: 'Test',
    marketCap: 1000000000,
    price: 10,
    volume: 1000000,
    sector: 'Technology',
    industry: 'Software',
    exchange: 'NASDAQ',
    country: 'US',
  };
  const financials = {symbol: 'TEST', income: [], balanceSheet: [], cashFlow: []};
  const risk = {
    companyName: 'Test',
    logoUrl: null,
    riskScore: null,
    riskLevel: null,
    volatilityScore: null,
    riskCoverage: 0,
    volatilityCoverage: 0,
    riskConfidence: 'low',
    volatilityConfidence: 'low',
    volatility: {beta: null, annualizedVolatility: null},
    riskComponents: {},
  };
  const http = {
    get: async (endpoint) => {
      fetches++;
      return endpoint === 'profile' ? [{currency: 'USD'}] : endpoint === 'quote' ? [candidate] : [];
    },
  };
  const runner = new StockIntelligenceRunnerService(
    http,
    {getFinancialStatements: async () => financials},
    {getMomentumData: async () => null, getEstimatesData: async () => null},
    {getStockRiskMetrics: async () => risk},
    {getCandidates: async () => [candidate]},
    results,
    prepared,
    {getThesisData: async () => ({analystEstimates: [], priceTarget: null, rating: null})},
  );
  return {db, prepared, results, runner, fetches: () => fetches};
}
test('pipeline saves all outputs and checkpoints atomically; resume uses frozen inputs', async () => {
  const s = setup();
  await s.results.createRun('run');
  const first = await s.runner.run('run');
  assert.equal(Object.keys(first.screeners).length, 22);
  assert.equal(first.snapshots.length, 1);
  const intelligence = s.db.rows.get('stockIntelligence/TEST');
  assert.equal(Object.keys(intelligence.calculations).length, 22);
  assert.ok(intelligence.analysis.bullBearCase);
  assert.ok(intelligence.analysis.investmentThesis);
  assert.equal(Object.keys(s.db.rows.get('stockScorecards/TEST').data.scores).length, 30);
  assert.ok(s.db.rows.has('screenerRuns/run/checkpoints/TEST'));
  const calls = s.fetches();
  await s.runner.run('run');
  assert.equal(s.fetches(), calls);
});
test('failed atomic write leaves no checkpoint and resume restores every output', async () => {
  const s = setup();
  await s.results.createRun('run');
  const originalSave = s.prepared.savePreparedStock.bind(s.prepared);
  let failed = false;
  s.prepared.savePreparedStock = async (input) => {
    if (!failed) {
      failed = true;
      s.db.failCommit = true;
    }
    return originalSave(input);
  };
  await assert.rejects(s.runner.run('run'), /injected/);
  assert.equal(s.db.rows.has('screenerRuns/run/checkpoints/TEST'), false);
  assert.equal(s.db.rows.has('stockScorecards/TEST'), false);
  const calls = s.fetches();
  await s.runner.run('run');
  assert.equal(s.fetches(), calls);
  assert.ok(s.db.rows.has('stockScorecards/TEST'));
});
test('active generation shields mobile from unfinished results and reads never call FMP', async () => {
  const s = setup();
  await s.results.createRun('run');
  await s.runner.run('run');
  assert.equal(await s.prepared.getScorecard('TEST'), null);
  await s.results.completeRun('run');
  await s.results.acquireLease('test-owner');
  await s.results.activateRun('run', 'test-owner');
  const never = new Proxy(
    {},
    {
      get() {
        return () => {
          throw Error('unexpected provider request');
        };
      },
    },
  );
  const market = new MarketService(never, never, never, never, {db: s.db}, s.results, s.prepared);
  const card = await market.getIntelligence('TEST');
  assert.equal(card.symbol, 'TEST');
  assert.ok(card.scores.quality);
  const analysis = await market.financials('TEST');
  assert.ok(analysis.investorSignals);
  await market.getRisk('TEST');
  await assert.rejects(market.getIntelligence('MISSING'), /Analysis is not yet available/);
});
test('incomplete runs cannot activate or salvage a partial universe', async () => {
  const s = setup();
  await s.results.createRun('run');
  await s.prepared.saveUniverse('run', [{symbol: 'TEST'}]);
  await assert.rejects(s.results.completeRun('run'), /incomplete run/);
  await assert.rejects(s.results.activateRun('run', 'test-owner'), /incomplete or incompatible/);
});
test('ranking rejects high-scoring stocks that failed eligibility', () => {
  const ranking = new ScreenerRankingService();
  assert.deepEqual(ranking.rank('high-quality', [{symbol: 'BAD', score: 100, coverage: 100, eligible: false}]), []);
});
test('republishing fewer results removes stale members', async () => {
  const s = setup();
  await s.results.saveScreenerResults('run', 'high-quality', [
    {symbol: 'OLD', score: 90, coverage: 100, rank: 1, eligible: true},
  ]);
  await s.results.saveScreenerResults('run', 'high-quality', []);
  assert.equal(s.db.rows.has('screenerRuns/run/screeners/high-quality/results/OLD'), false);
});
test('distributed lease excludes concurrent refresh workers', async () => {
  const s = setup();
  assert.equal(await s.results.acquireLease('a'), true);
  assert.equal(await s.results.acquireLease('b'), false);
  await assert.rejects(s.results.renewLease('b'), /lease lost/);
  await s.results.releaseLease('a');
  assert.equal(await s.results.acquireLease('b'), true);
});
test('list snapshots are pinned to the same generation as its ranked results', async () => {
  const s = setup();
  s.db.rows.set('stockSnapshots/TEST', {symbol: 'TEST', riskScore: 9});
  s.db.rows.set('screenerRuns/old/checkpoints/TEST', {snapshot: {symbol: 'TEST', riskScore: 2}});
  const snapshots = await s.results.getStockSnapshots(['TEST'], 'old');
  assert.equal(snapshots.get('TEST').riskScore, 2);
});
test('weekly activation cannot publish after its lease has expired or changed owner', async () => {
  const s = setup();
  s.db.rows.set('screenerRuns/run', {status: 'completed', calculationVersion: 3});
  s.db.rows.set('screenerState/current', {activeRun: 'newer'});
  s.db.rows.set('screenerState/lease', {owner: 'new-owner', expiresAt: Date.now() + 60000});
  await assert.rejects(s.results.activateRun('run', 'old-owner'), /lease/i);
  assert.equal(s.db.rows.get('screenerState/current').activeRun, 'newer');
});
