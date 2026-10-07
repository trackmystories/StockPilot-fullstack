import type {EstimatesData} from './calculators/calculator.type';
import type {FmpFinancialStatements, StockIntelligenceMetrics} from './types';
type Row = Record<string, unknown>;
export const numeric = (value: unknown): number | null =>
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value))
    ? Number(value)
    : null;
export const field = (row: Row | undefined, ...keys: string[]): number | null =>
  keys.map((key) => numeric(row?.[key])).find((value) => value !== null) ?? null;
export const ratio = (a: number | null, b: number | null): number | null =>
  a === null || b === null || b <= 0 || !Number.isFinite(a / b) ? null : a / b;
export const percent = (a: number | null, b: number | null): number | null => {
  const value = ratio(a, b);
  return value === null ? null : value * 100;
};
export const difference = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? null : a - b;
export const growth = (a: number | null, b: number | null): number | null => percent(difference(a, b), b);
const positive = (value: number | null): number | null => (value !== null && value > 0 ? value : null);
const cagr = (a: number | null, b: number | null): number | null =>
  a === null || b === null || a <= 0 || b <= 0 ? null : (Math.pow(a / b, 1 / 3) - 1) * 100;
export const ordered = (rows: Row[]): Row[] =>
  [
    ...new Map(
      [...rows]
        .filter((row) => typeof row.date === 'string' && Number.isFinite(Date.parse(row.date)))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((row) => [String(row.date), row]),
    ).values(),
  ].reverse();
