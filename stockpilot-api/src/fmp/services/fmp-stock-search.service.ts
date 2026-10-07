import {Injectable} from '@nestjs/common';

import {FmpAccessService} from '../clients/fmp-access.service';
import {FmpHttpService} from '../clients/fmp-http.service';

import {FmpStockScreenerService} from './fmp-stock-screener.service';

export type FmpStockSearchResult = {
  symbol: string;
  name: string;
  currency: string | null;
  exchange: string | null;
  exchangeFullName: string | null;
};

@Injectable()
export class FmpStockSearchService {
  constructor(
    private readonly http: FmpHttpService,
    private readonly access: FmpAccessService,
    private readonly stockScreener: FmpStockScreenerService,
  ) {}

  async search(rawQuery: string): Promise<FmpStockSearchResult[]> {
    const query = rawQuery.trim();

    if (!query) {
      return [];
    }

    const [symbolResult, nameResult] = await Promise.allSettled([
      this.http.get<unknown>('search-symbol', {
        query,
        limit: '15',
      }),

      this.http.get<unknown>('search-name', {
        query,
        limit: '15',
      }),
    ]);

    const symbolResults = symbolResult.status === 'fulfilled' ? this.parseResults(symbolResult.value) : [];

    const nameResults = nameResult.status === 'fulfilled' ? this.parseResults(nameResult.value) : [];

    if (symbolResult.status === 'rejected' && nameResult.status === 'rejected') {
      throw new Error('FMP stock search is currently unavailable.');
    }

    const unique = new Map<string, FmpStockSearchResult>();

    for (const stock of [...symbolResults, ...nameResults]) {
      const key = `${stock.symbol}:${stock.exchange ?? ''}`;

      if (!unique.has(key)) {
        unique.set(key, stock);
      }
    }

    const eligibleSymbols = await this.stockScreener.getEligibleSymbols();

    const eligibleStocks = [...unique.values()].filter((stock) =>
      eligibleSymbols.has(stock.symbol.trim().toUpperCase()),
    );

    const accessible = await this.access.filter(eligibleStocks);

    const lowerQuery = query.toLowerCase();

    return accessible
      .sort((a, b) => {
        const aSymbol = a.symbol.toLowerCase();
        const bSymbol = b.symbol.toLowerCase();

        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aExactSymbol = aSymbol === lowerQuery;
        const bExactSymbol = bSymbol === lowerQuery;

        if (aExactSymbol && !bExactSymbol) {
          return -1;
        }

        if (bExactSymbol && !aExactSymbol) {
          return 1;
        }

        const aExactName = aName === lowerQuery;
        const bExactName = bName === lowerQuery;

        if (aExactName && !bExactName) {
          return -1;
        }

        if (bExactName && !aExactName) {
          return 1;
        }

        const aSymbolStarts = aSymbol.startsWith(lowerQuery);
        const bSymbolStarts = bSymbol.startsWith(lowerQuery);

        if (aSymbolStarts && !bSymbolStarts) {
          return -1;
        }

        if (bSymbolStarts && !aSymbolStarts) {
          return 1;
        }

        const aNameStarts = aName.startsWith(lowerQuery);
        const bNameStarts = bName.startsWith(lowerQuery);

        if (aNameStarts && !bNameStarts) {
          return -1;
        }

        if (bNameStarts && !aNameStarts) {
          return 1;
        }

        const aNameContains = aName.includes(lowerQuery);
        const bNameContains = bName.includes(lowerQuery);

        if (aNameContains && !bNameContains) {
          return -1;
        }

        if (bNameContains && !aNameContains) {
          return 1;
        }

        return a.symbol.localeCompare(b.symbol);
      })
      .slice(0, 20);
  }

  private parseResults(payload: unknown): FmpStockSearchResult[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map((raw): FmpStockSearchResult | null => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }

        const item = raw as Record<string, unknown>;

        const symbol = this.stringOrNull(item.symbol);
        const name = this.stringOrNull(item.name);

        if (!symbol || !name) {
          return null;
        }

        return {
          symbol: symbol.toUpperCase(),
          name,
          currency: this.stringOrNull(item.currency),
          exchange: this.stringOrNull(item.exchange),
          exchangeFullName: this.stringOrNull(item.exchangeFullName),
        };
      })
      .filter((item): item is FmpStockSearchResult => item !== null);
  }

  private stringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    return value.trim() || null;
  }
}
