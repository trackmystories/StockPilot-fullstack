import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ReportRepository} from './report.repository';
import type {FirebaseService} from '../firebase/firebase.service';
import type {SecResearchRepository} from '../sec-research/sec-research.repository';
import {buildReport} from './report-builder';
import {emptyLayers} from '../sec-research/sec-research.types';
import type {ReportCheckpoint} from './report.types';

function database() {
  const rows = new Map<string, unknown>();
  const ref = (path: string): any => ({
    path,
    get: async () => ({exists: rows.has(path), data: () => rows.get(path)}),
    doc: (id: string) => ref(`${path}/${id}`),
    collection: (id: string) => ref(`${path}/${id}`),
  });
  const db = {
    collection: ref,
    runTransaction: async (work: (tx: any) => Promise<unknown>) => {
      const writes: (() => void)[] = [];
      const result = await work({
        get: async (reference: any) => ({
          exists: rows.has(reference.path),
          data: () => rows.get(reference.path),
        }),
        set: (reference: any, value: unknown) =>
          writes.push(() => rows.set(reference.path, structuredClone(value))),
        update: (reference: any, value: object) =>
          writes.push(() =>
            rows.set(reference.path, {...(rows.get(reference.path) as object), ...value}),
          ),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
  return {
    rows,
    repository: new ReportRepository(
      {db} as unknown as FirebaseService,
      {} as SecResearchRepository,
    ),
  };
}

test('a replaced lease owner cannot publish or clear the replacement lease', async () => {
  const {rows, repository} = database();
  await repository.acquire('first', 'run');
  rows.set('stockReportControl/current', {
    owner: 'second',
    runId: 'run',
    expiresAt: Date.now() + 300000,
  });
  const checkpoint: ReportCheckpoint = {
    symbol: 'TEST',
    fingerprint: 'a',
    status: 'generated',
    coverage: 'limited',
    checkedAt: new Date().toISOString(),
    error: null,
  };
  const report = buildReport({
    symbol: 'TEST',
    companyName: 'Test',
    sourceRunId: 'run',
    financial: null,
    scorecard: null,
    sec: {metadata: null, layers: emptyLayers(), status: 'not_prepared'},
  });
  await assert.rejects(
    repository.publish('run', checkpoint, report, 'first'),
    /cannot publish/,
  );
  assert.equal(rows.has('stockReports/TEST'), false);
  assert.equal(rows.has('stockReportRuns/run/stocks/TEST'), false);
  await repository.release('first');
  assert.equal((rows.get('stockReportControl/current') as any).owner, 'second');
  await repository.publish('run', checkpoint, report, 'second');
  assert.equal(rows.has('stockReports/TEST'), true);
  assert.equal(rows.has('stockReportRuns/run/stocks/TEST'), true);
});

test('expired running job is presented as interrupted and can be acquired again', async () => {
  const {rows, repository} = database();
  rows.set('stockReportControl/current', {owner: 'dead', runId: 'run', expiresAt: 1});
  rows.set('stockReportRuns/run', {status: 'running', activeSymbols: ['TEST']});
  const status = await repository.status();
  assert.equal(status?.status, 'interrupted');
  assert.deepEqual(status?.activeSymbols, []);
  assert.equal(await repository.acquire('replacement', 'run'), true);
});

test('table rows are stored without nested arrays and restored for the API', async () => {
  const {rows, repository} = database();
  await repository.acquire('worker', 'run');
  const report = buildReport({
    symbol: 'TEST',
    companyName: 'Test',
    sourceRunId: 'run',
    financial: null,
    scorecard: null,
    sec: {metadata: null, layers: emptyLayers(), status: 'not_prepared'},
  });
  report.sections[0].tables.push({
    title: 'Forecast',
    columns: ['Period', 'EPS'],
    rows: [
      ['2026', '-1.00'],
      ['2027', '0.00'],
    ],
    sourceIds: [],
  });
  await repository.publish(
    'run',
    {
      symbol: 'TEST',
      fingerprint: report.fingerprint,
      status: 'generated',
      coverage: 'limited',
      checkedAt: new Date().toISOString(),
      error: null,
    },
    report,
    'worker',
  );
  const assertFirestoreShape = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        assert.equal(
          Array.isArray(item),
          false,
          'Firestore cannot store an array directly inside an array',
        );
        assertFirestoreShape(item);
      }
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(assertFirestoreShape);
    }
  };
  assertFirestoreShape(rows.get('stockReports/TEST'));
  assert.deepEqual(await repository.readReport('TEST'), report);
  assert.deepEqual(report.sections[0].tables[0].rows, [
    ['2026', '-1.00'],
    ['2027', '0.00'],
  ]);
});

test('chart history is read from the same frozen run as the financial analysis', async () => {
  const requested: string[] = [];
  const documents: Record<string, object> = {
    'screenerRuns/frozen/intelligence/TEST': {analysis: {}},
    'screenerRuns/frozen/scorecards/TEST': {data: {}},
    'screenerRuns/frozen/preparedInputs/TEST': {
      preparedAt: '2026-09-26T00:00:00Z',
      financials: {
        income: [
          {
            date: '2026-06-30',
            period: 'Q2',
            reportedCurrency: 'EUR',
            revenue: 1200000,
            netIncome: 0,
            unrelatedField: 'ignored',
          },
        ],
      },
    },
  };
  const ref = (path: string): any => ({
    path,
    collection: (id: string) => ref(`${path}/${id}`),
    doc: (id: string) => ref(`${path}/${id}`),
  });
  const db = {
    collection: ref,
    getAll: async (...refs: {path: string}[]) =>
      refs.map(({path}) => {
        requested.push(path);
        return {exists: path in documents, data: () => documents[path]};
      }),
  };
  const repository = new ReportRepository(
    {db} as unknown as FirebaseService,
    {
      read: async () => ({layers: emptyLayers(), metadata: null}),
    } as unknown as SecResearchRepository,
  );
  const input = await repository.readInput('frozen', 'TEST', 'Test');
  assert.deepEqual(requested, Object.keys(documents));
  assert.equal(input.financialHistory!.income[0].netIncome, 0);
  assert.equal(input.financialHistory!.income[0].unrelatedField, undefined);
  assert.equal(input.financialHistory!.preparedAt, '2026-09-26T00:00:00Z');
});