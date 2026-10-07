import {useCallback, useEffect, useState} from 'react';

export type FmpQuote = {
  symbol: string;
  price: number;
  change: number | null;
  changePercentage: number | null;
  marketCap: number | null;
  volume: number | null;
  asOf: string;
  source: 'FMP';
};

type QuoteApiResponse =
  | FmpQuote
  | {
      quote: FmpQuote;
    };

export function useFmpQuote(symbol: string, token: string | null) {
  const [quote, setQuote] = useState<FmpQuote | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!symbol) {
      setQuote(null);
      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      if (!API_URL) {
        throw new Error('API URL is not configured.');
      }

      const url = `${API_URL.replace(/\/$/, '')}/api/stocks/${encodeURIComponent(symbol)}/quote`;

      console.log('Loading quote:', url);

      const response = await fetch(url, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });

      const contentType = response.headers.get('content-type');

      if (!contentType?.includes('application/json')) {
        const text = await response.text();

        console.error('Quote endpoint returned non-JSON:', {
          url,
          status: response.status,
          body: text.slice(0, 500),
        });

        throw new Error(`Quote request failed (${response.status}).`);
      }

      const data = (await response.json()) as QuoteApiResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Could not load quote.');
      }

      const quoteData = 'quote' in data ? data.quote : data;

      if (!quoteData || typeof quoteData.price !== 'number') {
        console.error('Unexpected quote response:', data);

        throw new Error('Quote response did not contain valid price data.');
      }

      console.log('quote loaded:', quoteData);

      setQuote(quoteData);
    } catch (error) {
      console.error('Could not load quote:', error);

      setQuote(null);

      setError(error instanceof Error ? error.message : 'Could not load quote.');
    } finally {
      setLoading(false);
    }
  }, [symbol, token]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    quote,
    loading,
    error,
    refresh: load,
  };
}
