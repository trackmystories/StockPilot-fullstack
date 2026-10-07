import {authenticatedRequest} from '../../Auth/infrastructure/authenticatedRequest';

export class HttpWatchlistRepository {
  async getTickers(_token: string): Promise<string[]> {
    const data = await authenticatedRequest<{
      tickers: string[];
    }>('/api/watchlist');

    return data.tickers;
  }

  async addStock(_token: string, ticker: string): Promise<void> {
    await authenticatedRequest('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(),
      }),
    });
  }

  async removeStock(_token: string, ticker: string): Promise<void> {
    await authenticatedRequest(
      `/api/watchlist/${encodeURIComponent(ticker.trim().toUpperCase())}`,
      {
        method: 'DELETE',
      },
    );
  }
}
