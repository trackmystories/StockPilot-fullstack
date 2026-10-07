import {calculateWeightedScore, scoreByThresholds, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';
function percentageAbove(price: number | null, average: number | null): number | null {
  if (price === null || average === null || average === 0) {
    return null;
  }
  return ((price - average) / average) * 100;
}
const returnThresholds = [
  {value: -50, score: 1},
  {value: -20, score: 2},
  {value: -5, score: 4},
  {value: 0, score: 5},
  {value: 10, score: 6.5},
  {value: 20, score: 7.5},
  {value: 40, score: 9},
  {value: 70, score: 10},
];
export function calculateMomentumScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const above50 = percentageAbove(metrics.price, metrics.priceAvg50);
  const above200 = percentageAbove(metrics.price, metrics.priceAvg200);
  const return1m = scoreMetric(metrics, 'return1m', returnThresholds);
  const return3m = scoreMetric(metrics, 'return3m', returnThresholds);
  const return6m = scoreMetric(metrics, 'return6m', returnThresholds);
  const return12m = scoreMetric(metrics, 'return12m', returnThresholds);
  const trend50 = scoreByThresholds(above50, [
    {value: -30, score: 1},
    {value: -10, score: 3},
    {value: 0, score: 5},
    {value: 10, score: 7},
    {value: 20, score: 9},
    {value: 40, score: 10},
  ]);
  const trend200 = scoreByThresholds(above200, [
    {value: -40, score: 1},
    {value: -15, score: 3},
    {value: 0, score: 5},
    {value: 15, score: 7},
    {value: 30, score: 9},
    {value: 60, score: 10},
  ]);
  return calculateWeightedScore([
    {name: 'return1m', rawValue: metrics.return1m, score: return1m, weight: 0.05},
    {name: 'return3m', rawValue: metrics.return3m, score: return3m, weight: 0.2},
    {name: 'return6m', rawValue: metrics.return6m, score: return6m, weight: 0.25},
    {name: 'return12m', rawValue: metrics.return12m, score: return12m, weight: 0.2},
    {name: 'priceVs50Day', rawValue: above50, score: trend50, weight: 0.1},
    {name: 'priceVs200Day', rawValue: above200, score: trend200, weight: 0.2},
  ]);
}
