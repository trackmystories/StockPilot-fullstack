import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ConfigService} from '@nestjs/config';
import type {FirebaseService} from '../firebase/firebase.service';
import {StockFilterRepository} from './stock-filter.repository';
import {buildCatalog, mapSavedStock, queryCatalog} from './stock-filter.logic';

import {SCORE_KEYS} from './stock-filter.types';
type Row = Record<string, unknown>;
type Document = {id: string; data: () => Row};
const NOW = Date.parse('2026-09-28T00:00:00Z');
const evidence = {score: 8, coverage: 1, eligible: true, confidence: 'high', components: {a: {score: 8, coverage: 1, weight: 1, rawValue: 8}}};
function project(row: Row, paths: string[]): Row {
  if (!paths.length) return row;
  const output: Row = {};
  for (const path of paths) {
    const keys = path.split('.');
    let value: unknown = row;
    for (const key of keys) value = value !== null && typeof value === 'object' ? (value as Row)[key] : undefined;
    if (value === undefined) continue;
    let target = output;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) target[key] = value;
      else {
        target[key] ??= {};
        target = target[key] as Row;
      }
    });
  }
  return output;
}
class FakeQuery {
  constructor(private readonly rows: Map<string, Row>, private readonly calls: number[], private readonly fields: string[] = [], private readonly size = Infinity, private readonly after = '') {}
  select(...fields: string[]) {return new FakeQuery(this.rows, this.calls, fields, this.size, this.after);}
  orderBy(_field: unknown) {return this;}
  limit(size: number) {return new FakeQuery(this.rows, this.calls, this.fields, size, this.after);}
  startAfter(last: Document) {return new FakeQuery(this.rows, this.calls, this.fields, this.size, last.id);}
  async get() {
    const docs = [...this.rows].sort(([a], [b]) => a.localeCompare(b)).filter(([id]) => id > this.after).slice(0, this.size).map(([id, row]) => ({id, data: () => project(row, this.fields)}));
    this.calls.push(docs.length);
    return {docs, size: docs.length, empty: docs.length === 0};
  }
}
function repository(sources: Record<string, Row[]>) {
  const calls: Record<string, number[]> = {};
  const db = {
    collection(name: string) {
      assert.equal(name, 'screenerRuns');
      return {doc(runId: string) {
        assert.equal(runId, 'run-1');
        return {collection(kind: string) {
          assert.ok(['universe', 'preparedInputs', 'scorecards'].includes(kind), 'Only saved published-run collections may be read.');
          calls[kind] ??= [];
          const rows = new Map((sources[kind] ?? []).map((row) => [String(row.symbol), row]));
          return new FakeQuery(rows, calls[kind]);
        }};
      }};
    },
  };
  return {repo: new StockFilterRepository({db} as unknown as FirebaseService, new ConfigService()), calls};
}
test('market filters include frozen-universe and prepared-only stocks without requiring a scorecard', async () => {
  const {repo} = repository({
    universe: [
      {symbol: 'AAA', companyName: 'Alpha', sector: 'Technology', industry: 'Software'},
      {symbol: 'BBB', companyName: 'Beta', sector: 'Healthcare', industry: 'Biotechnology'},
      {symbol: 'CCC', companyName: 'Gamma', sector: 'Energy', industry: 'Oil & Gas'},
    ],
    preparedInputs: [{symbol: 'AAA', company: {sector: 'Technology', industry: 'Software'}}, {symbol: 'BBB', company: {sector: 'Healthcare', industry: 'Biotechnology'}, metrics: {pe: 14}}],
    scorecards: [{symbol: 'AAA', data: {scores: {quality: evidence}, metrics: {pe: 15}}}],
  });
  const stocks = await repo.load('run-1');
  assert.deepEqual(stocks.map((stock) => stock.symbol).sort(), ['AAA', 'BBB', 'CCC']);
  assert.equal(stocks.find((stock) => stock.symbol === 'CCC')?.industry, 'Oil & Gas');
  assert.equal(stocks.find((stock) => stock.symbol === 'CCC')?.companyName, 'Gamma');
  assert.equal(stocks.find((stock) => stock.symbol === 'BBB')?.metrics.pe, 14);
  assert.equal(stocks.find((stock) => stock.symbol === 'BBB')?.scores.quality, null);
  const sectors = buildCatalog(stocks).sections.find((section) => section.id === 'industry');
  assert.equal(sectors?.options.flatMap((node) => node.children ?? []).length, 3);
});
test('all metadata pages are loaded beyond the 500-document page size', async () => {
  const universe = Array.from({length: 1005}, (_, index) => ({symbol: `S${String(index).padStart(5, '0')}`, sector: 'Technology', industry: index === 1004 ? 'Last-page industry' : 'Software'}));
  const {repo, calls} = repository({universe});
  const stocks = await repo.load('run-1');
  assert.equal(stocks.length, 1005);
  assert.deepEqual(calls.universe, [500, 500, 5]);
  assert.equal(stocks.at(-1)?.industry, 'Last-page industry');
});
test('the same symbol in all three sources produces one result', async () => {
  const {repo} = repository({universe: [{symbol: 'AAA', sector: 'Technology'}], preparedInputs: [{symbol: 'AAA', company: {industry: 'Software'}}], scorecards: [{symbol: 'AAA', data: {scores: {}, metrics: {}}}]});
  const stocks = await repo.load('run-1');
  assert.equal(stocks.length, 1);
  assert.equal(stocks[0].sector, 'Technology');
  assert.equal(stocks[0].industry, 'Software');
});
test('saved profile metadata fills gaps without inventing a classification', async () => {
  const {repo} = repository({preparedInputs: [{symbol: 'AAA', company: {sector: null, industry: null}, sourceObservations: {profile: {sector: 'Healthcare', industry: 'Diagnostics', exchangeShortName: 'NASDAQ'}}}]});
  const stock = (await repo.load('run-1'))[0];
  assert.equal(stock?.industry, 'Diagnostics');
  assert.equal(stock?.exchange, 'NASDAQ');
});
test('prepared metrics can be filtered when no saved scorecard exists', () => {
  const stock = mapSavedStock('AAA', {metrics: {pe: 12, revenueGrowthYoY: 20}}, {}, NOW);
  assert.equal(stock.metrics.pe, 12);
  assert.equal(stock.scores.overall, null);
  assert.deepEqual(queryCatalog(buildCatalog([stock]), ['pe:20'], 'symbol').map((row) => row.symbol), ['AAA']);
});
test('explicit null metrics in a saved scorecard are not replaced by prepared values', () => {
  const stock = mapSavedStock('AAA', {metrics: {pe: 12}}, {data: {scores: {}, metrics: {pe: null}}}, NOW);
  assert.equal(stock.metrics.pe, null);
});
test('all 31 existing scorecard fields are offered when supported saved values exist', () => {
  assert.equal(SCORE_KEYS.length, 31);
  const expected = ['conviction', 'earningsQuality', 'capitalEfficiency', 'reratingPotential', 'execution', 'cashPower', 'fundingPressure', 'dilutionRisk', 'balanceSheetResilience', 'growthDurability', 'marginPower', 'capitalDiscipline', 'earningsReliability', 'businessEfficiency', 'valuationCompressionRisk', 'recovery', 'breakoutReadiness', 'fundamentalMomentum', 'survival', 'shareholderFriendliness', 'selfFunding', 'operatingLeverage', 'dilution'];
  const stock = mapSavedStock('AAA', {}, {data: {scores: Object.fromEntries(expected.map((key) => [key, evidence])), metrics: {operatingIncomeTtm: 100, incrementalOperatingMargin: 10}}}, NOW);
  const sections = buildCatalog([stock]).sections;
  for (const key of expected) assert.ok(sections.some((section) => section.id === key), `${key} should be filterable`);
});
test('risk-oriented additional scores use upper bounds, not high-is-good thresholds', () => {
  const rows = [2, 8].map((score, index) => mapSavedStock(`S${index}`, {}, {data: {scores: {fundingPressure: {...evidence, score, direction: 'higher_is_riskier'}}, metrics: {}}}, NOW));
  const catalog = buildCatalog(rows);
  const section = catalog.sections.find((item) => item.id === 'fundingPressure');
  assert.ok(section);
  assert.deepEqual(queryCatalog(catalog, [section.options[0].id], 'symbol').map((stock) => stock.symbol), ['S0']);
});
test('previously loaded but unexposed fundamental metrics receive filter sections', () => {
  const stock = mapSavedStock('AAA', {}, {data: {scores: {}, metrics: {roic: 18, operatingMargin: 25, interestCoverage: 10, netDebtToEbitda: 1.5}}}, NOW);
  const catalog = buildCatalog([stock]);
  for (const key of ['roic', 'operatingMargin', 'interestCoverage', 'netDebtToEbitda']) assert.ok(catalog.sections.some((section) => section.id === key), `${key} filter is missing`);
});
test('the repository projection includes additional scores and their evidence dependencies', async () => {
  const {repo} = repository({scorecards: [{symbol: 'AAA', data: {scores: {operatingLeverage: evidence, conviction: evidence}, metrics: {operatingIncomeTtm: 100, incrementalOperatingMargin: 10}}}]});
  const stocks = await repo.load('run-1');
  const sections = buildCatalog(stocks).sections;
  assert.ok(sections.some((section) => section.id === 'operatingLeverage'));
  assert.ok(sections.some((section) => section.id === 'conviction'));
});
test('SEC-enriched inputs alone are not advertised as a completed SEC-enriched scorecard', () => {
  const stock = mapSavedStock('AAA', {metrics: {secSupplement: {status: 'used'}, currentRatio: 2}}, {}, NOW);
  assert.equal(stock.secMetricsIncluded, false);
});