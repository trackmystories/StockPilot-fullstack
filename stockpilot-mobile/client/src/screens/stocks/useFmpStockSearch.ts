import {useEffect, useState} from 'react';

export type FmpStockSearchResult = {
  symbol: string;

  name: string;

  currency: string | null;

  exchange: string | null;

  exchangeFullName: string | null;

  logoUrl: string | null;
};

type SearchResponse = {
  results: Omit<FmpStockSearchResult, 'logoUrl'>[];

  message?: string;
};

const isCanceledRequest = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'AbortError' ||
    error.message.includes('FetchRequestCanceledException') ||
    error.message.includes('Fetch request has been canceled')
  );
};

const getLogoUrl = (symbol: string) => {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    return null;
  }

  return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(
    normalizedSymbol,
  )}.png`;
};

export function useFmpStockSearch(query: string) {
  const [results, setResults] = useState<FmpStockSearchResult[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = query.trim();

    if (!search) {
      setResults([]);

      setLoading(false);

      setError(null);

      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        setError(null);

        const API_URL = process.env.EXPO_PUBLIC_API_URL;

        if (!API_URL) {
          throw new Error('API URL is not configured.');
        }

        const url = `${API_URL.replace(
          /\/$/,
          '',
        )}/api/stock-search?q=${encodeURIComponent(search)}`;

        const response = await fetch(url, {
          signal: controller.signal,
        });

        const data = (await response.json()) as SearchResponse;

        if (!response.ok) {
          throw new Error(data.message || 'Could not search stocks.');
        }

        const mappedResults: FmpStockSearchResult[] = (data.results ?? []).map((stock) => ({
          ...stock,

          logoUrl: getLogoUrl(stock.symbol),
        }));

        setResults(mappedResults);
      } catch (error) {
        if (isCanceledRequest(error)) {
          return;
        }

        console.error('Stock search failed:', error);

        setResults([]);

        setError(error instanceof Error ? error.message : 'Could not search stocks.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);

      controller.abort();
    };
  }, [query]);

  return {
    results,

    loading,

    error,
  };
}
