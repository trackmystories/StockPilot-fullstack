require('./input-audit-register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {fixture} = require('./input-audit.fixture.cjs');
function database(count = 2) {
  const data = new Map([
    ['screenerState/current', {activeRun: 'source'}],
    ['screenerRuns/source', {status: 'completed', calculationVersion: 2, universeCount: count}],
  ]);
  for (let i = 0; i < count; i++) {
    const input = fixture();
    input.symbol = `TEST${i}`;
    input.financials.symbol = input.symbol;
    input.thesisData = {priceTarget: null, rating: null, analystEstimates: []};
    input.metrics.return3m = i;
    input.metrics.dataQuality.priceAsOf = '2026-09-24';
    data.set(`screenerRuns/source/universe/${input.symbol}`, {symbol: input.symbol, ...input.company});
    data.set(`screenerRuns/source/preparedInputs/${input.symbol}`, input);
  }
  const writes = [];
  const snapshot = (path) => ({
    id: path.split('/').at(-1),
    ref: doc(path),
    exists: data.has(path),
    data: () => structuredClone(data.get(path)),
    updateTime: {
      toMillis: () =>
        createHash('sha256')
          .update(JSON.stringify(data.get(path)))
          .digest()
          .readUInt32BE(),
    },
  });
  const doc = (path) => ({
    path,
    id: path.split('/').at(-1),
    get: async () => snapshot(path),
    collection: (id) => collection(`${path}/${id}`),
  });
  const collection = (path) => ({
    doc: (id) => doc(`${path}/${id}`),
    select() {
      return this;
    },
    get: async () => {
      const docs = [...data.keys()]
        .filter((key) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1)
        .map(snapshot);
      return {docs, size: docs.length};
    },
  });
  const db = {
    doc,
    collection,
    getAll: async (...refs) => Promise.all(refs.map((r) => r.get())),
    runTransaction: async (fn) => {
      const queue = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, value, options) => {
          queue.push(() => {
            writes.push(ref.path);
            data.set(ref.path, options?.merge ? {...data.get(ref.path), ...value} : value);
          });
          return tx;
        },
        delete: (ref) => {
          queue.push(() => data.delete(ref.path));
          return tx;
        },
      };
      const result = await fn(tx);
      queue.forEach((commit) => commit());
      return result;
    },
  };
  return {data, writes, db};
}
const options = {runId: 'rebuilt', sourceRunId: 'source', codeHash: 'test-build', asOf: '2026-09-25T00:00:00Z'};
const run = (db, options, log = () => {}) =>
  require('../src/intelligence/saved-rebuild.ts').rebuildSavedUniverse(db, options, log);
test('all stocks and all lists commit before activation, with full-universe peers', async () => {
  const {db, data, writes} = database(21);
  const result = await run(db, options);
  assert.equal(result.count, 21);
  assert.equal(data.get('screenerState/current').activeRun, 'rebuilt');
  for (let i = 0; i < 21; i++) {
    const card = data.get(`screenerRuns/rebuilt/scorecards/TEST${i}`).data;
    assert.equal(Object.keys(card.scores).length, 30);
    assert.equal(card.metrics.peers.metrics.return3m.count, 20);
  }
  assert.equal([...data.keys()].filter((k) => /^screenerRuns\/rebuilt\/screeners\/[^/]+$/.test(k)).length, 22);
  assert.ok(writes.every((p) => p.startsWith('screenerRuns/rebuilt') || p.startsWith('screenerState/')));
  assert.equal(writes.at(-1), 'screenerState/current');
});
test('interruption keeps active run and resume skips committed stock outputs', async () => {
  const {db, data, writes} = database();
  await assert.rejects(
    run(db, options, (message) => {
      if (message.includes('[Calculate] 1/')) throw Error('interrupted');
    }),
    /interrupted/,
  );
  assert.equal(data.get('screenerState/current').activeRun, 'source');
  assert.ok(data.has('screenerRuns/rebuilt/checkpoints/TEST0'));
  await run(db, options);
  assert.equal(writes.filter((p) => p === 'screenerRuns/rebuilt/scorecards/TEST0').length, 1);
  assert.equal(data.get('screenerState/current').activeRun, 'rebuilt');
});
test('missing inputs cannot activate a partial universe', async () => {
  const {db, data} = database();
  data.delete('screenerRuns/source/preparedInputs/TEST1');
  await assert.rejects(run(db, options), /incomplete/i);
  assert.equal(data.get('screenerState/current').activeRun, 'source');
});
test('active owner is respected; changed code and changed source cannot resume', async () => {
  const {db, data} = database();
  data.set('screenerState/lease', {owner: 'other', expiresAt: Date.now() + 100000});
  await assert.rejects(run(db, options), /lease/i);
  data.delete('screenerState/lease');
  await assert.rejects(
    run(db, options, () => {
      throw Error('stop');
    }),
    /stop/,
  );
  await assert.rejects(run(db, {...options, codeHash: 'changed'}), /scope/i);
  data.get('screenerRuns/source/preparedInputs/TEST0').metrics.price = 200;
  await assert.rejects(run(db, options), /scope/i);
});
test('lease loss and concurrent active-generation change block publication', async () => {
  for (const change of ['lease', 'active']) {
    const {db, data} = database();
    await assert.rejects(
      run(db, options, (message) => {
        if (message.includes('[Calculate] 1/')) {
          if (change === 'lease') data.set('screenerState/lease', {owner: 'other', expiresAt: Date.now() + 100000});
          else data.set('screenerState/current', {activeRun: 'newer'});
        }
      }),
      /lease|active run/i,
    );
    assert.notEqual(data.get('screenerState/current').activeRun, 'rebuilt');
  }
});

test('ranked nonempty lists persist and an interrupted list resumes without duplicates', async () => {
  const {db, data} = database(3);
  for (let i = 0; i < 3; i++)
    data.get(`screenerRuns/source/preparedInputs/TEST${i}`).company.industry = 'Semiconductors';
  await assert.rejects(
    run(db, options, (message) => {
      if (message.startsWith('[List] theme-semiconductors')) throw Error('stop list');
    }),
    /stop list/,
  );
  assert.equal(data.get('screenerState/current').activeRun, 'source');
  await run(db, options);
  const path = 'screenerRuns/rebuilt/screeners/theme-semiconductors';
  assert.equal(data.get(path).resultCount, 3);
  for (let i = 0; i < 3; i++) assert.equal(data.get(`${path}/results/TEST${i}`).rank, i + 1);
});
test('interrupted command releases its lease and missing committed outputs prevent activation', async () => {
  const {db, data} = database();
  const controller = new AbortController();
  await assert.rejects(
    run(db, {...options, signal: controller.signal}, (message) => {
      if (message.includes('[Calculate] 1/')) controller.abort();
    }),
    /interrupt/i,
  );
  assert.ok(!data.has('screenerState/lease'));
  data.delete('screenerRuns/rebuilt/scorecards/TEST0');
  await assert.rejects(run(db, options), /incomplete scorecards/i);
  assert.equal(data.get('screenerState/current').activeRun, 'source');
});
test('API freshness follows retained inputs rather than the new calculation date', async () => {
  const {PreparedStockRepository} = require('../src/intelligence/repositories/prepared-stock.repository.ts');
  const {db, data} = database();
  data.set('screenerRuns/source/scorecards/TEST0', {
    calculationVersion: 3,
    calculatedAt: Date.now(),
    inputPreparedAt: '2001-01-01T00:00:00Z',
    data: {},
  });
  const result = await new PreparedStockRepository({db}).getPrepared('TEST0', 'scorecards');
  assert.equal(result.stale, true);
});
