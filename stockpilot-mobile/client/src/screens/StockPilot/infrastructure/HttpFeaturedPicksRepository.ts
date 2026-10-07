import type {SelectStock} from '../types/stockPilot';

type FeaturedStocksResponse = {
  stocks: SelectStock[];
};

export class HttpFeaturedPicksRepository {
  async getStocks(token: string): Promise<SelectStock[]> {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    if (!API_URL) {
      throw new Error('EXPO_PUBLIC_API_URL is missing.');
    }

    const response = await fetch(`${API_URL}/api/stocks/featured`, {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as
      | FeaturedStocksResponse
      | {
          message?: string;
        };

    if (!response.ok) {
      throw new Error(
        'message' in data && data.message ? data.message : 'Could not load featured stocks.',
      );
    }

    if (!('stocks' in data) || !Array.isArray(data.stocks)) {
      return [];
    }

    return data.stocks;
  }
}
