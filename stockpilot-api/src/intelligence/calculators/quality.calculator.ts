import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateQualityScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const roic = scoreMetric(metrics, 'roic', [
    {value: -10, score: 1},
    {value: 0, score: 2},
    {value: 5, score: 4},
    {value: 10, score: 6},
    {value: 15, score: 7.5},
    {value: 20, score: 8.5},
    {value: 30, score: 10},
  ]);
  const fcfMargin = scoreMetric(metrics, 'freeCashFlowMargin', [
    {value: -20, score: 1},
    {value: 0, score: 3},
    {value: 5, score: 5},
    {value: 10, score: 7},
    {value: 20, score: 9},
    {value: 30, score: 10},
  ]);
  const operatingMargin = scoreMetric(metrics, 'operatingMargin', [
    {value: -20, score: 1},
    {value: 0, score: 3},
    {value: 5, score: 4},
    {value: 10, score: 6},
    {value: 20, score: 8},
    {value: 30, score: 10},
  ]);
  const cashConversion = scoreMetric(metrics, 'cashConversion', [
    {value: 0, score: 1},
    {value: 0.5, score: 4},
    {value: 0.8, score: 6},
    {value: 1, score: 8},
    {value: 1.2, score: 9},
    {value: 1.5, score: 10},
  ]);
  const grossMargin = scoreMetric(metrics, 'grossMargin', [
    {value: 0, score: 2},
    {value: 10, score: 3},
    {value: 20, score: 4},
    {value: 30, score: 5.5},
    {value: 40, score: 7},
    {value: 50, score: 8.5},
    {value: 70, score: 10},
  ]);
  const consistency = scoreMetric(metrics, 'profitabilityConsistency', [
    {value: 0, score: 1},
    {value: 25, score: 3},
    {value: 50, score: 5},
    {value: 70, score: 7},
    {value: 85, score: 9},
    {value: 100, score: 10},
  ]);
  return calculateWeightedScore([
    {name: 'roic', rawValue: metrics.roic, score: roic, weight: 0.25},
    {name: 'freeCashFlowMargin', rawValue: metrics.freeCashFlowMargin, score: fcfMargin, weight: 0.2},
    {name: 'operatingMargin', rawValue: metrics.operatingMargin, score: operatingMargin, weight: 0.15},
    {name: 'cashConversion', rawValue: metrics.cashConversion, score: cashConversion, weight: 0.15},
    {name: 'profitabilityConsistency', rawValue: metrics.profitabilityConsistency, score: consistency, weight: 0.15},
    {name: 'grossMargin', rawValue: metrics.grossMargin, score: grossMargin, weight: 0.1},
  ]);
}
