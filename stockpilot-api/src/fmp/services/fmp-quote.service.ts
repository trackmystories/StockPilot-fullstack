import {Injectable, Logger} from '@nestjs/common';
import {FmpHttpService} from '../clients/fmp-http.service';

export type FmpQuote = {
  symbol: string;
  name: string | null;
  price: number;
  change: number | null;
  changePercentage: number | null;
  volume: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  marketCap: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  exchange: string | null;
  open: number | null;
  previousClose: number | null;
  timestamp: number | null;
  asOf: string;
};

export class QuoteError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'QuoteError';
    this.status = status;
  }
}

type CacheEntry = {
  quote: FmpQuote;
  expiresAt: number;
};

@Injectable()
export class FmpQuoteService {
  private readonly logger = new Logger(FmpQuoteService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<FmpQuote>>();
  private readonly cacheTtlMs = 60_000;

  constructor(private readonly http: FmpHttpService) {}

  async getQuote(rawSymbol: string): Promise<FmpQuote> {
    const symbol = this.normalizeSymbol(rawSymbol);

    this.validateSymbol(symbol);

    const cached = this.cache.get(symbol);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.quote;
    }

    const pending = this.pending.get(symbol);

    if (pending) {
      return pending;
    }

    const task = this.loadQuote(symbol);

    this.pending.set(symbol, task);

    try {
      return await task;
    } finally {
      this.pending.delete(symbol);
    }
  }

  async getQuotes(rawSymbols: string[]): Promise<FmpQuote[]> {
    const symbols = [...new Set(rawSymbols.map((symbol) => this.normalizeSymbol(symbol)).filter(Boolean))];

    if (!symbols.length) {
      return [];
    }

    const quotes: FmpQuote[] = [];
    const chunkSize = 5;

    for (let index = 0; index < symbols.length; index += chunkSize) {
      const chunk = symbols.slice(index, index + chunkSize);

      const results = await Promise.allSettled(chunk.map((symbol) => this.getQuote(symbol)));

      results.forEach((result, resultIndex) => {
        const symbol = chunk[resultIndex];

        if (result.status === 'fulfilled') {
          quotes.push(result.value);
          return;
        }

        this.logger.warn(`Could not load quote for ${symbol}.`);
      });
    }

    return quotes;
  }

  private async loadQuote(symbol: string): Promise<FmpQuote> {
    const payload = await this.http.get<unknown>('quote', {
      symbol,
    });

    const quote = this.parseQuote(payload, symbol);

    this.cache.set(symbol, {
      quote,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return quote;
  }

  private parseQuote(payload: unknown, symbol: string): FmpQuote {
    if (!Array.isArray(payload)) {
      throw new QuoteError(`Invalid FMP quote response for ${symbol}.`);
    }

    const rawQuote = payload.find(
      (item) => item && typeof item.symbol === 'string' && item.symbol.toUpperCase() === symbol,
    );

    if (!rawQuote) {
      throw new QuoteError(`Quote not found for ${symbol}.`, 404);
    }

    const price = this.numberOrNull(rawQuote.price);

    if (price === null) {
      throw new QuoteError(`Quote price is unavailable for ${symbol}.`, 404);
    }

    const timestamp = this.numberOrNull(rawQuote.timestamp);

    let asOf = new Date().toISOString();

    if (timestamp !== null) {
      const date = new Date(timestamp * 1000);

      if (!Number.isNaN(date.getTime())) {
        asOf = date.toISOString();
      }
    }

    return {
      symbol,
      name: this.stringOrNull(rawQuote.name),
      price,
      change: this.numberOrNull(rawQuote.change),
      changePercentage: this.numberOrNull(rawQuote.changePercentage),
      volume: this.numberOrNull(rawQuote.volume),
      dayLow: this.numberOrNull(rawQuote.dayLow),
      dayHigh: this.numberOrNull(rawQuote.dayHigh),
      yearHigh: this.numberOrNull(rawQuote.yearHigh),
      yearLow: this.numberOrNull(rawQuote.yearLow),
      marketCap: this.numberOrNull(rawQuote.marketCap),
      priceAvg50: this.numberOrNull(rawQuote.priceAvg50),
      priceAvg200: this.numberOrNull(rawQuote.priceAvg200),
      exchange: this.stringOrNull(rawQuote.exchange),
      open: this.numberOrNull(rawQuote.open),
      previousClose: this.numberOrNull(rawQuote.previousClose),
      timestamp,
      asOf,
    };
  }

  private normalizeSymbol(rawSymbol: string): string {
    return rawSymbol.trim().toUpperCase();
  }

  private validateSymbol(symbol: string): void {
    if (!symbol) {
      throw new QuoteError('Stock symbol is required.', 400);
    }

    if (!/^[A-Z0-9.^-]{1,20}$/.test(symbol)) {
      throw new QuoteError('Invalid stock symbol.', 400);
    }
  }

  private numberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const valueNumber = Number(value);

    return Number.isFinite(valueNumber) ? valueNumber : null;
  }

  private stringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed || null;
  }
}
