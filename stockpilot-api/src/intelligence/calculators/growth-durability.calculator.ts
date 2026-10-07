import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateGrowthDurabilityScore(metrics: StockIntelligenceMetrics): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'revenueGrowth',
      rawValue: metrics.revenueGrowthTtm,
      score: scoreMetric(metrics, 'revenueGrowthTtm', [
        {value: -20, score: 1},
        {value: 0, score: 3},
        {value: 10, score: 6},
        {value: 20, score: 8},
        {value: 40, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'consistency',
      rawValue: metrics.revenueGrowthConsistency,
      score: scoreMetric(metrics, 'revenueGrowthConsistency', [
        {value: 0, score: 1},
        {value: 50, score: 5},
        {value: 80, score: 8},
        {value: 100, score: 10},
      ]),
      weight: 0.15,
    },
    {
      name: 'fcfGrowth',
      rawValue: metrics.freeCashFlowGrowthYoY,
      score: scoreMetric(metrics, 'freeCashFlowGrowthYoY', [
        {value: -30, score: 1},
        {value: 0, score: 4},
        {value: 20, score: 8},
        {value: 40, score: 10},
      ]),
      weight: 0.2,
    },
    {
      name: 'marginTrend',
      rawValue: metrics.operatingMarginChangeYoY,
      score: scoreMetric(metrics, 'operatingMarginChangeYoY', [
        {value: -10, score: 1},
        {value: 0, score: 5},
        {value: 5, score: 9},
        {value: 10, score: 10},
      ]),
      weight: 0.2,
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
      weight: 0.2,
    },
  ]);
}
