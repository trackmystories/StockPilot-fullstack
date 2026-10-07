import {calculateWeightedScore, scoreMetric} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

export function calculateValuationScore(metrics: StockIntelligenceMetrics): ScoreResult {
  const pe = scoreMetric(metrics, 'pe', [
    {value: 5, score: 10},
    {value: 10, score: 9},
    {value: 15, score: 8},
    {value: 20, score: 7},
    {value: 30, score: 5},
    {value: 50, score: 3},
    {value: 80, score: 1},
  ]);
  const forwardPe = scoreMetric(metrics, 'forwardPe', [
    {value: 5, score: 10},
    {value: 10, score: 9},
    {value: 15, score: 8},
    {value: 20, score: 7},
    {value: 30, score: 5},
    {value: 50, score: 3},
    {value: 80, score: 1},
  ]);
  const evToEbitda = scoreMetric(metrics, 'evToEbitda', [
    {value: 3, score: 10},
    {value: 6, score: 9},
    {value: 10, score: 8},
    {value: 15, score: 6},
    {value: 20, score: 4},
    {value: 30, score: 2},
    {value: 50, score: 1},
  ]);
  const priceToSales = scoreMetric(metrics, 'priceToSales', [
    {value: 0.5, score: 10},
    {value: 1, score: 9},
    {value: 2, score: 8},
    {value: 4, score: 6},
    {value: 8, score: 4},
    {value: 15, score: 2},
    {value: 30, score: 1},
  ]);
  const priceToBook = scoreMetric(metrics, 'priceToBook', [
    {value: 0.5, score: 10},
    {value: 1, score: 9},
    {value: 2, score: 8},
    {value: 4, score: 6},
    {value: 8, score: 4},
    {value: 15, score: 2},
    {value: 30, score: 1},
  ]);
  const fcfYield = scoreMetric(metrics, 'fcfYield', [
    {value: -10, score: 1},
    {value: 0, score: 2},
    {value: 2, score: 4},
    {value: 4, score: 6},
    {value: 6, score: 8},
    {value: 10, score: 9},
    {value: 15, score: 10},
  ]);
  return calculateWeightedScore([
    {name: 'pe', rawValue: metrics.pe, score: pe, weight: 0.15},
    {name: 'forwardPe', rawValue: metrics.forwardPe, score: forwardPe, weight: 0.2},
    {name: 'evToEbitda', rawValue: metrics.evToEbitda, score: evToEbitda, weight: 0.2},
    {name: 'priceToSales', rawValue: metrics.priceToSales, score: priceToSales, weight: 0.05},
    {name: 'priceToBook', rawValue: metrics.priceToBook, score: priceToBook, weight: 0.05},
    {name: 'fcfYield', rawValue: metrics.fcfYield, score: fcfYield, weight: 0.25},
    {
      name: 'priceToFcf',
      rawValue: metrics.priceToFcf,
      score: scoreMetric(metrics, 'priceToFcf', [
        {value: 5, score: 10},
        {value: 10, score: 9},
        {value: 15, score: 8},
        {value: 20, score: 6},
        {value: 30, score: 4},
        {value: 50, score: 2},
        {value: 80, score: 1},
      ]),
      weight: 0.1,
    },
  ]);
}
