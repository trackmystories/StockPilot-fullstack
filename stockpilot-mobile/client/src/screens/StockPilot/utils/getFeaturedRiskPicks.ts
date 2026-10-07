import type {SelectStock} from '../types/stockPilot';

type RiskAwareStock = SelectStock & {
  riskScore?: number | null;
  riskLevel?: string | null;
  volatilityScore?: number | null;
};

const RISK_LEVELS = ['high', 'medium', 'low'] as const;

function normalizeRiskLevel(riskLevel?: string | null) {
  return riskLevel?.trim().toLowerCase();
}

/**
 * Returns up to three stocks:
 *
 * 1. High risk
 * 2. Medium risk
 * 3. Low risk
 */
export function getFeaturedRiskPicks(stocks: SelectStock[]): SelectStock[] {
  const riskStocks = stocks as RiskAwareStock[];

  return RISK_LEVELS.map((riskLevel) =>
    riskStocks.find(
      (stock) =>
        normalizeRiskLevel(stock.riskLevel) === riskLevel &&
        typeof stock.riskScore === 'number' &&
        typeof stock.volatilityScore === 'number',
    ),
  ).filter((stock): stock is RiskAwareStock => Boolean(stock));
}
