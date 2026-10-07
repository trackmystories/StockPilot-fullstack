import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import {buildScorecardMetrics} from '../scorecard-metrics';
import type {StockIntelligenceMetrics} from '../types';
import type {IntelligenceCalculatorResult} from './calculator.type';
import {consistencyCurve, marginCurve, scoreList} from './smart-list-scoring';

export type HighQualityResult = IntelligenceCalculatorResult;
export function calculateHighQuality(
  financials: FmpFinancialStatements,
  metrics: StockIntelligenceMetrics = buildScorecardMetrics(financials),
): HighQualityResult {
  return scoreList(
    metrics,
    [
      {
        key: 'roic',
        weight: 0.25,
        thresholds: [
          {value: 0, score: 1},
          {value: 10, score: 6},
          {value: 20, score: 9},
          {value: 30, score: 10},
        ],
      },
      {key: 'operatingMargin', weight: 0.2, thresholds: marginCurve},
      {key: 'freeCashFlowMargin', weight: 0.2, thresholds: marginCurve},
      {
        key: 'cashConversion',
        weight: 0.15,
        thresholds: [
          {value: 0, score: 1},
          {value: 0.8, score: 6},
          {value: 1.2, score: 10},
        ],
      },
      {key: 'profitabilityConsistency', weight: 0.1, thresholds: consistencyCurve},
      {key: 'positiveFcfQuarters', weight: 0.1, thresholds: consistencyCurve},
    ],
    [
      [metrics.operatingMargin !== null && metrics.operatingMargin > 0, 'positive_operating_margin_required'],
      [metrics.freeCashFlow !== null && metrics.freeCashFlow > 0, 'positive_cash_flow_required'],
    ],
  );
}
