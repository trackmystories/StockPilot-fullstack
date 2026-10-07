import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';
export function calculateFundingPressureScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const runway =
    metrics.freeCashFlow !== null && metrics.freeCashFlow >= 0
      ? 1
      : scoreMetric(metrics, 'cashRunwayQuarters', [
          {value: 1, score: 10},
          {value: 2, score: 9},
          {value: 4, score: 7},
          {value: 8, score: 4},
          {value: 12, score: 2},
          {value: 20, score: 1},
        ]);
  const debtGrowth = scoreMetric(metrics, 'debtGrowthYoY', [
    {value: -30, score: 1},
    {value: 0, score: 3},
    {value: 10, score: 5},
    {value: 25, score: 7},
    {value: 50, score: 9},
    {value: 100, score: 10},
  ]);
  const shareGrowth = scoreMetric(metrics, 'dilutedShareGrowthYoY', [
    {value: -10, score: 1},
    {value: 0, score: 2},
    {value: 5, score: 4},
    {value: 10, score: 6},
    {value: 20, score: 8},
    {value: 40, score: 10},
  ]);
  const currentRatioRisk = scoreMetric(metrics, 'currentRatio', [
    {value: 0.2, score: 10},
    {value: 0.5, score: 9},
    {value: 1, score: 6},
    {value: 1.5, score: 3},
    {value: 2, score: 1},
  ]);
  return calculateWeightedScore(
    [
      {name: 'cashRunway', rawValue: metrics.cashRunwayQuarters, score: runway, weight: 0.3},
      {name: 'debtGrowth', rawValue: metrics.debtGrowthYoY, score: debtGrowth, weight: 0.2},
      {name: 'shareGrowth', rawValue: metrics.dilutedShareGrowthYoY, score: shareGrowth, weight: 0.25},
      {name: 'liquidity', rawValue: metrics.currentRatio, score: currentRatioRisk, weight: 0.25},
    ],
    'higher_is_riskier',
  );
}
