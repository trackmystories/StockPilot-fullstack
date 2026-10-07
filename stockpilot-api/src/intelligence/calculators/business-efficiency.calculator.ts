import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateBusinessEfficiencyScore(metrics: StockIntelligenceMetrics): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'revenueToInvestedCapital',
      rawValue: metrics.revenueToInvestedCapital,
      score: scoreMetric(metrics, 'revenueToInvestedCapital', [
        {value: 0, score: 1},
        {value: 0.5, score: 3},
        {value: 1, score: 5},
        {value: 2, score: 8},
        {value: 3, score: 10},
      ]),
      weight: 0.4,
    },
    {
      name: 'roic',
      rawValue: metrics.roic,
      score: scoreMetric(metrics, 'roic', [
        {value: 0, score: 2},
        {value: 10, score: 6},
        {value: 20, score: 9},
        {value: 30, score: 10},
      ]),
      weight: 0.35,
    },
    {
      name: 'operatingMargin',
      rawValue: metrics.operatingMargin,
      score: scoreMetric(metrics, 'operatingMargin', [
        {value: 0, score: 3},
        {value: 10, score: 6},
        {value: 20, score: 8},
        {value: 30, score: 10},
      ]),
      weight: 0.25,
    },
  ]);
}
