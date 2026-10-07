import {authenticatedRequest} from '../../Auth/infrastructure/authenticatedRequest';
import type {StockIntelligence} from '../../stocks/useStockIntelligence';
import type {MarketStock, MarketStocksResponse} from '../types/marketStock';

function validScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function addMomentumScore(stock: MarketStock): Promise<MarketStock> {
  const existingScore = validScore(stock.momentumScore);

  if (existingScore !== null) {
    return {...stock, momentumScore: existingScore};
  }

  const symbol = stock.symbol.trim().toUpperCase();

  try {
    const intelligence = await authenticatedRequest<StockIntelligence>(
      `/api/stocks/${encodeURIComponent(symbol)}/intelligence`,
    );

    if (intelligence.symbol !== symbol) {
      throw new Error('Stock intelligence symbol does not match.');
    }

    return {
      ...stock,
      momentumScore: validScore(intelligence.scores?.momentum?.score),
    };
  } catch (error) {
    console.warn(
      `[MarketStocks] Momentum unavailable for ${symbol}:`,
      error instanceof Error ? error.message : 'Unknown error',
    );

    return {
      ...stock,
      momentumScore: null,
    };
  }
}

export class HttpMarketStocksRepository {
  async getStocks(screenerId: string, page = 0, limit = 5): Promise<MarketStocksResponse> {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    if (!API_URL) {
      throw new Error('EXPO_PUBLIC_API_URL is not configured.');
    }

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const url =
      `${API_URL}/api/stocks/market/` + `${encodeURIComponent(screenerId)}?${params.toString()}`;

    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Market stocks request failed (${response.status}): ${text}`);
    }

    let data: MarketStocksResponse;

    try {
      data = JSON.parse(text) as MarketStocksResponse;
    } catch {
      throw new Error(`Expected JSON from ${url}, but received: ${text.slice(0, 200)}`);
    }

    if (!data || !Array.isArray(data.items)) {
      throw new Error('Invalid market stocks response.');
    }

    const items: MarketStock[] = [];

    // Limit simultaneous intelligence requests to five.
    for (let index = 0; index < data.items.length; index += 5) {
      const batch = data.items.slice(index, index + 5);
      const enriched = await Promise.all(batch.map(addMomentumScore));
      items.push(...enriched);
    }

    return {
      ...data,
      items,
    };
  }
}
