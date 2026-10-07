import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { StockFilterService } from '../stock-filter/stock-filter.service';
import { PORTFOLIO_CURRENCIES, type PortfolioCurrency, type PortfolioMarketStock } from './portfolio.types';

@Injectable()
export class PortfolioMarketService {
  constructor(private readonly saved: StockFilterService) { }

  async snapshot(): Promise<{
    runId: string;
    stocks: PortfolioMarketStock[];
  }> {
    const snapshot = await this.saved.savedStocks();
    if (snapshot.status !== 'ready') throw new ServiceUnavailableException(snapshot.message);
    const stocks: PortfolioMarketStock[] = snapshot.stocks.flatMap((stock) => {
      // Do not guess a currency, exchange identity or an FX conversion.
      if (!(PORTFOLIO_CURRENCIES as readonly (string | null)[]).includes(stock.currency)) return [];
      const currency = stock.currency as PortfolioCurrency;
      return [{
        instrument: {
          id: createHash('sha256').update(JSON.stringify([stock.symbol, stock.exchange, currency])).digest('hex').slice(0, 32),
          symbol: stock.symbol,
          companyName: stock.companyName,
          exchange: stock.exchange,
          currency,
          logoUrl: stock.logoUrl,
        },
        price: stock.price,
        priceAsOf: stock.quoteAsOf,
        stale: stock.stale,
        sector: stock.sector,
        industry: stock.industry,
        marketCap: stock.marketCap,
        quality: stock.scores.quality,
        financialHealth: stock.scores.financialHealth,
        momentum: stock.scores.momentum,
        freeCashFlow: stock.metrics.freeCashFlow ?? null,
        revenueGrowth: stock.metrics.revenueGrowthYoY ?? null,
      }];
    });
    return {
      runId: snapshot.runId,
      stocks
    };
  }
}
