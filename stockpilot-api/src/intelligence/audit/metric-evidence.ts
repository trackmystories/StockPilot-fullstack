import {numeric} from '../scorecard-metrics';
import type {PreparedInput} from '../prepared-stock.type';
import type {Trace} from './audit.types';
import {combine, divide, EvidenceReader, growth, known, positive, problem, subtract} from './evidence-reader';
// Diagnostic rules for calculation version 2. These explain inputs; they never replace published metrics.
export function metricEvidence(input: PreparedInput): Record<string, Trace> {
  const r = new EvidenceReader(input);
  const income = (key: string, offset = 0) => r.sum('income', key, offset);
  const cashFlow = (key: string, offset = 0) => r.sum('cashFlow', key, offset);
  const balance = (key: string, offset = 0, ...aliases: string[]) => r.point('balanceSheet', offset, key, ...aliases);
  const revenue = income('revenue');
  const oldRevenue = income('revenue', 4);
  const operating = income('operatingIncome');
  const oldOperating = income('operatingIncome', 4);
  const netIncome = income('netIncome');
  const ebitda = income('ebitda');
  const eps = (offset = 0) => r.sum('income', 'epsDiluted', offset, 'eps');
  const cash = (offset = 0) => balance('cashAndShortTermInvestments', offset, 'cashAndCashEquivalents');
  const debt = (offset = 0) => balance('totalDebt', offset);
  const equity = (offset = 0) => balance('totalStockholdersEquity', offset);
  const invested = (offset = 0) => combine([equity(offset), debt(offset), cash(offset)], (e, d, c) => e + d - c);
  const averageInvested = combine([invested(), invested(4)], (a, b) => (a + b) / 2);
  const taxRate = (offset = 0) =>
    divide(income('incomeTaxExpense', offset), income('incomeBeforeTax', offset), 'incomeBeforeTax');
  const nopat = (offset = 0) => {
    const tax = taxRate(offset);
    if (tax.value !== null && (tax.value < 0 || tax.value > 0.5))
      return problem(
        'not_applicable',
        'derived.effectiveTaxRate',
        'effectiveTaxRate',
        offset ? 'prior TTM' : 'TTM',
        'Effective tax rate is outside the current model range [0, 0.5]. Review tax treatment; do not invent a replacement tax rate.',
        tax.value,
      );
    return combine([income('operatingIncome', offset), tax], (op, rate) => op * (1 - rate));
  };
  const fcf = cashFlow('freeCashFlow');
  const oldFcf = cashFlow('freeCashFlow', 4);
  const ocf = r.sum('cashFlow', 'operatingCashFlow', 0, 'netCashProvidedByOperatingActivities');
  const netDebt = subtract(debt(), cash());
  const interest = combine([r.sum('income', 'interestExpense', 0, 'interestExpenseNonOperating')], Math.abs);
  const quarterlyGrowth = (offset = 0) =>
    growth(
      r.point('income', offset, 'revenue'),
      r.point('income', offset + 4, 'revenue'),
      `priorYearRevenue.${offset}`,
    );
  const margin = (key: string, offset = 0) =>
    divide(income(key, offset), income('revenue', offset), `revenue.${offset}`, 100);
  const cagr = (a: Trace, b: Trace, name: string) =>
    combine([positive(a, name), positive(b, `prior.${name}`)], (x, y) => (Math.pow(x / y, 1 / 3) - 1) * 100);
  const cap = positive(r.saved('metrics', 'marketCap'), 'marketCap');
  const price = positive(r.saved('metrics', 'price'), 'price');
  const comparable = (value: Trace): Trace => {
    const quality = input.metrics.dataQuality;
    return quality?.reportedCurrency &&
      quality.quoteCurrency &&
      quality.reportedCurrency.toUpperCase() === quality.quoteCurrency.toUpperCase()
      ? value
      : problem(
          'currency_mismatch',
          'metrics.dataQuality',
          'quoteCurrency',
          'saved observation',
          'Reported and quote currencies are absent or different; valuation inputs cannot be compared.',
        );
  };
  const enterprise = positive(
    combine([comparable(cap), netDebt], (a, b) => a + b),
    'enterpriseValue',
  );
  const shortDebt = balance('shortTermDebt', 0, 'shortTermDebtAndCurrentPortionOfLongTermDebt');
  const m: Record<string, Trace> = {
    revenueTtm: revenue,
    netIncomeTtm: netIncome,
    operatingIncomeTtm: operating,
    ebitdaTtm: ebitda,
    epsDilutedTtm: eps(),
    profitabilityConsistency: r.series(
      'income',
      0,
      8,
      ['operatingIncome'],
      (...v) => (v.filter((x) => x > 0).length / 8) * 100,
    ),
    positiveFcfQuarters: r.series(
      'cashFlow',
      0,
      8,
      ['freeCashFlow'],
      (...v) => (v.filter((x) => x > 0).length / 8) * 100,
    ),
    stockBasedCompensationToRevenue: divide(cashFlow('stockBasedCompensation'), revenue, 'revenueTtm', 100),
    netStockIssuanceToRevenue: divide(cashFlow('netCommonStockIssuance'), revenue, 'revenueTtm', 100),
    incrementalOperatingMargin: divide(
      subtract(operating, oldOperating),
      subtract(revenue, oldRevenue),
      'incrementalRevenue',
      100,
    ),
    operatingIncomeGrowthYoY: growth(operating, oldOperating, 'priorOperatingIncome'),
    debtToEquity: divide(debt(), equity(), 'equity'),
    shortTermDebt: shortDebt,
    interestExpenseTtm: interest,
    revenueGrowthYoY: quarterlyGrowth(),
    revenueGrowthTtm: growth(revenue, oldRevenue, 'priorRevenueTtm'),
    revenueCagr3Y: cagr(revenue, income('revenue', 12), 'revenueTtm'),
    revenueAcceleration: subtract(quarterlyGrowth(), quarterlyGrowth(1)),
    revenueGrowthConsistency: combine([0, 1, 2, 3].map(quarterlyGrowth), (...v) => {
      const mean = v.reduce((a, b) => a + b, 0) / 4;
      return Math.max(0, 100 - Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / 4) * 3);
    }),
    epsGrowthYoY: growth(eps(), eps(4), 'priorEps'),
    epsCagr3Y: cagr(eps(), eps(12), 'eps'),
    grossMargin: margin('grossProfit'),
    grossMarginChangeYoY: subtract(margin('grossProfit'), margin('grossProfit', 4)),
    operatingMargin: margin('operatingIncome'),
    operatingMarginChangeYoY: subtract(margin('operatingIncome'), margin('operatingIncome', 4)),
    netMargin: margin('netIncome'),
    freeCashFlow: fcf,
    freeCashFlowGrowthYoY: growth(fcf, oldFcf, 'priorFreeCashFlow'),
    freeCashFlowMargin: divide(fcf, revenue, 'revenueTtm', 100),
    operatingCashFlowMargin: divide(ocf, revenue, 'revenueTtm', 100),
    cashConversion: divide(ocf, netIncome, 'netIncomeTtm'),
    fcfConversion: divide(fcf, netIncome, 'netIncomeTtm'),
    accrualRatio: divide(
      subtract(netIncome, ocf),
      combine([balance('totalAssets'), balance('totalAssets', 4)], (a, b) => (a + b) / 2),
      'averageAssets',
      100,
    ),
    roic: divide(
      combine(
        [nopat(), positive(invested(), 'investedCapital'), positive(invested(4), 'priorInvestedCapital')],
        (n) => n,
      ),
      averageInvested,
      'averageInvestedCapital',
      100,
    ),
    incrementalRoic: divide(
      subtract(nopat(), nopat(4)),
      subtract(invested(), invested(4)),
      'incrementalInvestedCapital',
      100,
    ),
    revenueToInvestedCapital: divide(revenue, averageInvested, 'averageInvestedCapital'),
    capexIntensity: divide(combine([cashFlow('capitalExpenditure')], Math.abs), revenue, 'revenueTtm', 100),
    cash: cash(),
    totalDebt: debt(),
    netDebt,
    currentRatio: divide(
      balance('totalCurrentAssets', 0, 'currentAssets'),
      balance('totalCurrentLiabilities', 0, 'currentLiabilities'),
      'currentLiabilities',
    ),
    interestCoverage: divide(operating, interest, 'interestExpense'),
    netDebtToEbitda: divide(netDebt, ebitda, 'ebitdaTtm'),
    debtGrowthYoY: growth(debt(), debt(4), 'priorDebt'),
    cashToShortTermDebt: divide(cash(), shortDebt, 'shortTermDebt'),
    cashRunwayQuarters:
      fcf.value !== null && fcf.value >= 0
        ? problem(
            'not_applicable',
            'derived.cashRunwayQuarters',
            'cashRunwayQuarters',
            'TTM',
            'Free cash flow is nonnegative; cash-burn runway is not applicable. Funding calculators have an explicit non-burning branch.',
            fcf.value,
          )
        : divide(
            cash(),
            combine([fcf], (v) => -v / 4),
            'quarterlyCashBurn',
          ),
    dilutedShareGrowthYoY: growth(
      r.point('income', 0, 'weightedAverageShsOutDil'),
      r.point('income', 4, 'weightedAverageShsOutDil'),
      'priorDilutedShares',
    ),
    netStockIssuance: cashFlow('netCommonStockIssuance'),
    marketCap: cap,
    price,
    pe: divide(comparable(cap), netIncome, 'netIncomeTtm'),
    priceToSales: divide(comparable(cap), revenue, 'revenueTtm'),
    priceToBook: divide(comparable(cap), equity(), 'equity'),
    priceToFcf: divide(comparable(cap), fcf, 'freeCashFlow'),
    evToEbitda: divide(enterprise, ebitda, 'ebitdaTtm'),
    fcfYield: divide(fcf, comparable(cap), 'marketCap', 100),
    forwardRevenueGrowth: r.saved('metrics', 'forwardRevenueGrowth'),
    forwardEpsGrowth: r.saved('metrics', 'forwardEpsGrowth'),
    forwardPe:
      input.estimates?.currency && input.estimates.currency === input.metrics.dataQuality?.reportedCurrency
        ? divide(comparable(price), r.saved('estimates', 'nextEps'), 'nextEps')
        : problem(
            'currency_mismatch',
            'estimates.currency',
            'currency',
            'forecast period',
            'Forecast and reporting currencies are absent or different.',
          ),
    analystCount: r.saved('metrics', 'analystCount'),
  };
  const oldInvested = invested(4);
  const increment = subtract(invested(), oldInvested);
  if (
    oldInvested.value !== null &&
    increment.value !== null &&
    (oldInvested.value <= 0 || increment.value <= oldInvested.value * 0.05)
  ) {
    m.incrementalRoic = problem(
      'not_applicable',
      'derived.incrementalRoic',
      'incrementalInvestedCapital',
      'year over year',
      'Current model requires positive prior capital and an increase exceeding 5%.',
      increment.value,
    );
  }
  for (const key of [
    'priceAvg50',
    'priceAvg200',
    'yearHigh',
    'yearLow',
    'return1m',
    'return3m',
    'return6m',
    'return12m',
    'volume',
    'averageVolume',
  ])
    m[key] = r.saved('metrics', key);
  for (const key of ['price', 'yearHigh', 'yearLow', 'rsi14']) m[`momentum.${key}`] = r.saved('momentum', key);
  for (const key of ['epsRevision', 'revenueRevision', 'revisionDays', 'analystCount'])
    m[`estimates.${key}`] = r.saved('estimates', key);
  for (const key of ['riskScore', 'volatilityScore']) m[`risk.${key}`] = r.saved('risk', key);
  for (const key of ['companyName', 'industry', 'sector', 'currency']) {
    const value = input.company[key as keyof typeof input.company];
    m[`company.${key}`] =
      typeof value === 'string' && value.trim()
        ? known(1)
        : problem(
            'missing_field',
            `company.${key}`,
            key,
            'saved profile',
            'Company profile metadata is absent; verify the profile source, not a financial statement.',
          );
  }
  const companyCap = numeric(input.company.marketCap);
  m['company.marketCap'] =
    companyCap === null || companyCap <= 0
      ? problem(
          'invalid_value',
          'company.marketCap',
          'marketCap',
          'saved profile',
          'Positive company market capitalization is required by the list gate.',
          input.company.marketCap,
        )
      : known(companyCap);
  for (const key of [
    'priceAvg50',
    'priceAvg200',
    'yearHigh',
    'yearLow',
    'momentum.price',
    'momentum.yearHigh',
    'momentum.yearLow',
  ])
    if (m[key].value !== null && m[key].value! <= 0)
      m[key] = problem(
        'invalid_value',
        key,
        key,
        'saved market data',
        'Price observations must be positive.',
        m[key].value,
      );
  const rsi = m['momentum.rsi14'].value;
  if (rsi !== null && (rsi < 0 || rsi > 100))
    m['momentum.rsi14'] = problem(
      'invalid_value',
      'momentum.rsi14',
      'rsi14',
      'saved market data',
      'RSI must be between 0 and 100.',
      rsi,
    );
  // Each metric is compared to the saved value later. A valid derivation is not silently substituted.
  return m;
}