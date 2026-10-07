require('./input-audit-register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {auditStock} = require('../src/intelligence/audit/audit-stock.ts');
const {buildScorecardMetrics} = require('../src/intelligence/scorecard-metrics.ts');
const {fixture} = require('./input-audit.fixture.cjs');
function audit(input) {
  return auditStock(input, null, {}, {sourceRunId: 'run', asOf: '2026-09-25T00:00:00Z'});
}
test('negative income explains unavailable conversion without inventing missing net income', () => {
  const r = audit(fixture());
  assert.ok(r.findings.some((f) => f.affectedMetrics.includes('cashConversion') && f.reason === 'not_applicable'));
  assert.ok(!r.findings.some((f) => f.path.includes('netIncome') && f.reason === 'missing_field'));
  assert.ok(r.findings.filter((f) => f.reason === 'not_applicable').every((f) => !f.researchCandidate));
});
test('zero cash flow is evidence, not missing', () => {
  const p = fixture();
  p.financials.cashFlow.forEach((r) => {
    r.operatingCashFlow = 0;
    r.capitalExpenditure = 0;
  });
  p.metrics = buildScorecardMetrics(p.financials, {currency: 'USD', marketCap: 100, price: 10});
  const r = audit(p);
  assert.ok(!r.findings.some((f) => f.reason === 'missing_field' && f.path.includes('operatingCashFlow')));
  assert.equal(r.metrics.freeCashFlow.value, 0);
});
test('missing source field is linked to calculators and lists and is researchable', () => {
  const p = fixture();
  delete p.financials.income[0].operatingIncome;
  p.metrics.operatingMargin = null;
  const r = audit(p);
  const f = r.findings.find((f) => f.reason === 'missing_field' && f.field === 'operatingIncome');
  assert.ok(f);
  assert.equal(f.period, '2026-06-30');
  assert.ok(f.affectedScores.includes('quality'));
  assert.ok(f.affectedLists.includes('high-quality'));
  assert.equal(f.researchCandidate, true);
});
test('existing alternative field is a mapping candidate, not research', () => {
  const p = fixture();
  p.financials.income[0].grossProfitLoss = 20;
  delete p.financials.income[0].grossProfit;
  p.metrics.grossMargin = null;
  const r = audit(p);
  assert.ok(r.findings.some((f) => f.reason === 'mapping_issue' && f.field === 'grossProfit' && !f.researchCandidate));
});
test('a skipped quarter is not treated as a valid positional comparison', () => {
  const p = fixture();
  p.financials.income.splice(2, 1);
  p.metrics.revenueGrowthTtm = null;
  const r = audit(p);
  assert.ok(r.findings.some((f) => f.reason === 'missing_period' && f.path.includes('income')));
});
test('misaligned statements are not reported as missing cash', () => {
  const p = fixture();
  p.financials.balanceSheet[0].date = '2026-05-31';
  p.metrics.cash = null;
  const r = audit(p);
  assert.ok(r.findings.some((f) => f.reason === 'period_mismatch' && f.affectedMetrics.includes('cash')));
  assert.ok(!r.findings.some((f) => f.field === 'cashAndShortTermInvestments' && f.reason === 'missing_field'));
});
test('all scores and all lists are represented and audit does not mutate source', () => {
  const p = fixture();
  const before = JSON.stringify(p);
  const r = audit(p);
  assert.equal(Object.keys(r.scores).length, 30);
  assert.equal(Object.keys(r.lists).length, 22);
  assert.equal(JSON.stringify(p), before);
});
test('out of scope small cap company is not counted as blocked by financial gaps', () => {
  const p = fixture();
  p.company.marketCap = 3e9;
  assert.equal(audit(p).lists['small-cap-quality'].status, 'not_applicable');
});
test('raw price history not retained is provenance unavailable, not a fictitious missing filing', () => {
  const r = audit(fixture());
  assert.ok(
    r.findings.some(
      (f) => f.affectedMetrics.includes('return3m') && f.reason === 'provenance_unavailable' && !f.researchCandidate,
    ),
  );
});
test('missing company market cap is visible to all list gates', () => {
  const p = fixture();
  p.company.marketCap = null;
  const f = audit(p).findings.find((f) => f.path === 'company.marketCap');
  assert.ok(f);
  assert.equal(f.affectedLists.length, 22);
  assert.equal(f.researchCandidate, false);
});
test('unsupported calculation versions are rejected', () => {
  const p = fixture();
  p.calculationVersion = 99;
  assert.throws(() => audit(p), /support calculation version 2/);
});
test('duplicate dates are flagged instead of silently accepted', () => {
  const p = fixture();
  p.financials.income.push({...p.financials.income[0]});
  assert.ok(audit(p).findings.some((f) => f.field === 'date' && f.reason === 'invalid_value'));
});
test('audit freshness uses source dates rather than cached age counters', () => {
  const p = fixture();
  p.metrics.dataQuality.statementAgeDays = 0;
  const r = auditStock(p, null, {}, {sourceRunId: 'run', asOf: '2027-09-25T00:00:00Z'});
  assert.ok(r.findings.some((f) => f.reason === 'stale_input' && f.field === 'asOf'));
});
test('currency mismatch is not turned into a research request for missing revenue', () => {
  const p = fixture();
  p.financials.cashFlow[0].reportedCurrency = 'EUR';
  const r = audit(p);
  assert.ok(r.findings.some((f) => f.reason === 'currency_mismatch' && !f.researchCandidate));
});

test('partial output is distinguished from unknown input provenance', () => {
  const p = fixture();
  const r = auditStock(
    p,
    {scores: {quality: {score: 8, coverage: 0.6, components: {}}}},
    {},
    {sourceRunId: 'run', asOf: '2026-09-25T00:00:00Z'},
  );
  const finding = r.findings.find((f) => f.path === 'scorecard.scores.quality');
  assert.equal(finding.reason, 'incomplete_score');
  assert.equal(finding.researchCandidate, false);
});