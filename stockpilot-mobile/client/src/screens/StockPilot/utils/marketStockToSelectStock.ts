import type {MarketStock} from '../types/marketStock';
import type {SelectStock} from '../types/stockPilot';

export function marketStockToSelectStock(stock: MarketStock): SelectStock {
  return {
    symbol: stock.symbol,
    companyName: stock.companyName,
    logoUrl: stock.logoUrl,
    price: stock.price,
    change: stock.change,
    changePercentage: stock.changePercentage,
    riskScore: stock.riskScore,
    riskLevel: stock.riskLevel,
    volatilityScore: stock.volatilityScore,
    momentumScore: stock.momentumScore ?? null,
  } as SelectStock;
}
