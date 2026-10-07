import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateCashPowerScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const fcfMarginScore = scoreMetric(metrics, 'freeCashFlowMargin', [
    {value: -20, score: 1},
    {value: 0, score: 3},
    {value: 5, score: 5},
    {value: 10, score: 7},
    {value: 20, score: 9},
    {value: 30, score: 10},
  ]);
  const fcfGrowthScore = scoreMetric(metrics, 'freeCashFlowGrowthYoY', [
    {value: -50, score: 1},
    {value: -20, score: 2},
    {value: 0, score: 4},
    {value: 10, score: 6},
    {value: 20, score: 8},
    {value: 40, score: 10},
  ]);
  const cashConversionScore = scoreMetric(metrics, 'cashConversion', [
    {value: 0, score: 1},
    {value: 0.5, score: 4},
    {value: 0.8, score: 6},
    {value: 1, score: 8},
    {value: 1.25, score: 9},
    {value: 1.5, score: 10},
  ]);
  const fcfConversionScore = scoreMetric(metrics, 'fcfConversion', [
    {value: 0, score: 1},
    {value: 0.4, score: 4},
    {value: 0.7, score: 6},
    {value: 1, score: 8},
    {value: 1.3, score: 10},
  ]);
  return calculateWeightedScore([
    {name: 'freeCashFlowMargin', rawValue: metrics.freeCashFlowMargin, score: fcfMarginScore, weight: 0.25},
    {name: 'freeCashFlowGrowthYoY', rawValue: metrics.freeCashFlowGrowthYoY, score: fcfGrowthScore, weight: 0.2},
    {name: 'cashConversion', rawValue: metrics.cashConversion, score: cashConversionScore, weight: 0.2},
    {name: 'fcfConversion', rawValue: metrics.fcfConversion, score: fcfConversionScore, weight: 0.2},
    {
      name: 'positiveFcfQuarters',
      rawValue: metrics.positiveFcfQuarters,
      score: scoreMetric(metrics, 'positiveFcfQuarters', [
        {value: 0, score: 1},
        {value: 50, score: 4},
        {value: 75, score: 7},
        {value: 100, score: 10},
      ]),
      weight: 0.15,
    },
  ]);
}
