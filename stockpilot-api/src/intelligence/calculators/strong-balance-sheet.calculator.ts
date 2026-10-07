import {buildScorecardMetrics} from '../scorecard-metrics';
import {confidenceFromCoverage} from '../scoring';
import type {
  FmpFinancialStatements,
  StockIntelligenceCategory,
  StockIntelligenceMetric,
  StockIntelligenceMetrics,
} from '../types';
const clamp = (value: number): number => {
  return Math.max(0, Math.min(100, Math.round(value)));
};
const safeDivide = (numerator: number | null, denominator: number | null): number | null => {
  if (numerator === null || denominator === null || denominator === 0) {
    return null;
  }
  return numerator / denominator;
};
const getLatestStatement = (statements: Record<string, unknown>[]): Record<string, unknown> | null => {
  if (statements.length === 0) {
    return null;
  }
  const sorted = [...statements].sort((a, b) => {
    const dateA = typeof a.date === 'string' ? a.date : '';
    const dateB = typeof b.date === 'string' ? b.date : '';
    return dateB.localeCompare(dateA);
  });
  return sorted[0] ?? null;
};
const formatMoney = (value: number | null): string => {
  if (value === null) {
    return 'N/A';
  }
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${sign}${(absolute / 1_000_000_000).toFixed(1)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${sign}${(absolute / 1_000_000).toFixed(1)}M`;
  }
  if (absolute >= 1_000) {
    return `${sign}${(absolute / 1_000).toFixed(1)}K`;
  }
  return `${sign}${absolute.toFixed(0)}`;
};
const formatRatio = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return 'N/A';
  }
  return `${value.toFixed(2)}x`;
};
const calculateNetCashPosition = (cash: number | null, debt: number | null) => {
  if (cash === null || debt === null) {
    return {value: null, score: null};
  }
  const netCash = cash - debt;
  if (debt <= 0) {
    return {value: netCash, score: 100};
  }
  const cashToDebt = cash / debt;
  let score: number;
  if (cashToDebt >= 1) {
    score = 100;
  } else if (cashToDebt >= 0.75) {
    score = 85;
  } else if (cashToDebt >= 0.5) {
    score = 70;
  } else if (cashToDebt >= 0.25) {
    score = 45;
  } else {
    score = 20;
  }
  return {value: netCash, score};
};
const calculateDebtToEquity = (debt: number | null, equity: number | null) => {
  const ratio = safeDivide(debt, equity);
  if (ratio === null || ratio < 0) {
    return {value: ratio, score: null};
  }
  let score: number;
  if (ratio <= 0.25) {
    score = 100;
  } else if (ratio <= 0.5) {
    score = 90;
  } else if (ratio <= 1) {
    score = 75;
  } else if (ratio <= 1.5) {
    score = 55;
  } else if (ratio <= 2) {
    score = 35;
  } else {
    score = 15;
  }
  return {value: ratio, score};
};
const calculateCurrentRatio = (currentAssets: number | null, currentLiabilities: number | null) => {
  const ratio = safeDivide(currentAssets, currentLiabilities);
  if (ratio === null) {
    return {value: null, score: null};
  }
  let score: number;
  if (ratio >= 2) {
    score = 100;
  } else if (ratio >= 1.5) {
    score = 90;
  } else if (ratio >= 1.2) {
    score = 75;
  } else if (ratio >= 1) {
    score = 60;
  } else if (ratio >= 0.75) {
    score = 35;
  } else {
    score = 15;
  }
  return {value: ratio, score};
};
const calculateInterestCoverage = (operatingIncome: number | null, interestExpense: number | null) => {
  if (operatingIncome === null || interestExpense === null) {
    return {value: null, score: null};
  }
  const absoluteInterestExpense = Math.abs(interestExpense);
  if (absoluteInterestExpense === 0) {
    return {value: null, score: operatingIncome > 0 ? 100 : 0};
  }
  const ratio = operatingIncome / absoluteInterestExpense;
  let score: number;
  if (ratio >= 10) {
    score = 100;
  } else if (ratio >= 6) {
    score = 90;
  } else if (ratio >= 4) {
    score = 75;
  } else if (ratio >= 2.5) {
    score = 60;
  } else if (ratio >= 1.5) {
    score = 40;
  } else if (ratio >= 1) {
    score = 20;
  } else {
    score = 0;
  }
  return {value: ratio, score};
};
const calculateNetDebtToEbitda = (debt: number | null, cash: number | null, ebitda: number | null) => {
  if (debt === null || cash === null || ebitda === null || ebitda <= 0) {
    return {value: null, score: null};
  }
  const netDebt = debt - cash;
  const ratio = netDebt / ebitda;
  let score: number;
  if (ratio <= 0) {
    score = 100;
  } else if (ratio <= 1) {
    score = 90;
  } else if (ratio <= 2) {
    score = 75;
  } else if (ratio <= 3) {
    score = 55;
  } else if (ratio <= 4) {
    score = 35;
  } else if (ratio <= 5) {
    score = 20;
  } else {
    score = 5;
  }
  return {value: ratio, score};
};
const calculateWeightedScore = (metrics: StockIntelligenceMetric[]): number | null => {
  const availableMetrics = metrics.filter((metric) => metric.score !== null);
  if (
    availableMetrics.length === 0 ||
    availableMetrics.length !== metrics.length ||
    availableMetrics.some((metric) => !Number.isFinite(metric.score))
  ) {
    return null;
  }
  const availableWeight = availableMetrics.reduce((sum, metric) => sum + metric.weight, 0);
  if (availableWeight <= 0) {
    return null;
  }
  const weightedScore = availableMetrics.reduce((sum, metric) => sum + (metric.score ?? 0) * metric.weight, 0);
  return clamp(weightedScore / availableWeight);
};
export const calculateStrongBalanceSheet = (
  financials: FmpFinancialStatements,
  normalized: StockIntelligenceMetrics = buildScorecardMetrics(financials),
): StockIntelligenceCategory => {
  const latestBalanceSheet = getLatestStatement(financials.balanceSheet);
  if (!latestBalanceSheet) {
    return {
      key: 'strongBalanceSheet',
      name: 'Strong Balance Sheet',
      description: 'Measures liquidity, leverage and balance-sheet resilience.',
      score: null,
      coverage: 0,
      confidence: 'low',
      metrics: [],
    };
  }
  const cash = normalized.cash;
  const totalDebt = normalized.totalDebt;
  const ttmOperatingIncome = normalized.operatingIncomeTtm;
  const ttmInterestExpense = normalized.interestExpenseTtm;
  const ttmEbitda = normalized.ebitdaTtm;
  const netCashPosition = calculateNetCashPosition(cash, totalDebt);
  const debtToEquity = calculateDebtToEquity(normalized.debtToEquity, normalized.debtToEquity === null ? null : 1);
  const currentRatio = calculateCurrentRatio(normalized.currentRatio, normalized.currentRatio === null ? null : 1);
  const interestCoverage = calculateInterestCoverage(ttmOperatingIncome, ttmInterestExpense);
  const netDebtToEbitda = calculateNetDebtToEbitda(totalDebt, cash, ttmEbitda);
  const metrics: StockIntelligenceMetric[] = [
    {
      key: 'netCashPosition',
      name: 'Net Cash Position',
      description: 'Cash remaining after subtracting total debt.',
      value: netCashPosition.value,
      displayValue: formatMoney(netCashPosition.value),
      score: netCashPosition.score,
      weight: 0.25,
    },
    {
      key: 'debtToEquity',
      name: 'Debt / Equity',
      description: 'Measures debt relative to shareholder equity.',
      value: debtToEquity.value,
      displayValue: formatRatio(debtToEquity.value),
      score: debtToEquity.score,
      weight: 0.2,
    },
    {
      key: 'currentRatio',
      name: 'Current Ratio',
      description: 'Measures the ability to cover short-term liabilities with short-term assets.',
      value: currentRatio.value,
      displayValue: formatRatio(currentRatio.value),
      score: currentRatio.score,
      weight: 0.15,
    },
    {
      key: 'interestCoverage',
      name: 'Interest Coverage',
      description: 'Measures how easily operating earnings can cover interest expense.',
      value: interestCoverage.value,
      displayValue: formatRatio(interestCoverage.value),
      score: interestCoverage.score,
      weight: 0.2,
    },
    {
      key: 'netDebtToEbitda',
      name: 'Net Debt / EBITDA',
      description: 'Measures net debt relative to trailing twelve-month EBITDA.',
      value: netDebtToEbitda.value,
      displayValue: formatRatio(netDebtToEbitda.value),
      score: netDebtToEbitda.score,
      weight: 0.2,
    },
  ];
  return {
    key: 'strongBalanceSheet',
    name: 'Strong Balance Sheet',
    description: 'Measures liquidity, leverage and the companyâ€™s ability to withstand financial pressure.',
    coverage: metrics.reduce((total, metric) => total + (metric.score === null ? 0 : metric.weight), 0),
    confidence: confidenceFromCoverage(
      metrics.reduce((total, metric) => total + (metric.score === null ? 0 : metric.weight), 0),
    ),
    score: calculateWeightedScore(metrics),
    metrics,
  };
};