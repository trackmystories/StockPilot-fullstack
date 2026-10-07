import {calculateWeightedScore} from '../scoring';
export type HistoricalPricePoint = {date: string; close: number};
export type VolatilityScoreInput = {beta: number | null; historicalPrices: HistoricalPricePoint[]};
export type VolatilityScoreResult = {
  score: number | null;
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  beta: number | null;
  betaScore: number;
  annualizedVolatility: number | null;
  realizedVolatilityScore: number;
};
function calculateStandardDeviation(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => {
      const difference = value - mean;
      return sum + difference ** 2;
    }, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}
function mapBetaToScore(beta: number | null): number {
  if (beta === null || Number.isNaN(beta)) {
    return 5;
  }
  const absoluteBeta = Math.abs(beta);
  if (absoluteBeta < 0.7) {
    return 2;
  }
  if (absoluteBeta < 1) {
    return 4;
  }
  if (absoluteBeta < 1.3) {
    return 5;
  }
  if (absoluteBeta < 1.6) {
    return 7;
  }
  if (absoluteBeta < 2) {
    return 8;
  }
  return 10;
}
function mapAnnualizedVolatilityToScore(volatility: number | null): number {
  if (volatility === null || Number.isNaN(volatility)) {
    return 5;
  }
  if (volatility < 0.15) {
    return 2;
  }
  if (volatility < 0.25) {
    return 4;
  }
  if (volatility < 0.35) {
    return 5;
  }
  if (volatility < 0.5) {
    return 7;
  }
  if (volatility < 0.7) {
    return 8;
  }
  return 10;
}
export function calculateRealizedVolatility(historicalPrices: HistoricalPricePoint[]): number | null {
  if (historicalPrices.length < 61) {
    return null;
  }
  const sorted = [
    ...new Map(
      historicalPrices
        .filter((row) => row.close > 0 && Number.isFinite(row.close) && Number.isFinite(Date.parse(row.date)))
        .map((row) => [row.date, row]),
    ).values(),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dailyReturns: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previousClose = sorted[index - 1]?.close;
    const currentClose = sorted[index]?.close;
    if (previousClose === undefined || currentClose === undefined || previousClose <= 0) {
      continue;
    }
    if ((Date.parse(sorted[index].date) - Date.parse(sorted[index - 1].date)) / 86400000 > 7) continue;
    dailyReturns.push(Math.log(currentClose / previousClose));
  }
  if (dailyReturns.length < 60) return null;
  const dailyStandardDeviation = calculateStandardDeviation(dailyReturns);
  if (dailyStandardDeviation === null) {
    return null;
  }
  return dailyStandardDeviation * Math.sqrt(252);
}
export function calculateVolatilityScore({beta, historicalPrices}: VolatilityScoreInput): VolatilityScoreResult {
  return scoreVolatilityEvidence(beta, calculateRealizedVolatility(historicalPrices));
}
export function scoreVolatilityEvidence(beta: number | null, realizedVolatility: number | null): VolatilityScoreResult {
  beta = beta !== null && Number.isFinite(beta) ? beta : null;
  realizedVolatility =
    realizedVolatility !== null && Number.isFinite(realizedVolatility) && realizedVolatility >= 0
      ? realizedVolatility
      : null;
  const betaScore = mapBetaToScore(beta);
  const realizedVolatilityScore = mapAnnualizedVolatilityToScore(realizedVolatility);
  const result = calculateWeightedScore(
    [
      {name: 'beta', rawValue: beta, score: beta !== null && Number.isFinite(beta) ? betaScore : null, weight: 0.2},
      {
        name: 'realizedVolatility',
        rawValue: realizedVolatility,
        score: realizedVolatility === null ? null : realizedVolatilityScore,
        weight: 0.8,
      },
    ],
    'higher_is_riskier',
  );
  return {
    score: result.score,
    coverage: result.coverage,
    confidence: result.confidence,
    beta,
    betaScore,
    annualizedVolatility: realizedVolatility,
    realizedVolatilityScore,
  };
}
