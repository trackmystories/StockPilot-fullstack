type FinancialMetrics = {
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
type InvestorSignals = {
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
type BullBearInput = {metrics: FinancialMetrics; investorSignals: InvestorSignals};
export type BullBearCaseItem = {key: string; text: string};
type WeightedCaseItem = BullBearCaseItem & {weight: number};
export type BullBearCase = {
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  bullCase: BullBearCaseItem[];
  bearCase: BullBearCaseItem[];
};
const formatCurrency = (value: number): string => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${(absolute / 1_000_000_000).toFixed(2)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${(absolute / 1_000_000).toFixed(1)}M`;
  }
  if (absolute >= 1_000) {
    return `${(absolute / 1_000).toFixed(1)}K`;
  }
  return `${absolute.toFixed(0)}`;
};
const percentageWeight = (value: number, maximum = 100) => {
  return Math.min(Math.abs(value), maximum);
};
export function calculateBullBearCase({metrics, investorSignals}: BullBearInput): BullBearCase {
  const bullCase: WeightedCaseItem[] = [];
  const bearCase: WeightedCaseItem[] = [];
  /*
   * Growth
   */
  const revenueGrowthYoY = metrics.growth.revenueGrowthYoY;
  if (revenueGrowthYoY !== null && revenueGrowthYoY >= 20) {
    bullCase.push({
      key: 'revenue-growth',
      text: `Revenue grew ${revenueGrowthYoY.toFixed(1)}% year over year.`,
      weight: percentageWeight(revenueGrowthYoY),
    });
  }
  if (revenueGrowthYoY !== null && revenueGrowthYoY < 0) {
    bearCase.push({
      key: 'revenue-decline',
      text: `Revenue declined ${Math.abs(revenueGrowthYoY).toFixed(1)}% year over year.`,
      weight: percentageWeight(revenueGrowthYoY),
    });
  }
  const revenueGrowthTtm = metrics.growth.revenueGrowthTtm;
  if (revenueGrowthTtm !== null && revenueGrowthTtm >= 20) {
    bullCase.push({
      key: 'ttm-revenue-growth',
      text: `Trailing twelve-month revenue increased ${revenueGrowthTtm.toFixed(1)}%.`,
      weight: percentageWeight(revenueGrowthTtm),
    });
  }
  const revenueAcceleration = metrics.growth.revenueAcceleration;
  if (revenueAcceleration !== null && revenueAcceleration >= 10) {
    bullCase.push({
      key: 'growth-acceleration',
      text: `Revenue growth accelerated by ${revenueAcceleration.toFixed(1)} percentage points.`,
      weight: percentageWeight(revenueAcceleration),
    });
  }
  if (revenueAcceleration !== null && revenueAcceleration <= -10) {
    bearCase.push({
      key: 'growth-deceleration',
      text: `Revenue growth decelerated by ${Math.abs(revenueAcceleration).toFixed(1)} percentage points.`,
      weight: percentageWeight(revenueAcceleration),
    });
  }
  /*
   * Profitability
   */
  const operatingMargin = metrics.profitability.operatingMarginTtm;
  if (operatingMargin !== null && operatingMargin >= 15) {
    bullCase.push({
      key: 'strong-operating-margin',
      text: `Operating margin is ${operatingMargin.toFixed(1)}%, indicating solid operating profitability.`,
      weight: percentageWeight(operatingMargin, 60),
    });
  }
  if (operatingMargin !== null && operatingMargin < 0) {
    bearCase.push({
      key: 'negative-operating-margin',
      text: `Operating margin is negative at ${operatingMargin.toFixed(1)}%.`,
      weight: percentageWeight(operatingMargin, 80),
    });
  }
  const marginChange = investorSignals.earningsQuality.operatingMarginChangeYoY;
  if (marginChange !== null && marginChange >= 3) {
    bullCase.push({
      key: 'margin-expansion',
      text: `Operating margin improved by ${marginChange.toFixed(1)} percentage points year over year.`,
      weight: percentageWeight(marginChange, 50) + 15,
    });
  }
  if (marginChange !== null && marginChange <= -3) {
    bearCase.push({
      key: 'margin-compression',
      text: `Operating margin declined by ${Math.abs(marginChange).toFixed(1)} percentage points year over year.`,
      weight: percentageWeight(marginChange, 50) + 15,
    });
  }
  /*
   * Cash flow
   */
  const freeCashFlow = metrics.cashFlow.freeCashFlowTtm;
  const freeCashFlowMargin = metrics.cashFlow.freeCashFlowMargin;
  if (freeCashFlow !== null && freeCashFlow > 0 && freeCashFlowMargin !== null && freeCashFlowMargin >= 10) {
    bullCase.push({
      key: 'strong-free-cash-flow',
      text: `The company generated ${formatCurrency(
        freeCashFlow,
      )} of free cash flow over the last twelve months, with a ${freeCashFlowMargin.toFixed(1)}% FCF margin.`,
      weight: 65,
    });
  } else if (freeCashFlow !== null && freeCashFlow > 0) {
    bullCase.push({
      key: 'positive-free-cash-flow',
      text: `The company generated ${formatCurrency(freeCashFlow)} of free cash flow over the last twelve months.`,
      weight: 45,
    });
  }
  if (freeCashFlow !== null && freeCashFlow < 0) {
    bearCase.push({
      key: 'negative-free-cash-flow',
      text: `Free cash flow was negative ${formatCurrency(freeCashFlow)} over the last twelve months.`,
      weight: 75,
    });
  }
  /*
   * Capital efficiency
   */
  const roic = investorSignals.capitalEfficiency.roicTtm;
  if (roic !== null && roic >= 15) {
    bullCase.push({
      key: 'strong-roic',
      text: `ROIC is ${roic.toFixed(1)}%, indicating efficient use of invested capital.`,
      weight: percentageWeight(roic, 60) + 20,
    });
  }
  if (roic !== null && roic < 0) {
    bearCase.push({
      key: 'negative-roic',
      text: `ROIC is negative at ${roic.toFixed(1)}%, indicating invested capital is not currently generating a positive operating return.`,
      weight: percentageWeight(roic, 60) + 20,
    });
  }
  const incrementalRoic = investorSignals.capitalEfficiency.incrementalRoicYoY;
  if (incrementalRoic !== null && incrementalRoic >= 15) {
    bullCase.push({
      key: 'incremental-roic',
      text: `Incremental ROIC is ${incrementalRoic.toFixed(
        1,
      )}%, suggesting recent capital investment is producing attractive incremental returns.`,
      weight: percentageWeight(incrementalRoic, 50) + 15,
    });
  }
  if (incrementalRoic !== null && incrementalRoic < 0) {
    bearCase.push({
      key: 'negative-incremental-roic',
      text: `Incremental ROIC is negative at ${incrementalRoic.toFixed(
        1,
      )}%, suggesting recent capital investment has not yet produced positive incremental returns.`,
      weight: percentageWeight(incrementalRoic, 50) + 10,
    });
  }
  /*
   * Earnings quality
   */
  const cashConversion = investorSignals.earningsQuality.cashConversionTtm;
  if (cashConversion !== null && cashConversion >= 1) {
    bullCase.push({
      key: 'strong-cash-conversion',
      text: `Cash conversion is ${cashConversion.toFixed(2)}x, with operating cash flow covering reported earnings.`,
      weight: 45,
    });
  }
  if (cashConversion !== null && cashConversion > 0 && cashConversion < 0.7) {
    bearCase.push({
      key: 'weak-cash-conversion',
      text: `Cash conversion is only ${cashConversion.toFixed(
        2,
      )}x, indicating reported earnings are not converting strongly into operating cash flow.`,
      weight: 40,
    });
  }
  const accrualRatio = investorSignals.earningsQuality.accrualRatioTtm;
  if (accrualRatio !== null && accrualRatio <= -5) {
    bullCase.push({
      key: 'low-accruals',
      text: `The accrual ratio is ${accrualRatio.toFixed(1)}%, indicating cash generation is stronger than reported accounting earnings.`,
      weight: 35,
    });
  }
  if (accrualRatio !== null && accrualRatio >= 10) {
    bearCase.push({
      key: 'high-accruals',
      text: `The accrual ratio is ${accrualRatio.toFixed(
        1,
      )}%, indicating reported earnings are materially ahead of operating cash generation.`,
      weight: 45,
    });
  }
  /*
   * Liquidity
   */
  const currentRatio = metrics.balanceSheet.currentRatio;
  if (currentRatio !== null && currentRatio >= 1.5) {
    bullCase.push({
      key: 'strong-liquidity',
      text: `The current ratio is ${currentRatio.toFixed(2)}x, providing a solid short-term liquidity cushion.`,
      weight: 35,
    });
  }
  if (currentRatio !== null && currentRatio < 1) {
    bearCase.push({
      key: 'weak-liquidity',
      text: `The current ratio is ${currentRatio.toFixed(2)}x, meaning current liabilities exceed current assets.`,
      weight: 50,
    });
  }
  const cashToShortTermDebt = investorSignals.fundingRisk.cashToShortTermDebt;
  if (cashToShortTermDebt !== null && cashToShortTermDebt >= 2) {
    bullCase.push({
      key: 'cash-covers-short-term-debt',
      text: `Cash is ${cashToShortTermDebt.toFixed(2)}x short-term debt, providing a strong near-term funding buffer.`,
      weight: 35,
    });
  }
  if (cashToShortTermDebt !== null && cashToShortTermDebt < 1) {
    bearCase.push({
      key: 'cash-below-short-term-debt',
      text: `Cash covers only ${cashToShortTermDebt.toFixed(2)}x short-term debt.`,
      weight: 40,
    });
  }
  /*
   * Leverage
   */
  const netDebtToEbitda = metrics.balanceSheet.netDebtToEbitda;
  if (netDebtToEbitda !== null && netDebtToEbitda >= 0 && netDebtToEbitda <= 2) {
    bullCase.push({
      key: 'manageable-leverage',
      text: `Net debt is ${netDebtToEbitda.toFixed(2)}x EBITDA, indicating relatively manageable leverage.`,
      weight: 30,
    });
  }
  if (netDebtToEbitda !== null && netDebtToEbitda > 4) {
    bearCase.push({
      key: 'high-leverage',
      text: `Net debt is ${netDebtToEbitda.toFixed(2)}x EBITDA, indicating elevated leverage.`,
      weight: 60,
    });
  }
  const debtGrowth = investorSignals.fundingRisk.debtGrowthYoY;
  if (debtGrowth !== null && debtGrowth <= -10) {
    bullCase.push({
      key: 'deleveraging',
      text: `Total debt declined ${Math.abs(debtGrowth).toFixed(1)}% year over year.`,
      weight: percentageWeight(debtGrowth, 50),
    });
  }
  if (debtGrowth !== null && debtGrowth >= 20) {
    bearCase.push({
      key: 'rapid-debt-growth',
      text: `Total debt increased ${debtGrowth.toFixed(1)}% year over year.`,
      weight: percentageWeight(debtGrowth, 100),
    });
  }
  /*
   * Dilution
   */
  const dilutedShareGrowth = metrics.dilution.dilutedShareGrowthYoY;
  if (dilutedShareGrowth !== null && dilutedShareGrowth <= -1) {
    bullCase.push({
      key: 'share-count-reduction',
      text: `Diluted share count declined ${Math.abs(dilutedShareGrowth).toFixed(1)}% year over year.`,
      weight: percentageWeight(dilutedShareGrowth, 40),
    });
  }
  if (dilutedShareGrowth !== null && dilutedShareGrowth >= 5) {
    bearCase.push({
      key: 'shareholder-dilution',
      text: `Diluted share count increased ${dilutedShareGrowth.toFixed(1)}% year over year, creating shareholder dilution.`,
      weight: percentageWeight(dilutedShareGrowth, 60) + 15,
    });
  }
  /*
   * Cash runway
   */
  const cashRunway = investorSignals.fundingRisk.cashRunwayQuarters;
  if (cashRunway !== null && cashRunway < 4) {
    bearCase.push({
      key: 'limited-cash-runway',
      text: `At the latest quarterly cash-burn rate, available cash represents approximately ${cashRunway.toFixed(1)} quarters of runway.`,
      weight: Math.max(25, 70 - cashRunway * 10),
    });
  }
  /*
   * Stock issuance
   */
  const netStockIssuance = investorSignals.fundingRisk.netStockIssuanceTtm;
  if (netStockIssuance !== null && netStockIssuance > 0) {
    bearCase.push({
      key: 'stock-issuance',
      text: `The company raised approximately ${formatCurrency(netStockIssuance)} through net stock issuance over the last twelve months.`,
      weight: 40,
    });
  }
  if (netStockIssuance !== null && netStockIssuance < 0) {
    bullCase.push({
      key: 'share-repurchases',
      text: `The company returned approximately ${formatCurrency(
        netStockIssuance,
      )} through net share repurchases over the last twelve months.`,
      weight: 35,
    });
  }
  bullCase.sort((a, b) => b.weight - a.weight);
  bearCase.sort((a, b) => b.weight - a.weight);
  const observations = [
    metrics.growth.revenueGrowthTtm,
    metrics.profitability.operatingMarginTtm,
    metrics.cashFlow.freeCashFlowMargin,
    metrics.balanceSheet.currentRatio,
    metrics.balanceSheet.netDebtToEbitda,
    metrics.dilution.dilutedShareGrowthYoY,
    investorSignals.earningsQuality.cashConversionTtm,
    investorSignals.capitalEfficiency.roicTtm,
  ];
  const coverage =
    observations.filter((value) => value !== null && Number.isFinite(value)).length / observations.length;
  return {
    coverage,
    confidence: coverage >= 0.9 ? 'high' : coverage >= 0.75 ? 'medium' : 'low',
    bullCase: bullCase.slice(0, 3).map(({key, text}) => ({key, text})),
    bearCase: bearCase.slice(0, 3).map(({key, text}) => ({key, text})),
  };
}
