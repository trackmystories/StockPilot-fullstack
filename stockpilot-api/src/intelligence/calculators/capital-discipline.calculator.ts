import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateCapitalDisciplineScore(metrics: StockIntelligenceMetrics): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'roic',
      rawValue: metrics.roic,
      score: scoreMetric(metrics, 'roic', [
        {value: 0, score: 2},
        {value: 10, score: 6},
        {value: 20, score: 9},
        {value: 30, score: 10},
      ]),
      weight: 0.3,
    },
    {
      name: 'incrementalRoic',
      rawValue: metrics.incrementalRoic,
      score: scoreMetric(metrics, 'incrementalRoic', [
        {value: -20, score: 1},
        {value: 0, score: 3},
        {value: 20, score: 7},
        {value: 40, score: 9},
        {value: 60, score: 10},
      ]),
      weight: 0.25,
    },
    {
      name: 'capexIntensity',
      rawValue: metrics.capexIntensity,
      score: scoreMetric(metrics, 'capexIntensity', [
        {value: 0, score: 9},
        {value: 10, score: 7},
        {value: 20, score: 5},
        {value: 40, score: 2},
      ]),
      weight: 0.15,
    },
    {
      name: 'debtGrowth',
      rawValue: metrics.debtGrowthYoY,
      score: scoreMetric(metrics, 'debtGrowthYoY', [
        {value: -30, score: 10},
        {value: 0, score: 7},
        {value: 20, score: 4},
        {value: 50, score: 1},
      ]),
      weight: 0.15,
    },
    {
      name: 'shareIssuance',
      rawValue: metrics.dilutedShareGrowthYoY,
      score: scoreMetric(metrics, 'dilutedShareGrowthYoY', [
        {value: -10, score: 10},
        {value: 0, score: 8},
        {value: 5, score: 5},
        {value: 15, score: 2},
        {value: 30, score: 1},
      ]),
      weight: 0.15,
    },
  ]);
}
