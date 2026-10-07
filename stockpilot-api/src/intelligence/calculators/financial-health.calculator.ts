import {calculateWeightedScore, scoreMetric} from '../scoring';

import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateFinancialHealthScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const leverage = scoreMetric(metrics, 'netDebtToEbitda', [
    {value: -3, score: 10},
    {value: 0, score: 9},
    {value: 1, score: 8},
    {value: 2, score: 7},
    {value: 3, score: 5},
    {value: 4, score: 3},
    {value: 6, score: 1},
  ]);

  const interestCoverage =
    metrics.totalDebt === 0 && metrics.interestExpenseTtm === 0
      ? 10
      : scoreMetric(metrics, 'interestCoverage', [
          {value: 0, score: 1},
          {value: 1, score: 2},
          {value: 2, score: 4},
          {value: 4, score: 6},
          {value: 8, score: 8},
          {value: 15, score: 10},
        ]);

  const currentRatio = scoreMetric(metrics, 'currentRatio', [
    {value: 0.3, score: 1},
    {value: 0.7, score: 3},
    {value: 1, score: 5},
    {value: 1.5, score: 7},
    {value: 2, score: 9},
    {value: 3, score: 10},
  ]);

  const cashToDebt =
    metrics.shortTermDebt === 0 && metrics.cash !== null
      ? 10
      : scoreMetric(metrics, 'cashToShortTermDebt', [
          {value: 0, score: 1},
          {value: 0.5, score: 4},
          {value: 1, score: 6},
          {value: 2, score: 8},
          {value: 4, score: 10},
        ]);

  const debtTrend =
    metrics.totalDebt === 0
      ? 10
      : scoreMetric(metrics, 'debtGrowthYoY', [
          {value: -50, score: 10},
          {value: -20, score: 9},
          {value: 0, score: 7},
          {value: 10, score: 5},
          {value: 25, score: 3},
          {value: 50, score: 1},
        ]);

  const fcfStrength = scoreMetric(metrics, 'freeCashFlowMargin', [
    {value: -20, score: 1},
    {value: 0, score: 3},
    {value: 5, score: 5},
    {value: 10, score: 7},
    {value: 20, score: 9},
    {value: 30, score: 10},
  ]);

  return calculateWeightedScore([
    {name: 'netDebtToEbitda', rawValue: metrics.netDebtToEbitda, score: leverage, weight: 0.25},
    {name: 'interestCoverage', rawValue: metrics.interestCoverage, score: interestCoverage, weight: 0.2},
    {name: 'currentRatio', rawValue: metrics.currentRatio, score: currentRatio, weight: 0.15},
    {name: 'cashToShortTermDebt', rawValue: metrics.cashToShortTermDebt, score: cashToDebt, weight: 0.15},
    {name: 'freeCashFlowStrength', rawValue: metrics.freeCashFlowMargin, score: fcfStrength, weight: 0.15},
    {name: 'debtGrowthYoY', rawValue: metrics.debtGrowthYoY, score: debtTrend, weight: 0.1},
  ]);
}
