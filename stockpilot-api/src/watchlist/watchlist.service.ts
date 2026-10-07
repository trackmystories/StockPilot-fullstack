import {BadRequestException, Injectable} from '@nestjs/common';
import {FieldValue} from 'firebase-admin/firestore';

import {FirebaseService} from '../firebase/firebase.service';
import {FmpQuoteService} from '../fmp/services/fmp-quote.service';
import {ScreenerResultsRepository} from '../intelligence/repositories/screener-results.repository';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly quoteService: FmpQuoteService,
    private readonly screenerResultsRepository: ScreenerResultsRepository,
  ) {}

  async getTickers(userId: string) {
    const snapshot = await this.firebaseService.db.collection('users').doc(userId).collection('watchlist').get();

    const tickers = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return String(data.ticker ?? doc.id)
          .trim()
          .toUpperCase();
      })
      .filter(Boolean);

    return {
      tickers,
    };
  }

  async getStocks(userId: string, offset = 0, limit = 5) {
    const {tickers} = await this.getTickers(userId);

    const safeOffset = Math.max(0, offset);

    const safeLimit = Math.min(Math.max(1, limit), 20);

    const batchTickers = tickers.slice(safeOffset, safeOffset + safeLimit);

    if (!batchTickers.length) {
      return {
        stocks: [],
        offset: safeOffset,
        nextOffset: null,
        hasMore: false,
        total: tickers.length,
      };
    }

    const snapshotBySymbol = await this.screenerResultsRepository.getStockSnapshots(batchTickers);

    let quotes: Awaited<ReturnType<FmpQuoteService['getQuotes']>> = [];

    try {
      quotes = await this.quoteService.getQuotes(batchTickers);
    } catch (error) {
      console.error('Could not load watchlist quotes:', error);
    }

    const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol.trim().toUpperCase(), quote]));

    const stocks = batchTickers.map((ticker) => {
      const symbol = ticker.trim().toUpperCase();

      const snapshot = snapshotBySymbol.get(symbol);

      const quote = quoteBySymbol.get(symbol);

      return {
        symbol,

        name: snapshot?.companyName ?? symbol,

        companyName: snapshot?.companyName ?? symbol,

        logoUrl: snapshot?.logoUrl ?? null,

        exchange: quote?.exchange ?? null,

        price: quote?.price ?? null,

        change: quote?.change ?? null,

        changePercentage: quote?.changePercentage ?? null,

        marketCap: quote?.marketCap ?? null,

        volume: quote?.volume ?? null,

        riskScore: snapshot?.riskScore ?? null,

        riskLevel: snapshot?.riskLevel ?? null,

        volatilityScore: snapshot?.volatilityScore ?? null,

        quote: quote
          ? {
              currency: 'USD',

              price: quote.price,

              change: quote.change,

              changePercentage: quote.changePercentage,

              asOf: quote.asOf,

              status: 'available' as const,
            }
          : null,
      };
    });

    const nextOffset = safeOffset + batchTickers.length < tickers.length ? safeOffset + batchTickers.length : null;

    return {
      stocks,

      offset: safeOffset,

      nextOffset,

      hasMore: nextOffset !== null,

      total: tickers.length,
    };
  }

  async addTicker(userId: string, ticker: string) {
    const normalizedTicker = this.normalizeTicker(ticker);

    await this.firebaseService.db.collection('users').doc(userId).collection('watchlist').doc(normalizedTicker).set({
      ticker: normalizedTicker,

      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      ticker: normalizedTicker,
    };
  }

  async removeTicker(userId: string, ticker: string) {
    const normalizedTicker = this.normalizeTicker(ticker);

    await this.firebaseService.db
      .collection('users')
      .doc(userId)
      .collection('watchlist')
      .doc(normalizedTicker)
      .delete();

    return {
      ticker: normalizedTicker,
    };
  }

  private normalizeTicker(ticker: string) {
    if (!ticker || typeof ticker !== 'string') {
      throw new BadRequestException('Ticker is required');
    }

    const normalizedTicker = ticker.trim().toUpperCase();

    if (!normalizedTicker) {
      throw new BadRequestException('Ticker is required');
    }

    return normalizedTicker;
  }
}
