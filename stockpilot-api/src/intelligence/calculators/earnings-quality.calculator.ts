import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateEarningsQualityScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const cashConversion = scoreMetric(metrics, 'cashConversion', [
    {value: 0, score: 1},
    {value: 0.5, score: 4},
    {value: 0.8, score: 6},
    {value: 1, score: 8},
    {value: 1.3, score: 10},
  ]);
  const fcfConversion = scoreMetric(metrics, 'fcfConversion', [
    {value: 0, score: 1},
    {value: 0.4, score: 4},
    {value: 0.7, score: 6},
    {value: 1, score: 8},
    {value: 1.3, score: 10},
  ]);
  const accrual = scoreMetric(metrics, 'accrualRatio', [
    {value: -20, score: 10},
    {value: -10, score: 9},
    {value: 0, score: 7},
    {value: 5, score: 5},
    {value: 10, score: 3},
    {value: 20, score: 1},
  ]);
  const marginTrend = scoreMetric(metrics, 'operatingMarginChangeYoY', [
    {value: -10, score: 1},
    {value: -5, score: 3},
    {value: 0, score: 5},
    {value: 2, score: 7},
    {value: 5, score: 9},
    {value: 10, score: 10},
  ]);
  return calculateWeightedScore([
    {name: 'cashConversion', rawValue: metrics.cashConversion, score: cashConversion, weight: 0.3},
    {name: 'accrualRatio', rawValue: metrics.accrualRatio, score: accrual, weight: 0.25},
    {name: 'fcfConversion', rawValue: metrics.fcfConversion, score: fcfConversion, weight: 0.3},
    {name: 'marginTrend', rawValue: metrics.operatingMarginChangeYoY, score: marginTrend, weight: 0.15},
  ]);
}
