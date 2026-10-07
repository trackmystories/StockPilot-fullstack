import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import {buildScorecardMetrics} from '../scorecard-metrics';
import type {StockIntelligenceMetrics} from '../types';
import {calculateFinancialMetrics, type FinancialMetrics} from './financial-metrics.calculator';
export type FinanciallyStrongComponent = {name: string; value: number | null; score: number | null; weight: number};
export type FinanciallyStrongResult = {
  score: number;
  coverage: number;
  metrics: FinancialMetrics;
  components: FinanciallyStrongComponent[];
};
type Threshold = {min?: number; max?: number; score: number};
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};
const scoreHigherIsBetter = (value: number | null, thresholds: Threshold[]): number | null => {
  if (value === null) {
    return null;
  }
  for (const threshold of thresholds) {
    if (threshold.min !== undefined && value >= threshold.min) {
      return threshold.score;
    }
  }
  return 0;
};
const scoreLowerIsBetter = (value: number | null, thresholds: Threshold[]): number | null => {
  if (value === null) {
    return null;
  }
  for (const threshold of thresholds) {
    if (threshold.max !== undefined && value <= threshold.max) {
      return threshold.score;
    }
  }
  return 0;
};
const scoreOperatingMargin = (value: number | null): number | null => {
  return scoreHigherIsBetter(value, [
    {min: 25, score: 100},
    {min: 15, score: 85},
    {min: 10, score: 70},
    {min: 5, score: 55},
    {min: 0, score: 35},
  ]);
};
const scoreFreeCashFlowMargin = (value: number | null): number | null => {
  return scoreHigherIsBetter(value, [
    {min: 20, score: 100},
    {min: 15, score: 90},
    {min: 10, score: 80},
    {min: 5, score: 65},
    {min: 0, score: 40},
  ]);
};
const scoreFreeCashFlow = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }
  return value > 0 ? 100 : 0;
};
const scoreCurrentRatio = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }
  if (value >= 1.5 && value <= 3) {
    return 100;
  }
  if (value >= 1.2) {
    return 85;
  }
  if (value >= 1) {
    return 65;
  }
  if (value >= 0.8) {
    return 40;
  }
  return 10;
};
const scoreInterestCoverage = (value: number | null): number | null => {
  return scoreHigherIsBetter(value, [
    {min: 10, score: 100},
    {min: 6, score: 90},
    {min: 4, score: 75},
    {min: 2, score: 55},
    {min: 1, score: 30},
  ]);
};
const scoreNetDebtToEbitda = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }
  if (value <= 0) {
    return 100;
  }
  return scoreLowerIsBetter(value, [
    {max: 0.5, score: 95},
    {max: 1, score: 85},
    {max: 2, score: 70},
    {max: 3, score: 50},
    {max: 4, score: 30},
  ]);
};
const scoreRevenueGrowth = (value: number | null): number | null => {
  return scoreHigherIsBetter(value, [
    {min: 20, score: 100},
    {min: 10, score: 85},
    {min: 5, score: 70},
    {min: 0, score: 55},
    {min: -5, score: 30},
  ]);
};
const scoreRevenueAcceleration = (value: number | null): number | null => {
  return scoreHigherIsBetter(value, [
    {min: 10, score: 100},
    {min: 5, score: 85},
    {min: 0, score: 70},
    {min: -5, score: 45},
    {min: -10, score: 25},
  ]);
};
const scoreDilution = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }
  if (value <= 0) {
    return 100;
  }
  return scoreLowerIsBetter(value, [
    {max: 1, score: 90},
    {max: 3, score: 75},
    {max: 5, score: 55},
    {max: 10, score: 25},
  ]);
};
const calculateWeightedScore = (components: FinanciallyStrongComponent[]): {score: number; coverage: number} => {
  const available = components.filter(
    (component): component is FinanciallyStrongComponent & {score: number} => component.score !== null,
  );
  const totalPossibleWeight = components.reduce((total, component) => total + component.weight, 0);
  const availableWeight = available.reduce((total, component) => total + component.weight, 0);
  if (totalPossibleWeight === 0 || availableWeight === 0) {
    return {score: 0, coverage: 0};
  }
  const weightedTotal = available.reduce((total, component) => total + component.score * component.weight, 0);
  const score = weightedTotal / availableWeight;
  const coverage = (availableWeight / totalPossibleWeight) * 100;
  return {score: Math.round(clamp(score, 0, 100) * 10) / 10, coverage: Math.round(coverage * 10) / 10};
};
export function calculateFinanciallyStrong(
  financials: FmpFinancialStatements,
  normalized: StockIntelligenceMetrics = buildScorecardMetrics(financials),
): FinanciallyStrongResult {
  const metrics = calculateFinancialMetrics(financials, normalized);
  const components: FinanciallyStrongComponent[] = [
    {
      name: 'Operating margin',
      value: metrics.profitability.operatingMarginTtm,
      score: scoreOperatingMargin(metrics.profitability.operatingMarginTtm),
      weight: 15,
    },
    {
      name: 'Free cash flow margin',
      value: metrics.cashFlow.freeCashFlowMargin,
      score: scoreFreeCashFlowMargin(metrics.cashFlow.freeCashFlowMargin),
      weight: 15,
    },
    {
      name: 'Positive free cash flow',
      value: metrics.cashFlow.freeCashFlowTtm,
      score: scoreFreeCashFlow(metrics.cashFlow.freeCashFlowTtm),
      weight: 10,
    },
    {
      name: 'Current ratio',
      value: metrics.balanceSheet.currentRatio,
      score: scoreCurrentRatio(metrics.balanceSheet.currentRatio),
      weight: 10,
    },
    {
      name: 'Interest coverage',
      value: metrics.balanceSheet.interestCoverage,
      score: scoreInterestCoverage(metrics.balanceSheet.interestCoverage),
      weight: 15,
    },
    {
      name: 'Net debt to EBITDA',
      value: metrics.balanceSheet.netDebtToEbitda,
      score: scoreNetDebtToEbitda(metrics.balanceSheet.netDebtToEbitda),
      weight: 15,
    },
    {
      name: 'Revenue growth',
      value: metrics.growth.revenueGrowthTtm,
      score: scoreRevenueGrowth(metrics.growth.revenueGrowthTtm),
      weight: 10,
    },
    {
      name: 'Revenue acceleration',
      value: metrics.growth.revenueAcceleration,
      score: scoreRevenueAcceleration(metrics.growth.revenueAcceleration),
      weight: 5,
    },
    {
      name: 'Share dilution',
      value: metrics.dilution.dilutedShareGrowthYoY,
      score: scoreDilution(metrics.dilution.dilutedShareGrowthYoY),
      weight: 5,
    },
  ];
  const {score, coverage} = calculateWeightedScore(components);
  return {score, coverage, metrics, components};
}
