import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import {buildScorecardMetrics} from '../scorecard-metrics';
import type {StockIntelligenceMetrics} from '../types';

export type FinancialMetrics = {
  growth: {revenueGrowthYoY: number | null; revenueGrowthTtm: number | null; revenueAcceleration: number | null};
  profitability: {operatingMarginTtm: number | null};
  cashFlow: {freeCashFlowTtm: number | null; freeCashFlowMargin: number | null};
  balanceSheet: {
    netDebt: number | null;
    currentRatio: number | null;
    interestCoverage: number | null;
    netDebtToEbitda: number | null;
  };
  dilution: {dilutedShareGrowthYoY: number | null; epsDilutedTtm: number | null};
};

const numberOrNull = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }
  if (typeof value === 'string' && !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const percentageChange = (current: number | null, previous: number | null): number | null => {
  if (current === null || previous === null || previous === 0) {
    return null;
  }
  return (current / previous - 1) * 100;
};

const sumValues = (values: Array<number | null>): number | null => {
  let total = 0;
  for (const value of values) {
    if (value === null) {
      return null;
    }
    total += value;
  }
  return total;
};

export function calculateRevenueGrowth(income: Record<string, unknown>[]): number | null {
  if (income.length < 5) {
    return null;
  }
  return percentageChange(numberOrNull(income[0]?.revenue), numberOrNull(income[4]?.revenue));
}

export function calculateTtmRevenueGrowth(income: Record<string, unknown>[]): number | null {
  if (income.length < 8) {
    return null;
  }
  const latestTtmRevenue = sumValues(income.slice(0, 4).map((quarter) => numberOrNull(quarter?.revenue)));
  const previousTtmRevenue = sumValues(income.slice(4, 8).map((quarter) => numberOrNull(quarter?.revenue)));
  return percentageChange(latestTtmRevenue, previousTtmRevenue);
}

export function calculateGrowthAcceleration(income: Record<string, unknown>[]): number | null {
  if (income.length < 6) {
    return null;
  }
  const latestGrowth = percentageChange(numberOrNull(income[0]?.revenue), numberOrNull(income[4]?.revenue));
  const previousGrowth = percentageChange(numberOrNull(income[1]?.revenue), numberOrNull(income[5]?.revenue));
  if (latestGrowth === null || previousGrowth === null) {
    return null;
  }
  return latestGrowth - previousGrowth;
}

export function calculateOperatingMarginTtm(income: Record<string, unknown>[]): number | null {
  if (income.length < 4) {
    return null;
  }
  const latestFour = income.slice(0, 4);
  const revenue = sumValues(latestFour.map((quarter) => numberOrNull(quarter?.revenue)));
  const operatingIncome = sumValues(latestFour.map((quarter) => numberOrNull(quarter?.operatingIncome)));
  if (revenue === null || operatingIncome === null || revenue === 0) {
    return null;
  }
  return (operatingIncome / revenue) * 100;
}

export function calculateFreeCashFlowTtm(cashFlow: Record<string, unknown>[]): number | null {
  if (cashFlow.length < 4) {
    return null;
  }
  const freeCashFlows = cashFlow.slice(0, 4).map((quarter) => numberOrNull(quarter?.freeCashFlow));
  return sumValues(freeCashFlows);
}

export function calculateFreeCashFlowMargin(
  income: Record<string, unknown>[],
  cashFlow: Record<string, unknown>[],
): number | null {
  if (income.length < 4 || cashFlow.length < 4) {
    return null;
  }
  const ttmRevenue = sumValues(income.slice(0, 4).map((quarter) => numberOrNull(quarter?.revenue)));
  const ttmFreeCashFlow = calculateFreeCashFlowTtm(cashFlow);
  if (ttmRevenue === null || ttmFreeCashFlow === null || ttmRevenue === 0) {
    return null;
  }
  return (ttmFreeCashFlow / ttmRevenue) * 100;
}

export function calculateNetDebt(balanceSheet: Record<string, unknown>[]): number | null {
  const latest = balanceSheet[0];
  if (!latest) {
    return null;
  }
  const suppliedNetDebt = numberOrNull(latest?.netDebt);
  if (suppliedNetDebt !== null) {
    return suppliedNetDebt;
  }
  const totalDebt = numberOrNull(latest?.totalDebt);
  const cash = numberOrNull(latest?.cashAndShortTermInvestments) ?? numberOrNull(latest?.cashAndCashEquivalents);
  if (totalDebt === null || cash === null) {
    return null;
  }
  return totalDebt - cash;
}

export function calculateCurrentRatio(balanceSheet: Record<string, unknown>[]): number | null {
  const latest = balanceSheet[0];
  if (!latest) {
    return null;
  }
  const totalCurrentAssets = numberOrNull(latest?.totalCurrentAssets);
  const totalCurrentLiabilities = numberOrNull(latest?.totalCurrentLiabilities);
  if (totalCurrentAssets === null || totalCurrentLiabilities === null || totalCurrentLiabilities === 0) {
    return null;
  }
  return totalCurrentAssets / totalCurrentLiabilities;
}

export function calculateInterestCoverage(income: Record<string, unknown>[]): number | null {
  if (income.length < 4) {
    return null;
  }
  const latestFour = income.slice(0, 4);
  const operatingIncome = sumValues(latestFour.map((quarter) => numberOrNull(quarter?.operatingIncome)));
  const interestExpense = sumValues(
    latestFour.map((quarter) => {
      const value = numberOrNull(quarter?.interestExpense) ?? numberOrNull(quarter?.interestExpenseNonOperating);
      return value === null ? null : Math.abs(value);
    }),
  );
  if (operatingIncome === null || interestExpense === null || operatingIncome <= 0 || interestExpense <= 0) {
    return null;
  }
  return operatingIncome / interestExpense;
}

export function calculateNetDebtToEbitda(
  income: Record<string, unknown>[],
  balanceSheet: Record<string, unknown>[],
): number | null {
  if (income.length < 4 || balanceSheet.length === 0) {
    return null;
  }
  const ttmEbitda = sumValues(income.slice(0, 4).map((quarter) => numberOrNull(quarter?.ebitda)));
  const netDebt = calculateNetDebt(balanceSheet);
  if (ttmEbitda === null || netDebt === null || ttmEbitda <= 0) {
    return null;
  }
  return netDebt / ttmEbitda;
}

export function calculateDilutedShareGrowth(income: Record<string, unknown>[]): number | null {
  if (income.length < 5) {
    return null;
  }
  const latestDilutedShares = numberOrNull(income[0]?.weightedAverageShsOutDil);
  const yearAgoDilutedShares = numberOrNull(income[4]?.weightedAverageShsOutDil);
  return percentageChange(latestDilutedShares, yearAgoDilutedShares);
}

export function calculateDilutedEpsTtm(income: Record<string, unknown>[]): number | null {
  if (income.length < 4) {
    return null;
  }
  return sumValues(income.slice(0, 4).map((quarter) => numberOrNull(quarter?.epsDiluted)));
}

export function calculateFinancialMetrics(
  financials: FmpFinancialStatements,
  normalized: StockIntelligenceMetrics = buildScorecardMetrics(financials),
): FinancialMetrics {
  return {
    growth: {
      revenueGrowthYoY: normalized.revenueGrowthYoY,
      revenueGrowthTtm: normalized.revenueGrowthTtm,
      revenueAcceleration: normalized.revenueAcceleration,
    },
    profitability: {operatingMarginTtm: normalized.operatingMargin},
    cashFlow: {freeCashFlowTtm: normalized.freeCashFlow, freeCashFlowMargin: normalized.freeCashFlowMargin},
    balanceSheet: {
      netDebt: normalized.netDebt,
      currentRatio: normalized.currentRatio,
      interestCoverage: normalized.interestCoverage,
      netDebtToEbitda: normalized.netDebtToEbitda,
    },
    dilution: {dilutedShareGrowthYoY: normalized.dilutedShareGrowthYoY, epsDilutedTtm: normalized.epsDilutedTtm},
  };
}
