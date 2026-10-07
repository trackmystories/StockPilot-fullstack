import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import {buildScorecardMetrics} from '../scorecard-metrics';
import type {StockIntelligenceMetrics} from '../types';

export type InvestorSignals = {
  earningsQuality: {
    cashConversionTtm: number | null;
    accrualRatioTtm: number | null;
    fcfConversionTtm: number | null;
    operatingMarginChangeYoY: number | null;
  };
  capitalEfficiency: {
    roicTtm: number | null;
    incrementalRoicYoY: number | null;
    capexIntensityTtm: number | null;
    revenueToInvestedCapital: number | null;
    roicMethod: string;
  };
  growthMomentum: {
    revenueGrowthYoY: number | null;
    revenueGrowthTtm: number | null;
    revenueAcceleration: number | null;
    operatingMarginChangeYoY: number | null;
  };
  fundingRisk: {
    cashRunwayQuarters: number | null;
    netDebt: number | null;
    currentRatio: number | null;
    interestCoverage: number | null;
    netDebtToEbitda: number | null;
    debtGrowthYoY: number | null;
    cashToShortTermDebt: number | null;
    dilutedShareGrowthYoY: number | null;
    netStockIssuanceTtm: number | null;
  };
};
export function calculateInvestorSignals(
  financials: FmpFinancialStatements,
  m: StockIntelligenceMetrics = buildScorecardMetrics(financials),
): InvestorSignals {
  return {
    earningsQuality: {
      cashConversionTtm: m.cashConversion,
      accrualRatioTtm: m.accrualRatio,
      fcfConversionTtm: m.fcfConversion,
      operatingMarginChangeYoY: m.operatingMarginChangeYoY,
    },
    capitalEfficiency: {
      roicTtm: m.roic,
      incrementalRoicYoY: m.incrementalRoic,
      capexIntensityTtm: m.capexIntensity,
      revenueToInvestedCapital: m.revenueToInvestedCapital,
      roicMethod: 'TTM_NOPAT_AVERAGE_INVESTED_CAPITAL',
    },
    growthMomentum: {
      revenueGrowthYoY: m.revenueGrowthYoY,
      revenueGrowthTtm: m.revenueGrowthTtm,
      revenueAcceleration: m.revenueAcceleration,
      operatingMarginChangeYoY: m.operatingMarginChangeYoY,
    },
    fundingRisk: {
      cashRunwayQuarters: m.cashRunwayQuarters,
      netDebt: m.netDebt,
      currentRatio: m.currentRatio,
      interestCoverage: m.interestCoverage,
      netDebtToEbitda: m.netDebtToEbitda,
      debtGrowthYoY: m.debtGrowthYoY,
      cashToShortTermDebt: m.cashToShortTermDebt,
      dilutedShareGrowthYoY: m.dilutedShareGrowthYoY,
      netStockIssuanceTtm: m.netStockIssuance,
    },
  };
}
