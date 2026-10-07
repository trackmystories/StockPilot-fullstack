import type {FmpThesisData} from '../../fmp/services/fmp-thesis-data.service';

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
type Evidence = {
  key: string;
  text: string;
  summary: string;
  weight: number;
  source: 'fundamentals' | 'analyst-estimates' | 'price-target' | 'rating';
};
export type InvestmentThesis = {
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  drivers: string[];
  risks: string[];
  evidenceSources: string[];
};
type Input = {
  symbol: string;
  currentPrice: number | null;
  metrics: FinancialMetrics;
  investorSignals: InvestorSignals;
  thesisData: FmpThesisData;
};
const formatCurrency = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${(absolute / 1_000_000_000).toFixed(2)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${(absolute / 1_000_000).toFixed(1)}M`;
  }
  return `${absolute.toFixed(0)}`;
};
const percentageChange = (current: number, previous: number) => {
  if (previous === 0) {
    return null;
  }
  return (current / previous - 1) * 100;
};
export function calculateInvestmentThesis({
  symbol,
  currentPrice,
  metrics,
  investorSignals,
  thesisData,
}: Input): InvestmentThesis {
  const drivers: Evidence[] = [];
  const risks: Evidence[] = [];
  const revenueGrowth = metrics.growth.revenueGrowthYoY;
  if (revenueGrowth !== null && revenueGrowth >= 20) {
    drivers.push({
      key: 'revenue-growth',
      text: `Revenue grew ${revenueGrowth.toFixed(1)}% year over year.`,
      summary: `${revenueGrowth.toFixed(1)}% year-over-year revenue growth`,
      weight: Math.min(revenueGrowth, 80),
      source: 'fundamentals',
    });
  }
  if (revenueGrowth !== null && revenueGrowth < 0) {
    risks.push({
      key: 'revenue-decline',
      text: `Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}% year over year.`,
      summary: `${Math.abs(revenueGrowth).toFixed(1)}% year-over-year revenue contraction`,
      weight: Math.min(Math.abs(revenueGrowth), 80),
      source: 'fundamentals',
    });
  }
  const ttmGrowth = metrics.growth.revenueGrowthTtm;
  if (ttmGrowth !== null && ttmGrowth >= 25) {
    drivers.push({
      key: 'ttm-growth',
      text: `Trailing twelve-month revenue increased ${ttmGrowth.toFixed(1)}%.`,
      summary: `${ttmGrowth.toFixed(1)}% trailing revenue growth`,
      weight: Math.min(ttmGrowth, 90),
      source: 'fundamentals',
    });
  }
  const operatingMargin = metrics.profitability.operatingMarginTtm;
  if (operatingMargin !== null && operatingMargin >= 15) {
    drivers.push({
      key: 'operating-margin',
      text: `Operating margin is ${operatingMargin.toFixed(1)}%.`,
      summary: `${operatingMargin.toFixed(1)}% operating margins`,
      weight: 45,
      source: 'fundamentals',
    });
  }
  if (operatingMargin !== null && operatingMargin < 0) {
    risks.push({
      key: 'negative-margin',
      text: `Operating margin remains negative at ${operatingMargin.toFixed(1)}%.`,
      summary: `a negative ${operatingMargin.toFixed(1)}% operating margin`,
      weight: 65,
      source: 'fundamentals',
    });
  }
  const marginChange = investorSignals.earningsQuality.operatingMarginChangeYoY;
  if (marginChange !== null && marginChange >= 3) {
    drivers.push({
      key: 'margin-expansion',
      text: `Operating margin improved ${marginChange.toFixed(1)} percentage points year over year.`,
      summary: `${marginChange.toFixed(1)} points of operating-margin expansion`,
      weight: 50,
      source: 'fundamentals',
    });
  }
  if (marginChange !== null && marginChange <= -3) {
    risks.push({
      key: 'margin-compression',
      text: `Operating margin declined ${Math.abs(marginChange).toFixed(1)} percentage points year over year.`,
      summary: `${Math.abs(marginChange).toFixed(1)} points of operating-margin compression`,
      weight: 55,
      source: 'fundamentals',
    });
  }
  const freeCashFlow = metrics.cashFlow.freeCashFlowTtm;
  if (freeCashFlow !== null && freeCashFlow > 0) {
    drivers.push({
      key: 'positive-fcf',
      text: `The company generated ${formatCurrency(freeCashFlow)} of free cash flow over the last twelve months.`,
      summary: `${formatCurrency(freeCashFlow)} of positive free cash flow`,
      weight: 60,
      source: 'fundamentals',
    });
  }
  if (freeCashFlow !== null && freeCashFlow < 0) {
    risks.push({
      key: 'negative-fcf',
      text: `Free cash flow was negative ${formatCurrency(freeCashFlow)} over the last twelve months.`,
      summary: `${formatCurrency(freeCashFlow)} of negative free cash flow`,
      weight: 75,
      source: 'fundamentals',
    });
  }
  const roic = investorSignals.capitalEfficiency.roicTtm;
  if (roic !== null && roic >= 15) {
    drivers.push({
      key: 'strong-roic',
      text: `ROIC is ${roic.toFixed(1)}%, indicating strong capital efficiency.`,
      summary: `${roic.toFixed(1)}% ROIC`,
      weight: 55,
      source: 'fundamentals',
    });
  }
  if (roic !== null && roic < 0) {
    risks.push({
      key: 'negative-roic',
      text: `ROIC is negative at ${roic.toFixed(1)}%.`,
      summary: `negative ${roic.toFixed(1)}% ROIC`,
      weight: 50,
      source: 'fundamentals',
    });
  }
  const dilution = metrics.dilution.dilutedShareGrowthYoY;
  if (dilution !== null && dilution >= 5) {
    risks.push({
      key: 'dilution',
      text: `Diluted share count increased ${dilution.toFixed(1)}% year over year.`,
      summary: `${dilution.toFixed(1)}% shareholder dilution`,
      weight: Math.min(dilution + 20, 70),
      source: 'fundamentals',
    });
  }
  if (dilution !== null && dilution <= -1) {
    drivers.push({
      key: 'share-reduction',
      text: `Diluted share count declined ${Math.abs(dilution).toFixed(1)}% year over year.`,
      summary: `${Math.abs(dilution).toFixed(1)}% share-count reduction`,
      weight: 35,
      source: 'fundamentals',
    });
  }
  const debtGrowth = investorSignals.fundingRisk.debtGrowthYoY;
  if (debtGrowth !== null && debtGrowth >= 20) {
    risks.push({
      key: 'debt-growth',
      text: `Total debt increased ${debtGrowth.toFixed(1)}% year over year.`,
      summary: `${debtGrowth.toFixed(1)}% year-over-year debt growth`,
      weight: Math.min(debtGrowth, 85),
      source: 'fundamentals',
    });
  }
  const cashConversion = investorSignals.earningsQuality.cashConversionTtm;
  if (cashConversion !== null && cashConversion >= 1) {
    drivers.push({
      key: 'cash-conversion',
      text: `Operating cash flow is ${cashConversion.toFixed(2)}x reported net income.`,
      summary: `${cashConversion.toFixed(2)}x cash conversion`,
      weight: 40,
      source: 'fundamentals',
    });
  }
  const target = thesisData.priceTarget?.targetConsensus;
  if (currentPrice !== null && target !== null && target !== undefined && currentPrice > 0) {
    const upside = percentageChange(target, currentPrice);
    if (upside !== null && upside >= 15) {
      drivers.push({
        key: 'price-target-upside',
        text: `Analyst consensus target of $${target.toFixed(
          2,
        )} implies approximately ${upside.toFixed(1)}% upside from the current price.`,
        summary: `${upside.toFixed(1)}% upside to analyst consensus value`,
        weight: Math.min(upside, 65),
        source: 'price-target',
      });
    }
    if (upside !== null && upside <= -10) {
      risks.push({
        key: 'price-target-downside',
        text: `Analyst consensus target of $${target.toFixed(2)} is approximately ${Math.abs(upside).toFixed(1)}% below the current price.`,
        summary: `${Math.abs(upside).toFixed(1)}% downside to analyst consensus value`,
        weight: Math.min(Math.abs(upside), 65),
        source: 'price-target',
      });
    }
  }
  const futureEstimates = thesisData.analystEstimates
    .filter(
      (estimate) =>
        estimate.date && new Date(estimate.date).getTime() > Date.now() && (estimate.numAnalystsRevenue ?? 0) >= 3,
    )
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  if (futureEstimates.length >= 2) {
    const first = futureEstimates[0];
    const second = futureEstimates[1];
    if (first.revenueAvg !== null && second.revenueAvg !== null && first.revenueAvg > 0) {
      const estimatedGrowth = percentageChange(second.revenueAvg, first.revenueAvg);
      if (estimatedGrowth !== null && estimatedGrowth >= 10) {
        drivers.push({
          key: 'forward-revenue-growth',
          text: `Analysts currently estimate revenue growth of approximately ${estimatedGrowth.toFixed(
            1,
          )}% between the next two annual forecast periods.`,
          summary: `${estimatedGrowth.toFixed(1)}% forward consensus revenue growth`,
          weight: 45,
          source: 'analyst-estimates',
        });
      }
      if (estimatedGrowth !== null && estimatedGrowth < 0) {
        risks.push({
          key: 'forward-revenue-decline',
          text: `Analyst estimates imply revenue could decline approximately ${Math.abs(estimatedGrowth).toFixed(
            1,
          )}% between the next two annual forecast periods.`,
          summary: `${Math.abs(estimatedGrowth).toFixed(1)}% forward consensus revenue contraction`,
          weight: 45,
          source: 'analyst-estimates',
        });
      }
    }
  }
  const rating = thesisData.rating?.rating?.trim().toUpperCase();
  if (rating && /^A/.test(rating)) {
    drivers.push({
      key: 'fmp-rating',
      text: `FMP's current ratings snapshot assigns the company a ${rating} rating.`,
      summary: `an FMP ${rating} financial rating`,
      weight: 30,
      source: 'rating',
    });
  }
  if (rating && /^[DF]/.test(rating)) {
    risks.push({
      key: 'weak-fmp-rating',
      text: `FMP's current ratings snapshot assigns the company a ${rating} rating.`,
      summary: `an FMP ${rating} financial rating`,
      weight: 30,
      source: 'rating',
    });
  }
  drivers.sort((a, b) => b.weight - a.weight);
  risks.sort((a, b) => b.weight - a.weight);
  const strongestDrivers = drivers.slice(0, 3);
  const strongestRisks = risks.slice(0, 3);
  const evidence = [...strongestDrivers, ...strongestRisks];
  const sources = [...new Set(evidence.map((item) => item.source))];
  let confidence: InvestmentThesis['confidence'] = 'low';
  if (evidence.length >= 5 && sources.length >= 2) {
    confidence = 'high';
  } else if (evidence.length >= 3) {
    confidence = 'medium';
  }
  const primaryDriver = strongestDrivers[0];
  const primaryRisk = strongestRisks[0];
  let summary: string;
  if (primaryDriver && primaryRisk) {
    summary = `${symbol}'s investment case is supported by ${primaryDriver.summary}, while ${primaryRisk.summary} remains a key risk.`;
  } else if (primaryDriver) {
    summary = `${symbol}'s investment case is currently supported by ${primaryDriver.summary}.`;
  } else if (primaryRisk) {
    summary = `${symbol}'s current financial profile is primarily constrained by ${primaryRisk.summary}.`;
  } else {
    summary = `There is not yet enough financial evidence to form a strong automated investment thesis for ${symbol}.`;
  }
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
  if (coverage < 0.75) confidence = 'low';
  else if (coverage < 0.9 && confidence === 'high') confidence = 'medium';
  return {
    coverage,
    confidence,
    summary,
    drivers: strongestDrivers.map((item) => item.text),
    risks: strongestRisks.map((item) => item.text),
    evidenceSources: sources,
  };
}