export function validQuarters(rows: Row[], count: number): boolean {
  if (rows.length < count) return false;
  const period = rows.slice(0, count);
  if (period.some((row) => row.period === 'FY')) return false;
  if (new Set(period.map((row) => row.reportedCurrency).filter(Boolean)).size > 1) return false;
  return period.every((row, index) => {
    if (!Number.isFinite(Date.parse(String(row.date)))) return false;
    if (!index) return true;
    const days = (Date.parse(String(period[index - 1].date)) - Date.parse(String(row.date))) / 86400000;
    return days >= 60 && days <= 120;
  });
}
export function sum(rows: Row[], start: number, ...keys: string[]): number | null {
  const period = rows.slice(start, start + 4);
  if (!validQuarters(period, 4)) return null;
  const values = period.map((row) => field(row, ...keys));
  return values.some((value) => value === null)
    ? null
    : values.reduce<number>((total, value) => total + (value as number), 0);
}
const consistency = (rows: Row[], key: string): number | null => {
  if (!validQuarters(rows, 8)) return null;
  const values = rows.slice(0, 8).map((row) => field(row, key));
  return values.some((value) => value === null)
    ? null
    : (values.filter((value) => (value as number) > 0).length / 8) * 100;
};
export function buildScorecardMetrics(
  statements: FmpFinancialStatements,
  quote: Row = {},
  _ratios: Row = {},
  history: Row[] = [],
  estimates: EstimatesData | null = null,
  now = Date.now(),
): StockIntelligenceMetrics {
  const income = ordered(statements.income);
  const asOf = typeof income[0]?.date === 'string' ? income[0].date : null;
  const currencies = new Set(
    [
      income[0]?.reportedCurrency,
      ordered(statements.balanceSheet)[0]?.reportedCurrency,
      ordered(statements.cashFlow)[0]?.reportedCurrency,
    ].filter(Boolean),
  );
  const aligned = (rows: Row[]): Row[] => {
    const sorted = ordered(rows);
    return sorted[0]?.date === asOf && currencies.size <= 1 ? sorted : [];
  };
  const balance = aligned(statements.balanceSheet);
  let cashFlowConflict = false;
  const cashFlow = aligned(statements.cashFlow).map((row) => {
    const ocf = field(row, 'operatingCashFlow', 'netCashProvidedByOperatingActivities');
    const capex = field(row, 'capitalExpenditure');
    const supplied = field(row, 'freeCashFlow');
    const derived = ocf !== null && capex !== null ? ocf - Math.abs(capex) : null;
    const conflict =
      supplied !== null && derived !== null && Math.abs(supplied - derived) > Math.max(1, Math.abs(derived) * 0.000001);
    cashFlowConflict ||= conflict;
    return {...row, freeCashFlow: conflict ? null : (supplied ?? derived)};
  });
  const ttm = (key: string, offset = 0): number | null => sum(income, offset, key);
  const revenue = ttm('revenue');
  const oldRevenue = validQuarters(income, 8) ? ttm('revenue', 4) : null;
  const operating = ttm('operatingIncome');
  const oldOperating = validQuarters(income, 8) ? ttm('operatingIncome', 4) : null;
  const netIncome = ttm('netIncome');
  const ebitda = ttm('ebitda');
  const eps = sum(income, 0, 'epsDiluted', 'eps');
  const oldEps = validQuarters(income, 8) ? sum(income, 4, 'epsDiluted', 'eps') : null;
  const cash = field(balance[0], 'cashAndShortTermInvestments', 'cashAndCashEquivalents');
  const debt = field(balance[0], 'totalDebt');
  const netDebt = difference(debt, cash);
  const equity = field(balance[0], 'totalStockholdersEquity');
  const invested = equity === null || netDebt === null ? null : equity + netDebt;
  const oldCash = field(balance[4], 'cashAndShortTermInvestments', 'cashAndCashEquivalents');
  const oldDebt = field(balance[4], 'totalDebt');
  const oldEquity = field(balance[4], 'totalStockholdersEquity');
  const oldInvested =
    validQuarters(balance, 5) && oldEquity !== null && oldCash !== null && oldDebt !== null
      ? oldEquity + oldDebt - oldCash
      : null;
  const averageInvested = invested !== null && oldInvested !== null ? (invested + oldInvested) / 2 : null;
  const taxRate = ratio(ttm('incomeTaxExpense'), ttm('incomeBeforeTax'));
  const oldTaxRate = ratio(ttm('incomeTaxExpense', 4), ttm('incomeBeforeTax', 4));
  const nopat =
    operating !== null && taxRate !== null && taxRate >= 0 && taxRate <= 0.5 ? operating * (1 - taxRate) : null;
  const oldNopat =
    oldOperating !== null && oldTaxRate !== null && oldTaxRate >= 0 && oldTaxRate <= 0.5
      ? oldOperating * (1 - oldTaxRate)
      : null;
  const fcf = sum(cashFlow, 0, 'freeCashFlow');
  const oldFcf = validQuarters(cashFlow, 8) ? sum(cashFlow, 4, 'freeCashFlow') : null;
  const ocf = sum(cashFlow, 0, 'operatingCashFlow', 'netCashProvidedByOperatingActivities');
  const capex = sum(cashFlow, 0, 'capitalExpenditure');
  const reportedCurrency = typeof income[0]?.reportedCurrency === 'string' ? income[0].reportedCurrency : null;
  const currencyComparable =
    reportedCurrency !== null &&
    typeof quote.currency === 'string' &&
    quote.currency.toUpperCase() === reportedCurrency.toUpperCase();
  const marketCap = positive(field(quote, 'marketCap'));
  const comparableCap = currencyComparable ? marketCap : null;
  const price = positive(field(quote, 'price'));
  const enterpriseValue = comparableCap !== null && netDebt !== null ? positive(comparableCap + netDebt) : null;
  const latestGrowth = validQuarters(income, 5)
    ? growth(field(income[0], 'revenue'), field(income[4], 'revenue'))
    : null;
  const priorGrowth = validQuarters(income, 6)
    ? growth(field(income[1], 'revenue'), field(income[5], 'revenue'))
    : null;
  const rates = validQuarters(income, 8)
    ? income.slice(0, 4).map((row, i) => growth(field(row, 'revenue'), field(income[i + 4], 'revenue')))
    : [];
  const mean =
    rates.length === 4 && rates.every((rate) => rate !== null)
      ? rates.reduce<number>((a, b) => a + (b as number), 0) / 4
      : null;
  const growthConsistency =
    mean === null
      ? null
      : Math.max(0, 100 - Math.sqrt(rates.reduce<number>((a, b) => a + ((b as number) - mean) ** 2, 0) / 4) * 3);
  const operatingMargin = percent(operating, revenue);
  const grossMargin = percent(ttm('grossProfit'), revenue);
  const assets = field(balance[0], 'totalAssets');
  const oldAssets = validQuarters(balance, 5) ? field(balance[4], 'totalAssets') : null;
  const averageAssets = assets !== null && oldAssets !== null ? (assets + oldAssets) / 2 : null;
  const interest = sum(income, 0, 'interestExpense', 'interestExpenseNonOperating');
  const prices = ordered(history).filter((row) => positive(field(row, 'adjClose', 'close')) !== null);
  const priceAsOf = typeof prices[0]?.date === 'string' ? prices[0].date : null;
  const age = (date: string | null): number | null =>
    date === null ? null : Math.max(0, Math.floor((now - Date.parse(date)) / 86400000));
  const trailingReturn = (months: number): number | null => {
    if (!priceAsOf) return null;
    const target = new Date(priceAsOf);
    target.setUTCMonth(target.getUTCMonth() - months);
    const previous = prices.find((row) => Date.parse(String(row.date)) <= target.getTime());
    if (!previous || target.getTime() - Date.parse(String(previous.date)) > 7 * 86400000) return null;
    return growth(field(prices[0], 'adjClose', 'close'), field(previous, 'adjClose', 'close'));
  };
  const warnings = [
    cashFlowConflict ? 'cash_flow_identity_mismatch' : null,
    !validQuarters(income, 4) ? 'incomplete_quarterly_income' : null,
    !balance.length ? 'unaligned_balance_sheet' : null,
    !validQuarters(cashFlow, 4) ? 'incomplete_or_unaligned_cash_flow' : null,
    !currencyComparable ? 'valuation_currency_unverified' : null,
  ].filter((value): value is string => value !== null);
  return {
    dataQuality: {
      asOf,
      statementAgeDays: age(asOf),
      priceAsOf,
      priceAgeDays: age(priceAsOf),
      reportedCurrency,
      currencyComparable,
      quoteCurrency: typeof quote.currency === 'string' ? quote.currency : null,
      warnings,
    },
    revenueTtm: revenue,
    netIncomeTtm: netIncome,
    operatingIncomeTtm: operating,
    ebitdaTtm: ebitda,
    epsDilutedTtm: eps,
    profitabilityConsistency: consistency(income, 'operatingIncome'),
    positiveFcfQuarters: consistency(cashFlow, 'freeCashFlow'),
    stockBasedCompensationToRevenue: percent(sum(cashFlow, 0, 'stockBasedCompensation'), revenue),
    netStockIssuanceToRevenue: percent(sum(cashFlow, 0, 'netCommonStockIssuance'), revenue),
    incrementalOperatingMargin: percent(difference(operating, oldOperating), difference(revenue, oldRevenue)),
    operatingIncomeGrowthYoY: growth(operating, oldOperating),
    debtToEquity: ratio(debt, equity),
    shortTermDebt: field(balance[0], 'shortTermDebt', 'shortTermDebtAndCurrentPortionOfLongTermDebt'),
    interestExpenseTtm: interest === null ? null : Math.abs(interest),
    revenueGrowthYoY: latestGrowth,
    revenueGrowthTtm: growth(revenue, oldRevenue),
    revenueCagr3Y: validQuarters(income, 16) ? cagr(revenue, ttm('revenue', 12)) : null,
    revenueAcceleration: difference(latestGrowth, priorGrowth),
    revenueGrowthConsistency: growthConsistency,
    epsGrowthYoY: growth(eps, oldEps),
    epsCagr3Y: validQuarters(income, 16) ? cagr(eps, sum(income, 12, 'epsDiluted', 'eps')) : null,
    grossMargin,
    grossMarginChangeYoY: difference(grossMargin, percent(ttm('grossProfit', 4), oldRevenue)),
    operatingMargin,
    operatingMarginChangeYoY: difference(operatingMargin, percent(oldOperating, oldRevenue)),
    netMargin: percent(netIncome, revenue),
    freeCashFlow: fcf,
    freeCashFlowGrowthYoY: growth(fcf, oldFcf),
    freeCashFlowMargin: percent(fcf, revenue),
    operatingCashFlowMargin: percent(ocf, revenue),
    cashConversion: ratio(ocf, netIncome),
    fcfConversion: ratio(fcf, netIncome),
    accrualRatio: percent(difference(netIncome, ocf), averageAssets),
    roic:
      invested !== null && invested > 0 && oldInvested !== null && oldInvested > 0
        ? percent(nopat, averageInvested)
        : null,
    incrementalRoic:
      invested !== null && oldInvested !== null && oldInvested > 0 && invested - oldInvested > oldInvested * 0.05
        ? percent(difference(nopat, oldNopat), invested - oldInvested)
        : null,
    revenueToInvestedCapital: ratio(revenue, averageInvested),
    capexIntensity: percent(capex === null ? null : Math.abs(capex), revenue),
    cash,
    totalDebt: debt,
    netDebt,
    currentRatio: ratio(
      field(balance[0], 'totalCurrentAssets', 'currentAssets'),
      field(balance[0], 'totalCurrentLiabilities', 'currentLiabilities'),
    ),
    interestCoverage: ratio(operating, interest === null ? null : Math.abs(interest)),
    netDebtToEbitda: ratio(netDebt, ebitda),
    debtGrowthYoY: validQuarters(balance, 5) ? growth(debt, oldDebt) : null,
    cashToShortTermDebt: ratio(
      cash,
      field(balance[0], 'shortTermDebt', 'shortTermDebtAndCurrentPortionOfLongTermDebt'),
    ),
    cashRunwayQuarters: fcf !== null && fcf < 0 ? ratio(cash, -fcf / 4) : null,
    dilutedShareGrowthYoY: validQuarters(income, 5)
      ? growth(field(income[0], 'weightedAverageShsOutDil'), field(income[4], 'weightedAverageShsOutDil'))
      : null,
    netStockIssuance: sum(cashFlow, 0, 'netCommonStockIssuance'),
    marketCap,
    pe: ratio(comparableCap, netIncome),
    forwardPe: currencyComparable && estimates?.currency === reportedCurrency ? ratio(price, estimates.nextEps) : null,
    priceToSales: ratio(comparableCap, revenue),
    priceToBook: ratio(comparableCap, equity),
    priceToFcf: ratio(comparableCap, fcf),
    evToEbitda: ratio(enterpriseValue, ebitda),
    fcfYield: percent(fcf, comparableCap),
    price,
    priceAvg50: positive(field(quote, 'priceAvg50')),
    priceAvg200: positive(field(quote, 'priceAvg200')),
    yearHigh: positive(field(quote, 'yearHigh')),
    yearLow: positive(field(quote, 'yearLow')),
    return1m: trailingReturn(1),
    return3m: trailingReturn(3),
    return6m: trailingReturn(6),
    return12m: trailingReturn(12),
    volume: field(quote, 'volume'),
    averageVolume: field(quote, 'avgVolume', 'averageVolume'),
    forwardRevenueGrowth: estimates?.revenueGrowth == null ? null : estimates.revenueGrowth * 100,
    forwardEpsGrowth: estimates?.epsGrowth == null ? null : estimates.epsGrowth * 100,
    analystCount: estimates?.analystCount ?? null,
  };
}