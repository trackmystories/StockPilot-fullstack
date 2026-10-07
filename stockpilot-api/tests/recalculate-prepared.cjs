require('./input-audit-register.cjs');

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {fixture} = require('./input-audit.fixture.cjs');
const {recalculatePrepared} = require('../src/intelligence/recalculate-prepared.ts');

test('saved financial inputs are recomputed and source objects stay immutable', () => {
  const input = fixture();
  input.metrics.freeCashFlow = 999999;
  const before = JSON.stringify(input);
  const report = recalculatePrepared(input, null, '2026-09-25T00:00:00Z');
  assert.equal(report.recalculated.metrics.freeCashFlow, -40);
  assert.equal(JSON.stringify(input), before);
  assert.equal(report.published, false);
  assert.equal(report.recalculated.scores.survival.score, null);
});
test('cash flow conflicts stay unresolved rather than being replaced with a guessed total', () => {
  const input = fixture();
  input.financials.cashFlow[0].freeCashFlow = 9999;
  const report = recalculatePrepared(input, null, '2026-09-25T00:00:00Z');
  assert.equal(report.recalculated.metrics.freeCashFlow, null);
  assert.ok(report.limitations.includes('cash_flow_identity_mismatch'));
  assert.equal(report.cashFlowRows[0].identityMatches, false);
});
test('preview uses a single saved quote observation for company and momentum inputs', () => {
  const input = fixture();
  input.company.marketCap = 200;
  input.company.price = 20;
  input.momentum = {price: 20, yearHigh: 40, yearLow: 5, rsi14: 50};
  const report = recalculatePrepared(input, null, '2026-09-25T00:00:00Z');
  assert.equal(report.normalizedCompany.marketCap, 100);
  assert.equal(report.normalizedMomentum.price, 10);
  assert.ok(report.limitations.includes('saved_quote_observations_disagree'));
});
test('rebuild input carries recalculated risk and keeps original observation time', () => {
  const input = fixture();
  input.risk.riskScore = 9.9;
  const report = recalculatePrepared(input, null, '2026-09-25T00:00:00Z');
  assert.ok(report.normalizedInput, 'all-stock rebuilding requires a normalized input');
  assert.equal(report.normalizedInput.risk.riskScore, report.recalculated.scores.risk.score);
  assert.equal(report.normalizedInput.preparedAt, input.preparedAt);
  assert.equal(report.normalizedInput.calculationVersion, 3);
});
test('saved volatility evidence is rescored instead of copying an old headline', () => {
  const input = fixture();
  input.risk.volatility = {beta: 2.1, annualizedVolatility: 0.8};
  input.risk.volatilityScore = 1;
  input.risk.volatilityCoverage = 1;
  const report = recalculatePrepared(input, null, '2026-09-25T00:00:00Z');
  assert.equal(report.normalizedInput.risk.volatilityScore, 10);
});
