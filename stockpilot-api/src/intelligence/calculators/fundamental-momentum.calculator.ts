import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';
export function calculateFundamentalMomentumScore(metrics: StockIntelligenceMetrics): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'revenueAcceleration',
      rawValue: metrics.revenueAcceleration,
      score: scoreMetric(metrics, 'revenueAcceleration', [
        {value: -20, score: 1},
        {value: 0, score: 5},
        {value: 10, score: 8},
        {value: 20, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'epsGrowth',
      rawValue: metrics.epsGrowthYoY,
      score: scoreMetric(metrics, 'epsGrowthYoY', [
        {value: -50, score: 1},
        {value: 0, score: 4},
        {value: 20, score: 7},
        {value: 50, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'marginChange',
      rawValue: metrics.operatingMarginChangeYoY,
      score: scoreMetric(metrics, 'operatingMarginChangeYoY', [
        {value: -10, score: 1},
        {value: 0, score: 5},
        {value: 5, score: 9},
        {value: 10, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'fcfGrowth',
      rawValue: metrics.freeCashFlowGrowthYoY,
      score: scoreMetric(metrics, 'freeCashFlowGrowthYoY', [
        {value: -50, score: 1},
        {value: 0, score: 4},
        {value: 20, score: 7},
        {value: 50, score: 10},
      ]),
      weight: 0.25,
    },
  ]);
}
