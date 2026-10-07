import { searchStockToSelectStock } from '../../StockSearch/utils/searchStockToSelectStock';
import type { SelectStock } from '../../StockPilot/types/stockPilot';
import type { PortfolioHolding } from './portfolio';

export function toScorecardStock(holding: PortfolioHolding): SelectStock {
  const base = searchStockToSelectStock({
    symbol: holding.instrument.symbol,
    companyName: holding.instrument.companyName,
    logoUrl: holding.instrument.logoUrl,
    currency: holding.instrument.currency
  });
  return {
    ...base,
    price: holding.price === null ? null : Number(holding.price),
    sector: holding.sector ?? '',
    momentumScore: holding.momentum,
    quote: {
      currency: holding.instrument.currency,
      asOf: holding.priceAsOf,
      source: 'firestore',
      status: holding.price === null ? 'unavailable' : 'available'
    }
  };
}
