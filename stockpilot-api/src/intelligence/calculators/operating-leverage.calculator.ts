import {calculateWeightedScore, scoreByThresholds, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';
export function calculateOperatingLeverageScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const spread = metrics.incrementalOperatingMargin;
  const result = calculateWeightedScore([
    {
      name: 'operatingMarginChange',
      rawValue: metrics.operatingMarginChangeYoY,
      score: scoreMetric(metrics, 'operatingMarginChangeYoY', [
        {value: -10, score: 1},
        {value: 0, score: 5},
        {value: 5, score: 8},
        {value: 10, score: 10},
      ]),
      weight: 0.5,
    },
    {
      name: 'revenueGrowth',
      rawValue: metrics.revenueGrowthYoY,
      score: scoreMetric(metrics, 'revenueGrowthYoY', [
        {value: -20, score: 1},
        {value: 0, score: 3},
        {value: 10, score: 6},
        {value: 30, score: 9},
        {value: 50, score: 10},
      ]),
      weight: 0.3,
    },
    {
      name: 'incrementalOperatingMargin',
      rawValue: spread,
      score: scoreByThresholds(spread, [
        {value: -10, score: 1},
        {value: 0, score: 5},
        {value: 5, score: 8},
        {value: 10, score: 10},
      ]),
      weight: 0.2,
    },
  ]);
  const reasons = [...(result.reasons ?? [])];
  if (!Number.isFinite(metrics.operatingIncomeTtm) || metrics.operatingIncomeTtm === null)
    reasons.push('operating_income_required');
  else if (metrics.operatingIncomeTtm <= 0) reasons.push('positive_operating_income_required');
  if (spread !== null && Number.isFinite(spread) && spread <= 0)
    reasons.push('positive_incremental_operating_margin_required');
  return {
    ...result,
    score: reasons.length ? null : result.score,
    eligible: reasons.length === 0 && result.score !== null,
    reasons,
  };
}