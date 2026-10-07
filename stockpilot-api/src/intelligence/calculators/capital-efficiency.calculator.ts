import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateCapitalEfficiencyScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const roic = scoreMetric(metrics, 'roic', [
    {value: 0, score: 2},
    {value: 5, score: 4},
    {value: 10, score: 6},
    {value: 15, score: 7.5},
    {value: 20, score: 8.5},
    {value: 30, score: 10},
  ]);
  const incrementalRoic = scoreMetric(metrics, 'incrementalRoic', [
    {value: -20, score: 1},
    {value: 0, score: 3},
    {value: 10, score: 5},
    {value: 20, score: 7},
    {value: 40, score: 9},
    {value: 60, score: 10},
  ]);
  const revenueCapital = scoreMetric(metrics, 'revenueToInvestedCapital', [
    {value: 0, score: 1},
    {value: 0.5, score: 3},
    {value: 1, score: 5},
    {value: 2, score: 7},
    {value: 3, score: 9},
    {value: 4, score: 10},
  ]);
  const capex = scoreMetric(metrics, 'capexIntensity', [
    {value: 0, score: 9},
    {value: 5, score: 8},
    {value: 10, score: 6},
    {value: 20, score: 4},
    {value: 40, score: 2},
    {value: 60, score: 1},
  ]);
  return calculateWeightedScore([
    {name: 'roic', rawValue: metrics.roic, score: roic, weight: 0.4},
    {name: 'incrementalRoic', rawValue: metrics.incrementalRoic, score: incrementalRoic, weight: 0.3},
    {name: 'revenueToInvestedCapital', rawValue: metrics.revenueToInvestedCapital, score: revenueCapital, weight: 0.2},
    {name: 'capexIntensity', rawValue: metrics.capexIntensity, score: capex, weight: 0.1},
  ]);
}
