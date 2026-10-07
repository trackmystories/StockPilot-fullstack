import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';
export function calculateMarginPowerScore(metrics: StockIntelligenceMetrics): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'grossMargin',
      rawValue: metrics.grossMargin,
      score: scoreMetric(metrics, 'grossMargin', [
        {value: 0, score: 1},
        {value: 20, score: 4},
        {value: 40, score: 7},
        {value: 60, score: 9},
        {value: 80, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'grossMarginChange',
      rawValue: metrics.grossMarginChangeYoY,
      score: scoreMetric(metrics, 'grossMarginChangeYoY', [
        {value: -10, score: 1},
        {value: 0, score: 5},
        {value: 5, score: 9},
        {value: 10, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'operatingMargin',
      rawValue: metrics.operatingMargin,
      score: scoreMetric(metrics, 'operatingMargin', [
        {value: -20, score: 1},
        {value: 0, score: 3},
        {value: 10, score: 6},
        {value: 20, score: 8},
        {value: 30, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'operatingMarginChange',
      rawValue: metrics.operatingMarginChangeYoY,
      score: scoreMetric(metrics, 'operatingMarginChangeYoY', [
        {value: -10, score: 1},
        {value: 0, score: 5},
        {value: 5, score: 9},
        {value: 10, score: 10},
      ]),
      weight: 0.25,
    },
  ]);
}
