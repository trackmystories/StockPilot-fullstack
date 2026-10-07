import {calculateWeightedScore, confidenceFromCoverage} from '../scoring';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskScoreInput = {
  volatilityScore: number | null;
  beta: number | null;
  marketCap: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  netMargin: number | null;
  freeCashFlow: number | null;
  peRatio: number | null;
  priceToSalesRatio: number | null;
};
export type RiskComponents = {
  volatility: number | null;
  beta: number | null;
  marketCap: number | null;
  debt: number | null;
  liquidity: number | null;
  profitability: number | null;
  cashFlow: number | null;
  valuation: number | null;
};
export type RiskScoreResult = {
  score: number | null;
  level: RiskLevel | null;
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  components: RiskComponents;
};
const clamp = (value: number, min = 1, max = 10): number => {
  return Math.min(max, Math.max(min, value));
};
const scoreBeta = (beta: number | null): number => {
  if (beta === null) {
    return 5;
  }
  beta = Math.abs(beta);
  if (beta <= 0.8) {
    return 3;
  }
  if (beta <= 1.2) {
    return 5;
  }
  if (beta <= 1.5) {
    return 7;
  }
  return 9;
};
const scoreMarketCap = (marketCap: number | null): number => {
  if (marketCap === null) {
    return 5;
  }
  if (marketCap >= 200_000_000_000) {
    return 2;
  }
  if (marketCap >= 10_000_000_000) {
    return 4;
  }
  if (marketCap >= 2_000_000_000) {
    return 6;
  }
  if (marketCap >= 300_000_000) {
    return 8;
  }
  return 9;
};
const scoreDebt = (debtToEquity: number | null): number => {
  if (debtToEquity === null) {
    return 5;
  }
  if (debtToEquity < 0) return 10;
  if (debtToEquity <= 0.5) {
    return 3;
  }
  if (debtToEquity <= 1) {
    return 5;
  }
  if (debtToEquity <= 2) {
    return 7;
  }
  return 9;
};
const scoreLiquidity = (currentRatio: number | null): number => {
  if (currentRatio === null) {
    return 5;
  }
  if (currentRatio >= 2) {
    return 2;
  }
  if (currentRatio >= 1.5) {
    return 3;
  }
  if (currentRatio >= 1) {
    return 5;
  }
  if (currentRatio >= 0.75) {
    return 7;
  }
  return 9;
};
const scoreProfitability = (netMargin: number | null): number => {
  if (netMargin === null) {
    return 5;
  }
  if (netMargin >= 20) {
    return 2;
  }
  if (netMargin >= 10) {
    return 3;
  }
  if (netMargin >= 0) {
    return 5;
  }
  if (netMargin >= -10) {
    return 7;
  }
  return 9;
};
const scoreCashFlow = (freeCashFlow: number | null): number => {
  if (freeCashFlow === null) {
    return 5;
  }
  return freeCashFlow >= 0 ? 3 : 8;
};
const scoreValuation = (peRatio: number | null, priceToSalesRatio: number | null): number => {
  const scores: number[] = [];
  if (peRatio !== null && Number.isFinite(peRatio)) {
    if (peRatio <= 0) {
      scores.push(8);
    } else if (peRatio <= 20) {
      scores.push(3);
    } else if (peRatio <= 35) {
      scores.push(5);
    } else if (peRatio <= 60) {
      scores.push(7);
    } else {
      scores.push(9);
    }
  }
  if (priceToSalesRatio !== null && Number.isFinite(priceToSalesRatio)) {
    if (priceToSalesRatio <= 3) {
      scores.push(3);
    } else if (priceToSalesRatio <= 6) {
      scores.push(5);
    } else if (priceToSalesRatio <= 12) {
      scores.push(7);
    } else {
      scores.push(9);
    }
  }
  if (!scores.length) {
    return 5;
  }
  return scores.reduce((total, score) => total + score, 0) / scores.length;
};
const getRiskLevel = (score: number): RiskLevel => {
  if (score < 4) {
    return 'low';
  }
  if (score < 7) {
    return 'medium';
  }
  return 'high';
};
export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  const components: RiskComponents = {
    volatility: input.volatilityScore === null ? 5 : clamp(input.volatilityScore),
    beta: scoreBeta(input.beta),
    marketCap: scoreMarketCap(input.marketCap),
    debt: scoreDebt(input.debtToEquity),
    liquidity: scoreLiquidity(input.currentRatio),
    profitability: scoreProfitability(input.netMargin),
    cashFlow: scoreCashFlow(input.freeCashFlow),
    valuation: scoreValuation(input.peRatio, input.priceToSalesRatio),
  };
  const availability: Record<keyof RiskComponents, boolean> = {
    volatility: input.volatilityScore !== null && Number.isFinite(input.volatilityScore),
    beta: input.beta !== null && Number.isFinite(input.beta),
    marketCap: input.marketCap !== null && Number.isFinite(input.marketCap) && input.marketCap > 0,
    debt: input.debtToEquity !== null && Number.isFinite(input.debtToEquity),
    liquidity: input.currentRatio !== null && Number.isFinite(input.currentRatio),
    profitability: input.netMargin !== null && Number.isFinite(input.netMargin),
    cashFlow: input.freeCashFlow !== null && Number.isFinite(input.freeCashFlow),
    valuation:
      (input.peRatio !== null && Number.isFinite(input.peRatio)) ||
      (input.priceToSalesRatio !== null && Number.isFinite(input.priceToSalesRatio)),
  };
  const weights: Record<keyof RiskComponents, number> = {
    volatility: 0.25,
    beta: 0.15,
    marketCap: 0.1,
    debt: 0.15,
    liquidity: 0.1,
    profitability: 0.1,
    cashFlow: 0.1,
    valuation: 0.05,
  };
  const result = calculateWeightedScore(
    (Object.keys(weights) as (keyof RiskComponents)[]).map((key) => ({
      name: key,
      rawValue: null,
      score: availability[key] ? components[key] : null,
      weight: weights[key],
    })),
    'higher_is_riskier',
  );
  return {
    score: result.score,
    level: result.score === null ? null : getRiskLevel(result.score),
    components: Object.fromEntries(
      Object.entries(components).map(([key, value]) => [key, availability[key as keyof RiskComponents] ? value : null]),
    ) as RiskComponents,
    coverage: result.coverage,
    confidence: confidenceFromCoverage(result.coverage),
  };
}