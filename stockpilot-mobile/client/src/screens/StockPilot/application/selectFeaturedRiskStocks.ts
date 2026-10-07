import type {SelectStock} from '../types/stockPilot';

const MAX_FEATURED_STOCKS = 3;

const RISK_LEVELS = ['high', 'medium', 'low'] as const;

function normalizeRiskLevel(value: SelectStock['riskLevel']) {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase();
}

function hasRiskMetrics(stock: SelectStock) {
  return typeof stock.riskScore === 'number' && typeof stock.volatilityScore === 'number';
}

/**
 * Selects up to three stocks for the Featured Picks carousel.
 *
 * Preference:
 * 1. One high-risk stock
 * 2. One medium-risk stock
 * 3. One low-risk stock
 *
 * If one of those risk buckets is unavailable, the remaining
 * positions are filled with other stocks that have valid
 * risk and volatility metrics.
 */
export function selectFeaturedRiskStocks(stocks: SelectStock[]): SelectStock[] {
  const validStocks = stocks.filter(hasRiskMetrics);

  const selectedStocks: SelectStock[] = [];

  for (const riskLevel of RISK_LEVELS) {
    const stock = validStocks.find(
      (item) =>
        normalizeRiskLevel(item.riskLevel) === riskLevel &&
        !selectedStocks.some((selected) => selected.symbol === item.symbol),
    );

    if (stock) {
      selectedStocks.push(stock);
    }
  }

  if (selectedStocks.length < MAX_FEATURED_STOCKS) {
    const remainingStocks = validStocks.filter(
      (stock) => !selectedStocks.some((selected) => selected.symbol === stock.symbol),
    );

    for (const stock of remainingStocks) {
      selectedStocks.push(stock);

      if (selectedStocks.length === MAX_FEATURED_STOCKS) {
        break;
      }
    }
  }

  return selectedStocks.slice(0, MAX_FEATURED_STOCKS);
}
