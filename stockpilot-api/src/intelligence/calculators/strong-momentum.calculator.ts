import type {StockIntelligenceMetrics} from '../types';
import type {MomentumData} from './calculator.type';
import {growthCurve, scoreList} from './smart-list-scoring';
type Metric = {score: number | null; weight: number};
export type StrongMomentumResult = {score: number; coverage: number};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const scoreReturn = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }
  if (value >= 0.5) return 100;
  if (value >= 0.3) return 90;
  if (value >= 0.2) return 80;
  if (value >= 0.1) return 70;
  if (value >= 0.05) return 60;
  if (value >= 0) return 50;
  if (value >= -0.1) return 35;
  if (value >= -0.2) return 20;
  return 5;
};
const scoreTrend = (price: number | null, sma50: number | null, sma200: number | null): number | null => {
  if (price === null || sma50 === null || sma200 === null) {
    return null;
  }
  if (price > sma50 && sma50 > sma200) {
    return 100;
  }
  if (price > sma50 && price > sma200) {
    return 80;
  }
  if (price > sma200) {
    return 60;
  }
  if (price > sma50) {
    return 40;
  }
  return 15;
};
const calculateWeightedScore = (metrics: Metric[]): StrongMomentumResult => {
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  const availableMetrics = metrics.filter((metric) => metric.score !== null);
  const availableWeight = availableMetrics.reduce((sum, metric) => sum + metric.weight, 0);
  if (availableWeight === 0) {
    return {score: 0, coverage: 0};
  }
  const weightedScore =
    availableMetrics.reduce((sum, metric) => sum + (metric.score ?? 0) * metric.weight, 0) / availableWeight;
  return {
    score: Math.round(clamp(weightedScore, 0, 100)),
    coverage: totalWeight > 0 ? Math.round((availableWeight / totalWeight) * 100) : 0,
  };
};
export const calculateStrongMomentum = (
  data: MomentumData | null,
  metrics?: StockIntelligenceMetrics,
): StrongMomentumResult => {
  if (metrics)
    return scoreList(
      metrics,
      [
        {key: 'return3m', weight: 0.3, thresholds: growthCurve},
        {key: 'return6m', weight: 0.35, thresholds: growthCurve},
        {key: 'return12m', weight: 0.35, thresholds: growthCurve},
      ],
      [
        [
          metrics.price !== null && metrics.priceAvg200 !== null && metrics.price > metrics.priceAvg200,
          'price_below_200_day_average',
        ],
        [metrics.return3m !== null && metrics.return3m > 0, 'positive_3m_return_required'],
      ],
    );
  if (!data) {
    return {score: 0, coverage: 0};
  }
  /*
   * We use:
   *
   * 1M  = 10%
   * 3M  = 25%
   * 6M  = 25%
   * 12M = 25%
   * Trend = 15%
   *
   * Sector-relative strength can be added
   * later once we introduce a reliable
   * sector benchmark mapping.
   */
  return calculateWeightedScore([
    {score: scoreReturn(data.return1M), weight: 0.1},
    {score: scoreReturn(data.return3M), weight: 0.25},
    {score: scoreReturn(data.return6M), weight: 0.25},
    {score: scoreReturn(data.return12M), weight: 0.25},
    {score: scoreTrend(data.price, data.sma50, data.sma200), weight: 0.15},
  ]);
};
