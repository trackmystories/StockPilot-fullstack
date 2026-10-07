import {searchStockToSelectStock} from '../../StockSearch/utils/searchStockToSelectStock';
import type {SelectStock} from '../../StockPilot/types/stockPilot';
import type {FilterStock} from './stockFilter';
export function toSelectStock(stock: FilterStock): SelectStock {
  const base = searchStockToSelectStock({
    symbol: stock.symbol,
    companyName: stock.companyName,
    logoUrl: stock.logoUrl,
    currency: stock.currency
  });
  const cap = stock.currency === 'USD' ? stock.marketCap : null;
  return {
    ...base,
    sector: stock.sector ?? '',
    marketCap: cap === null || cap < 3e8 ? null : cap < 2e9 ? 'Small' : cap < 1e10 ? 'Mid' : cap < 2e11 ? 'Large' : 'Mega',
    price: stock.price,
    changePercentage: stock.changePercentage,
    score: stock.score,
    riskScore: stock.riskScore,
    riskLevel: stock.riskLevel,
    volatilityScore: stock.volatilityScore,
    momentumScore: stock.scores.momentum,
    revenueGrowth: stock.metrics.revenueGrowthYoY ?? null,
    growth: {score: stock.scores.growth, description: 'Saved Firestore score.'},
    valuation: {score: stock.scores.valuation, description: 'Saved Firestore score.'},
    financialHealth: {score: stock.scores.financialHealth, description: 'Saved Firestore score.'},
    quote: stock.currency
      ? {
        currency: stock.currency,
        asOf: stock.quoteAsOf,
        source: 'firestore',
        status: stock.price === null ? 'unavailable' : 'available'
      }
      : null,
  };
}