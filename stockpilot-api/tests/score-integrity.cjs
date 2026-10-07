require('./input-audit-register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {calculateWeightedScore, gateComposite} = require('../src/intelligence/scoring.ts');
const {calculateSurvivalScore} = require('../src/intelligence/calculators/survival.calculator.ts');
const {calculateOperatingLeverageScore} = require('../src/intelligence/calculators/operating-leverage.calculator.ts');
const {calculateScorecard} = require('../src/intelligence/calculate-scorecard.ts');
const {fixture} = require('./input-audit.fixture.cjs');
const {buildScorecardMetrics} = require('../src/intelligence/scorecard-metrics.ts');
const complete = (score = 7) => ({
  score,
  coverage: 1,
  confidence: 'high',
  direction: 'higher_is_better',
  components: {},
});
test('missing component cannot inflate a headline score through reweighting', () => {
  const r = calculateWeightedScore([
    {name: 'good', rawValue: 1, score: 10, weight: 0.6},
    {name: 'missing', rawValue: null, score: null, weight: 0.4},
  ]);
  assert.equal(r.score, null);
  assert.equal(r.coverage, 0.6);
  assert.equal(r.eligible, false);
  assert.ok(r.reasons.includes('incomplete_component_evidence'));
});
test('partial underlying composite evidence is not reweighted', () => {
  const r = calculateWeightedScore([
    {name: 'a', rawValue: 9, score: 9, weight: 0.5, coverage: 0.99},
    {name: 'b', rawValue: 9, score: 9, weight: 0.5},
  ]);
  assert.equal(r.score, null);
});
test('complete scores retain their specified weighting', () => {
  const r = calculateWeightedScore([
    {name: 'a', rawValue: 0, score: 2, weight: 0.25},
    {name: 'b', rawValue: -1, score: 8, weight: 0.75},
  ]);
  assert.equal(r.score, 6.5);
  assert.equal(r.coverage, 1);
});
test('null composite can never be eligible even with complete core sources', () => {
  const r = gateComposite({...complete(), score: null}, [complete()], 0);
  assert.equal(r.eligible, false);
});
test('Survival requires Cash Power and every core source', () => {
  const r = calculateSurvivalScore({
    financialHealth: complete(),
    cashPower: {...complete(), score: null, coverage: 0.4},
    fundingPressure: complete(),
    dilutionRisk: complete(),
  });
  assert.equal(r.score, null);
  assert.equal(r.eligible, false);
});
test('negative incremental profit cannot receive a strong Operating Leverage headline', () => {
  const r = calculateOperatingLeverageScore({
    operatingMarginChangeYoY: 28.7,
    revenueGrowthYoY: 47,
    incrementalOperatingMargin: -11.94,
    operatingIncomeTtm: -279636000,
  });
  assert.equal(r.score, null);
  assert.equal(r.eligible, false);
  assert.ok(r.reasons.includes('positive_incremental_operating_margin_required'));
});
test('partial risk coverage does not bypass complete-evidence policy', () => {
  const p = fixture();
  p.metrics.dataQuality.priceAgeDays = 0;
  const card = calculateScorecard(
    'TEST',
    p.metrics,
    {riskScore: 7, riskCoverage: 0.8, volatilityScore: 7, volatilityCoverage: 1},
    p.financials,
  );
  assert.equal(card.scores.risk.score, null);
});
test('cash-flow reconciliation conflicts are not silently accepted', () => {
  const p = fixture();
  p.financials.cashFlow[0].freeCashFlow = 99999;
  const m = buildScorecardMetrics(p.financials, {price: 10, marketCap: 100, currency: 'USD'});
  assert.equal(m.freeCashFlow, null);
  assert.equal(m.cashRunwayQuarters, null);
  assert.ok(m.dataQuality.warnings.includes('cash_flow_identity_mismatch'));
});
test('legacy stored cards cannot expose partial scores on read', () => {
  const {enforceScorecardEvidence} = require('../src/intelligence/scorecard-evidence.ts');
  const source = {scores: {quality: {...complete(8), coverage: 0.6}}, metrics: {}, categories: {}};
  assert.equal(enforceScorecardEvidence(source).scores.quality.score, null);
  assert.equal(source.scores.quality.score, 8);
});
test('partial Strong Balance Sheet category is unavailable', () => {
  const {calculateStrongBalanceSheet} = require('../src/intelligence/calculators/strong-balance-sheet.calculator.ts');
  const p = fixture();
  assert.equal(calculateStrongBalanceSheet(p.financials, p.metrics).score, null);
});

test('invalid valuation inputs cannot manufacture full risk coverage', () => {
  const {calculateRiskScore} = require('../src/intelligence/calculators/risk.calculator.ts');
  const r = calculateRiskScore({
    volatilityScore: 5,
    beta: 1,
    marketCap: 1e9,
    debtToEquity: 1,
    currentRatio: 1,
    netMargin: 10,
    freeCashFlow: 1,
    peRatio: NaN,
    priceToSalesRatio: null,
  });
  assert.equal(r.score, null);
  assert.equal(r.components.valuation, null);
});