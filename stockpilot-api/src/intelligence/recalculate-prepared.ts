import {supplementSecMetrics, type SavedSecEvidence} from './sec-score-inputs';
import {calculateScorecard} from './calculate-scorecard';
import {CALCULATION_VERSION} from './calculation-version';
import {intelligenceCalculators} from './calculators/calculator.registry';
import {calculateRiskScore} from './calculators/risk.calculator';
import {
  calculateVolatilityScore,
  scoreVolatilityEvidence,
} from './calculators/volatility.calculator';
import type {PreparedInput} from './prepared-stock.type';
import {buildScorecardMetrics, field, ordered} from './scorecard-metrics';
import type {StockIntelligence, StockIntelligenceMetrics} from './types';
const preservedMarketKeys = [
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
] as const;
export function recalculatePrepared(
  input: PreparedInput,
  previous: StockIntelligence | null,
  asOf: string,
  sec?: SavedSecEvidence,
) {
  const now = Date.parse(asOf);
  if (!Number.isFinite(now)) throw new Error('Invalid recalculation date.');
  if (![2, 3, 4].includes(input.calculationVersion))
    throw new Error('Only frozen calculation versions 2, 3 and 4 are supported.');
  if (
    !input.metrics ||
    !input.company ||
    !input.financials ||
    ![input.financials.income, input.financials.balanceSheet, input.financials.cashFlow].every(
      Array.isArray,
    )
  )
    throw new Error('Saved financial inputs are incomplete.');
  const original = input.metrics;
  const observations = input.sourceObservations;
  const retainedQuote = observations
    ? {...observations.quote, currency: observations.profile.currency}
    : {
        price: original.price,
        marketCap: original.marketCap,
        currency: original.dataQuality?.quoteCurrency,
      };
  const metrics = buildScorecardMetrics(
    input.financials,
    retainedQuote,
    {},
    observations?.history ?? [],
    input.estimates,
    now,
  );
  if (!observations) for (const key of preservedMarketKeys) metrics[key] = original[key] ?? null;
  else
    for (const key of ['priceAvg50', 'priceAvg200', 'yearHigh', 'yearLow'] as const)
      metrics[key] ??= original[key];
  const priceAsOf = observations
    ? (metrics.dataQuality?.priceAsOf ?? null)
    : (original.dataQuality?.priceAsOf ?? null);
  const priceAge = priceAsOf ? (now - Date.parse(priceAsOf)) / 86400000 : NaN;
  if (metrics.dataQuality) {
    metrics.dataQuality.priceAsOf = priceAsOf;
    metrics.dataQuality.priceAgeDays =
      Number.isFinite(priceAge) && priceAge >= 0 ? Math.floor(priceAge) : null;
  }
  if (sec) supplementSecMetrics(metrics, sec, asOf);
  const limitations = [
    ...(metrics.dataQuality?.warnings ?? []),
    ...(observations
      ? ['saved_quote_indicator_fallbacks_may_be_reused']
      : ['market_metrics_reused_without_raw_history']),
    'absolute_scores_only_peers_require_full_universe_recalculation',
    'source_financials_not_independently_verified',
    'preview_only_not_publishable',
  ];
  if (
    input.company.marketCap !== metrics.marketCap ||
    input.company.price !== metrics.price ||
    (input.momentum &&
      (input.momentum.price !== metrics.price ||
        input.momentum.yearHigh !== metrics.yearHigh ||
        input.momentum.yearLow !== metrics.yearLow))
  )
    limitations.push('saved_quote_observations_disagree');
  if (metrics.return3m !== null && metrics.return3m === metrics.return12m)
    limitations.push('equal_three_and_twelve_month_returns_review_history');
  const normalizedCompany = {
    ...input.company,
    marketCap: metrics.marketCap,
    price: metrics.price,
    currency: metrics.dataQuality?.quoteCurrency ?? null,
  };
  const normalizedMomentum = input.momentum
    ? {
        ...input.momentum,
        price: metrics.price,
        yearHigh: metrics.yearHigh,
        yearLow: metrics.yearLow,
        sma50: metrics.priceAvg50,
        sma200: metrics.priceAvg200,
        return1M: metrics.return1m,
        return3M: metrics.return3m,
        return6M: metrics.return6m,
        return12M: metrics.return12m,
      }
    : null;
  const beta = input.risk?.volatility?.beta ?? null;
  const volatility = observations
    ? calculateVolatilityScore({
        beta,
        historicalPrices: ordered(observations.history)
          .slice(0, 253)
          .map((row) => ({date: String(row.date), close: field(row, 'close') ?? NaN})),
      })
    : scoreVolatilityEvidence(beta, input.risk?.volatility?.annualizedVolatility ?? null);
  if (!observations) limitations.push('volatility_rescored_from_retained_summary');
  const risk = calculateRiskScore({
    volatilityScore: volatility.score,
    beta: input.risk?.volatility?.beta ?? null,
    marketCap: metrics.dataQuality?.quoteCurrency === 'USD' ? metrics.marketCap : null,
    debtToEquity: metrics.debtToEquity,
    currentRatio: metrics.currentRatio,
    netMargin: metrics.netMargin,
    freeCashFlow: metrics.freeCashFlow,
    peRatio: metrics.pe,
    priceToSalesRatio: metrics.priceToSales,
  });
  const recalculated = calculateScorecard(
    input.symbol,
    metrics,
    {
      riskScore: risk.score,
      riskCoverage: risk.coverage,
      volatilityScore: volatility.score,
      volatilityCoverage: volatility.coverage,
    },
    input.financials,
  );
  const prepared: PreparedInput = {
    ...input,
    calculationVersion: CALCULATION_VERSION,
    company: normalizedCompany,
    momentum: normalizedMomentum,
    metrics,
    risk: {
      ...input.risk,
      riskScore: risk.score,
      riskLevel: risk.level,
      riskCoverage: risk.coverage,
      riskConfidence: risk.confidence,
      riskComponents: risk.components,
      volatilityScore: volatility.score,
      volatilityCoverage: volatility.coverage,
      volatilityConfidence: volatility.confidence,
      volatility: {beta: volatility.beta, annualizedVolatility: volatility.annualizedVolatility},
    },
  };
  const lists = Object.fromEntries(
    intelligenceCalculators.map((calculator) => [calculator.id, calculator.calculate(prepared)]),
  );
  const cashFlowRows = ordered(input.financials.cashFlow).map((row) => {
    const operatingCashFlow = field(
      row,
      'operatingCashFlow',
      'netCashProvidedByOperatingActivities',
    );
    const capitalExpenditure = field(row, 'capitalExpenditure');
    const reportedFreeCashFlow = field(row, 'freeCashFlow');
    const calculatedFreeCashFlow =
      operatingCashFlow !== null && capitalExpenditure !== null
        ? operatingCashFlow - Math.abs(capitalExpenditure)
        : null;
    return {
      date: row.date,
      period: row.period ?? null,
      currency: row.reportedCurrency ?? null,
      operatingCashFlow,
      capitalExpenditure,
      reportedFreeCashFlow,
      calculatedFreeCashFlow,
      identityMatches:
        reportedFreeCashFlow === null || calculatedFreeCashFlow === null
          ? null
          : Math.abs(reportedFreeCashFlow - calculatedFreeCashFlow) <=
            Math.max(1, Math.abs(calculatedFreeCashFlow) * 0.000001),
    };
  });
  const changes = Object.fromEntries(
    Object.entries(recalculated.scores).map(([key, result]) => [
      key,
      {
        before: previous?.scores?.[key as keyof StockIntelligence['scores']]?.score ?? null,
        after: result.score,
        coverage: result.coverage,
        reasons: result.reasons ?? [],
      },
    ]),
  );
  const metricChanges = Object.fromEntries(
    Object.entries(metrics)
      .filter(([, value]) => typeof value === 'number' || value === null)
      .filter(([key, value]) => original[key as keyof StockIntelligenceMetrics] !== value)
      .map(([key, value]) => [
        key,
        {before: original[key as keyof StockIntelligenceMetrics] ?? null, after: value},
      ]),
  );
  return {
    symbol: input.symbol,
    sourceCalculationVersion: input.calculationVersion,
    calculationVersion: CALCULATION_VERSION,
    asOf,
    published: false,
    limitations: [...new Set(limitations)],
    changes,
    metricChanges,
    recalculated,
    lists,
    normalizedCompany,
    normalizedMomentum,
    normalizedInput: prepared,
    cashFlowRows,
  };
}
