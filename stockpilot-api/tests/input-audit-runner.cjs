require('./input-audit-register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {fixture} = require('./input-audit.fixture.cjs');
const {runInputAudit} = require('../src/intelligence/audit/audit-runner.ts');
function database() {
  const data = new Map([
    ['screenerState/current', {activeRun: 'run'}],
    ['screenerRuns/run', {status: 'completed', calculationVersion: 2, universeCount: 1}],
    ['screenerRuns/run/universe/TEST', {symbol: 'TEST'}],
    ['screenerRuns/run/preparedInputs/TEST', fixture()],
  ]);
  const writes = [];
  const doc = (path) => ({
    path,
    id: path.split('/').at(-1),
    get: async () => ({exists: data.has(path), data: () => structuredClone(data.get(path))}),
    collection: (name) => collection(`${path}/${name}`),
  });
  const collection = (path) => ({
    doc: (id) => doc(`${path}/${id}`),
    select: () => ({
      get: async () => {
        const docs = [...data]
          .filter(([key]) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1)
          .map(([key, value]) => ({id: key.split('/').at(-1), data: () => structuredClone(value)}));
        return {docs, size: docs.length};
      },
    }),
  });
  const db = {
    doc,
    collection,
    getAll: async (...refs) => Promise.all(refs.map((ref) => ref.get())),
    runTransaction: async (fn) => {
      const queued = [];
      const result = await fn({
        get: (ref) => ref.get(),
        set: (ref, value, options) =>
          queued.push(() => {
            writes.push(ref.path);
            data.set(
              ref.path,
              options?.merge ? {...data.get(ref.path), ...structuredClone(value)} : structuredClone(value),
            );
          }),
        delete: (ref) =>
          queued.push(() => {
            writes.push(ref.path);
            data.delete(ref.path);
          }),
      });
      queued.forEach((fn) => fn());
      return result;
    },
  };
  return {db, data, writes};
}
const options = {auditId: 'audit-test', asOf: '2026-09-25T00:00:00Z', write: false};
const sink = {stock: async () => {}, error: async () => {}};
test('default audit writes no Firestore documents', async () => {
  const {db, writes} = database();
  const result = await runInputAudit(db, options, sink);
  assert.equal(result.sourceCalculationVersion, 2);
  assert.equal(result.succeeded, 1);
  assert.equal(result.failed, 0);
  assert.equal(writes.length, 0);
});
test('persistence is audit-only and resume reuses committed reports', async () => {
  const {db, data, writes} = database();
  let emitted = 0;
  await assert.rejects(
    runInputAudit(
      db,
      {...options, write: true},
      {
        ...sink,
        stock: async () => {
          throw Error('local output interrupted');
        },
      },
    ),
  );
  assert.ok(data.has('intelligenceAudits/audit-test/stocks/TEST'));
  data.delete('screenerRuns/run/preparedInputs/TEST');
  const result = await runInputAudit(
    db,
    {auditId: 'audit-test', write: true},
    {
      ...sink,
      stock: async (r, resumed) => {
        emitted++;
        assert.equal(resumed, true);
        assert.equal(r.symbol, 'TEST');
      },
    },
  );
  assert.equal(result.succeeded, 1);
  assert.equal(emitted, 1);
  assert.ok(writes.every((path) => path.startsWith('intelligenceAudits/audit-test')));
  assert.equal(data.get('intelligenceAudits/audit-test').leaseOwner, null);
});
test('source failures are counted and retried on resume', async () => {
  const {db, data} = database();
  data.delete('screenerRuns/run/preparedInputs/TEST');
  let result = await runInputAudit(db, {...options, write: true}, sink);
  assert.equal(result.status, 'completed_with_errors');
  assert.equal(result.failed, 1);
  assert.equal(result.succeeded, 0);
  data.set('screenerRuns/run/preparedInputs/TEST', fixture());
  result = await runInputAudit(db, {...options, write: true}, sink);
  assert.equal(result.status, 'completed');
  assert.equal(result.failed, 0);
  assert.ok(!data.has('intelligenceAudits/audit-test/errors/TEST'));
});
test('resume rejects changed scope and refuses another active audit owner', async () => {
  const {db, data} = database();
  await runInputAudit(db, {...options, write: true}, sink);
  await assert.rejects(
    runInputAudit(db, {...options, asOf: '2026-09-26T00:00:00Z', write: true}, sink),
    /different run, version, date/,
  );
  const audit = data.get('intelligenceAudits/audit-test');
  audit.leaseOwner = 'another';
  audit.leaseExpiresAt = Date.now() + 60_000;
  await assert.rejects(runInputAudit(db, {...options, write: true}, sink), /already running/);
});
test('wrong source symbol is never audited or published', async () => {
  const {db, data} = database();
  data.get('screenerRuns/run/preparedInputs/TEST').symbol = 'OTHER';
  const result = await runInputAudit(db, {...options, write: true}, sink);
  assert.equal(result.failed, 1);
  assert.ok(!data.has('intelligenceAudits/audit-test/stocks/TEST'));
});

test('version-3 audit metadata and scope retain the source version', async () => {
  const {db, data} = database();
  data.get('screenerRuns/run').calculationVersion = 3;
  data.get('screenerRuns/run/preparedInputs/TEST').calculationVersion = 3;
  const result = await runInputAudit(db, {...options, write: true}, sink);
  assert.equal(result.sourceCalculationVersion, 3);
  assert.equal(data.get('intelligenceAudits/audit-test').sourceCalculationVersion, 3);
});