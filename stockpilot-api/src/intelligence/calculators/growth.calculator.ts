import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

const growthThresholds = [
  {value: -30, score: 1},
  {value: -10, score: 2},
  {value: 0, score: 3},
  {value: 5, score: 4.5},
  {value: 10, score: 6},
  {value: 20, score: 7.5},
  {value: 30, score: 8.5},
  {value: 50, score: 10},
];
export function calculateGrowthScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const revenueYoY = scoreMetric(metrics, 'revenueGrowthYoY', growthThresholds);
  const revenueCagr = scoreMetric(metrics, 'revenueCagr3Y', growthThresholds);
  const epsYoY = scoreMetric(metrics, 'epsGrowthYoY', growthThresholds);
  const epsCagr = scoreMetric(metrics, 'epsCagr3Y', growthThresholds);
  const forwardRevenue = scoreMetric(metrics, 'forwardRevenueGrowth', growthThresholds);
  const forwardEps = scoreMetric(metrics, 'forwardEpsGrowth', growthThresholds);
  const acceleration = scoreMetric(metrics, 'revenueAcceleration', [
    {value: -30, score: 1},
    {value: -15, score: 2},
    {value: -5, score: 4},
    {value: 0, score: 5},
    {value: 5, score: 7},
    {value: 15, score: 9},
    {value: 30, score: 10},
  ]);
  const consistency = scoreMetric(metrics, 'revenueGrowthConsistency', [
    {value: 0, score: 1},
    {value: 25, score: 3},
    {value: 50, score: 5},
    {value: 70, score: 7},
    {value: 85, score: 9},
    {value: 100, score: 10},
  ]);
  return calculateWeightedScore([
    {name: 'revenueGrowthYoY', rawValue: metrics.revenueGrowthYoY, score: revenueYoY, weight: 0.15},
    {name: 'revenueCagr3Y', rawValue: metrics.revenueCagr3Y, score: revenueCagr, weight: 0.1},
    {name: 'epsGrowthYoY', rawValue: metrics.epsGrowthYoY, score: epsYoY, weight: 0.15},
    {name: 'epsCagr3Y', rawValue: metrics.epsCagr3Y, score: epsCagr, weight: 0.1},
    {
      name: 'forwardRevenueGrowth',
      coverage: metrics.analystCount === null ? 0 : Math.min(1, Math.max(0, metrics.analystCount) / 5),
      rawValue: metrics.forwardRevenueGrowth,
      score: forwardRevenue,
      weight: 0.15,
    },
    {
      name: 'forwardEpsGrowth',
      coverage: metrics.analystCount === null ? 0 : Math.min(1, Math.max(0, metrics.analystCount) / 5),
      rawValue: metrics.forwardEpsGrowth,
      score: forwardEps,
      weight: 0.15,
    },
    {name: 'revenueAcceleration', rawValue: metrics.revenueAcceleration, score: acceleration, weight: 0.1},
    {name: 'growthConsistency', rawValue: metrics.revenueGrowthConsistency, score: consistency, weight: 0.1},
  ]);
}
