import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import {buildScorecardMetrics} from '../scorecard-metrics';
import type {StockIntelligenceMetrics} from '../types';
import type {IntelligenceCalculatorResult} from './calculator.type';
import {consistencyCurve, growthCurve, scoreList} from './smart-list-scoring';

export type HighGrowthResult = IntelligenceCalculatorResult;

export function calculateHighGrowth(
  financials: FmpFinancialStatements,
  metrics: StockIntelligenceMetrics = buildScorecardMetrics(financials),
): HighGrowthResult {
  return scoreList(
    metrics,
    [
      {key: 'revenueGrowthTtm', weight: 0.3, thresholds: growthCurve},
      {key: 'revenueCagr3Y', weight: 0.15, thresholds: growthCurve},
      {key: 'epsGrowthYoY', weight: 0.15, thresholds: growthCurve},
      {key: 'operatingIncomeGrowthYoY', weight: 0.1, thresholds: growthCurve},
      {key: 'forwardRevenueGrowth', weight: 0.1, thresholds: growthCurve},
      {key: 'revenueAcceleration', weight: 0.1, thresholds: growthCurve},
      {key: 'revenueGrowthConsistency', weight: 0.1, thresholds: consistencyCurve},
    ],
    [
      [metrics.revenueGrowthTtm !== null && metrics.revenueGrowthTtm >= 10, 'ttm_growth_below_10_percent'],
      [metrics.revenueGrowthYoY !== null && metrics.revenueGrowthYoY > 0, 'latest_revenue_must_grow'],
    ],
  );
}
