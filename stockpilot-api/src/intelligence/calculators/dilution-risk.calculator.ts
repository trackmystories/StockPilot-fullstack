import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateDilutionRiskScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const shareGrowth = scoreMetric(metrics, 'dilutedShareGrowthYoY', [
    {value: -10, score: 1},
    {value: 0, score: 2},
    {value: 5, score: 4},
    {value: 10, score: 6},
    {value: 20, score: 8},
    {value: 40, score: 10},
  ]);

  const issuance = scoreMetric(metrics, 'netStockIssuanceToRevenue', [
    {value: -10, score: 1},
    {value: 0, score: 3},
    {value: 5, score: 5},
    {value: 15, score: 7},
    {value: 30, score: 9},
    {value: 50, score: 10},
  ]);

  const runway =
    metrics.freeCashFlow !== null && metrics.freeCashFlow >= 0
      ? 1
      : scoreMetric(metrics, 'cashRunwayQuarters', [
          {value: 1, score: 10},
          {value: 4, score: 8},
          {value: 8, score: 5},
          {value: 12, score: 3},
          {value: 20, score: 1},
        ]);

  const fcfRisk = scoreMetric(metrics, 'freeCashFlowMargin', [
    {value: -50, score: 10},
    {value: -20, score: 8},
    {value: 0, score: 5},
    {value: 10, score: 2},
    {value: 20, score: 1},
  ]);
  return calculateWeightedScore(
    [
      {name: 'shareGrowth', rawValue: metrics.dilutedShareGrowthYoY, score: shareGrowth, weight: 0.35},
      {name: 'netStockIssuanceToRevenue', rawValue: metrics.netStockIssuanceToRevenue, score: issuance, weight: 0.2},
      {name: 'cashRunway', rawValue: metrics.cashRunwayQuarters, score: runway, weight: 0.2},
      {name: 'fcfRisk', rawValue: metrics.freeCashFlowMargin, score: fcfRisk, weight: 0.15},
      {
        name: 'stockBasedCompensationToRevenue',
        rawValue: metrics.stockBasedCompensationToRevenue,
        score: scoreMetric(metrics, 'stockBasedCompensationToRevenue', [
          {value: 0, score: 1},
          {value: 5, score: 4},
          {value: 15, score: 7},
          {value: 30, score: 10},
        ]),
        weight: 0.1,
      },
    ],
    'higher_is_riskier',
  );
}
