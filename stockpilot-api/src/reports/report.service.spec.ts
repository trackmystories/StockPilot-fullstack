import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ReportService} from './report.service';
import {buildReport} from './report-builder';
import {emptyLayers} from '../sec-research/sec-research.types';
import type {ReportRepository} from './report.repository';
import type {PreparedStockRepository} from '../intelligence/repositories/prepared-stock.repository';
import type {CompanyReport, ReportCheckpoint, ReportInput, ReportJob} from './report.types';

function setup() {
  let held = false;
  let job: ReportJob | null = null;
  const reports = new Map<string, CompanyReport>();
  const checks = new Map<string, ReportCheckpoint>();
  const failures = new Set<string>();
  const inputs = new Map<string, ReportInput>(
    ['AAA', 'BBB'].map((symbol) => [
      symbol,
      {
        symbol,
        companyName: symbol,
        sourceRunId: 'frozen',
        financial: null,
        scorecard: null,
        sec: {metadata: null, layers: emptyLayers(), status: 'not_prepared'},
      },
    ]),
  );
  const repository = {
    activeRun: async () => 'frozen',
    acquire: async () => {
      if (held) return false;
      held = true;
      return true;
    },
    renew: async () => {
      if (!held) throw new Error('Lease lost');
    },
    release: async () => {
      held = false;
    },
    saveJob: async (next: ReportJob) => {
      job = structuredClone(next);
    },
    readInput: async (_run: string, symbol: string) => {
      if (failures.has(symbol)) throw new Error('Temporary storage failure');
      return structuredClone(inputs.get(symbol)!);
    },
    readReport: async (symbol: string) => reports.get(symbol) ?? null,
    publish: async (_run: string, checkpoint: ReportCheckpoint, report: CompanyReport | null) => {
      if (!held) throw new Error('Lease lost');
      if (report) reports.set(report.symbol, report);
      checks.set(checkpoint.symbol, checkpoint);
    },
    status: async () => job,
  };
  const prepared = {
    getUniverse: async () => [...inputs.keys()].map((symbol) => ({symbol, companyName: symbol})),
  };
  const service = new ReportService(
    repository as unknown as ReportRepository,
    prepared as unknown as PreparedStockRepository,
  );
  return {service, reports, checks, inputs, failures, getJob: () => job};
}

async function finish(service: ReportService) {
  await service.waitForCurrentJob();
}

test('job uses the frozen universe and skips unchanged published reports', async () => {
  const state = setup();
  await state.service.start();
  await finish(state.service);
  assert.equal(state.reports.size, 2);
  assert.equal(state.getJob()?.processed, 2);
  const oldDate = state.reports.get('AAA')!.generatedAt;
  await state.service.start();
  await finish(state.service);
  assert.equal(state.getJob()?.unchanged, 2);
  assert.equal(state.reports.get('AAA')!.generatedAt, oldDate);
});

test('same financial run with changed saved input rebuilds only that stock', async () => {
  const state = setup();
  await state.service.start();
  await finish(state.service);
  state.inputs.get('AAA')!.financial = {analysis: {metrics: {growth: {revenueGrowthYoY: 5}}}};
  await state.service.start();
  await finish(state.service);
  assert.equal(state.getJob()?.generated, 1);
  assert.equal(state.getJob()?.unchanged, 1);
});

test('failed stock retains its old report and can succeed on the next run', async () => {
  const state = setup();
  await state.service.start();
  await finish(state.service);
  const oldReport = state.reports.get('AAA');
  state.failures.add('AAA');
  await state.service.start();
  await finish(state.service);
  assert.equal(state.getJob()?.status, 'partial');
  assert.equal(state.getJob()?.failed, 1);
  assert.equal(state.reports.get('AAA'), oldReport);
  state.failures.clear();
  await state.service.start();
  await finish(state.service);
  assert.equal(state.getJob()?.failed, 0);
  assert.equal(state.getJob()?.status, 'complete');
});

test('a new SEC extraction generation in the same financial run marks the saved report stale', async () => {
  const state = setup();
  const input = state.inputs.get('AAA')!;
  input.financial = {calculatedAt: Date.now()};
  const saved = buildReport(input);
  const repository = {
    readReport: async () => saved,
    activeRun: async () => 'frozen',
    currentSecRevision: async () => 'new-generation',
  };
  const service = new ReportService(
    repository as unknown as ReportRepository,
    {} as PreparedStockRepository,
  );
  assert.equal((await service.get('AAA')).stale, true);
});