import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import {buildScorecardMetrics} from '../scorecard-metrics';
import type {StockIntelligenceMetrics} from '../types';
import type {IntelligenceCalculatorResult} from './calculator.type';
import {scoreList} from './smart-list-scoring';
export type UndervaluedResult = IntelligenceCalculatorResult;
export function calculateUndervalued(
  financials: FmpFinancialStatements,
  marketCap: number | null,
  metrics: StockIntelligenceMetrics = buildScorecardMetrics(financials, {marketCap}),
): UndervaluedResult {
  const earnings = [
    {value: 8, score: 10},
    {value: 15, score: 8},
    {value: 25, score: 5},
    {value: 50, score: 1},
  ];
  return scoreList(
    metrics,
    [
      {key: 'pe', weight: 0.25, thresholds: earnings},
      {key: 'forwardPe', weight: 0.15, thresholds: earnings},
      {
        key: 'evToEbitda',
        weight: 0.2,
        thresholds: [
          {value: 5, score: 10},
          {value: 10, score: 8},
          {value: 20, score: 4},
          {value: 40, score: 1},
        ],
      },
      {
        key: 'fcfYield',
        weight: 0.3,
        thresholds: [
          {value: 0, score: 1},
          {value: 3, score: 5},
          {value: 6, score: 8},
          {value: 10, score: 10},
        ],
      },
      {
        key: 'priceToSales',
        weight: 0.1,
        thresholds: [
          {value: 1, score: 10},
          {value: 3, score: 7},
          {value: 8, score: 3},
          {value: 15, score: 1},
        ],
      },
    ],
    [
      [metrics.netIncomeTtm !== null && metrics.netIncomeTtm > 0, 'positive_earnings_required'],
      [metrics.freeCashFlow !== null && metrics.freeCashFlow > 0, 'positive_cash_flow_required'],
      [metrics.dataQuality?.currencyComparable === true, 'valuation_currency_unverified'],
    ],
  );
}
