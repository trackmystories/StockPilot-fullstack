require('./input-audit-register.cjs');
const {buildScorecardMetrics} = require('../src/intelligence/scorecard-metrics.ts');
const dates = [
  '2026-06-30',
  '2026-03-31',
  '2025-12-31',
  '2025-09-30',
  '2025-06-30',
  '2025-03-31',
  '2024-12-31',
  '2024-09-30',
];
function fixture() {
  const common = dates.map((date) => ({date, period: 'Q', reportedCurrency: 'USD'}));
  const financials = {
    symbol: 'TEST',
    income: common.map((r) => ({
      ...r,
      revenue: 100,
      netIncome: -10,
      operatingIncome: -5,
      grossProfit: 20,
      ebitda: -2,
      incomeBeforeTax: -10,
      incomeTaxExpense: 0,
      epsDiluted: -1,
      interestExpense: 1,
      weightedAverageShsOutDil: 10,
    })),
    balanceSheet: common.map((r) => ({
      ...r,
      totalDebt: 20,
      totalStockholdersEquity: 50,
      cashAndShortTermInvestments: 10,
      totalAssets: 100,
      totalCurrentAssets: 20,
      totalCurrentLiabilities: 10,
      shortTermDebt: 0,
    })),
    cashFlow: common.map((r) => ({
      ...r,
      operatingCashFlow: -5,
      capitalExpenditure: -5,
      stockBasedCompensation: 0,
      netCommonStockIssuance: 0,
    })),
  };
  const metrics = buildScorecardMetrics(
    financials,
    {currency: 'USD', marketCap: 100, price: 10},
    {},
    [],
    null,
    Date.parse('2026-09-24'),
  );
  return {
    symbol: 'TEST',
    calculationVersion: 2,
    preparedAt: '2026-09-24T00:00:00Z',
    financials,
    metrics,
    company: {
      companyName: 'Test',
      sector: 'Technology',
      industry: 'Software',
      currency: 'USD',
      marketCap: 100,
      price: 10,
    },
    risk: {},
    momentum: null,
    estimates: null,
  };
}
module.exports = {fixture};