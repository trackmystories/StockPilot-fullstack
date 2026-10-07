import {useCallback, useEffect, useState} from 'react';

export type StockChartRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export type StockChartPoint = {
  date: string;
  price: number;
  volume: number | null;
};

export type StockChartData = {
  symbol: string;
  range: StockChartRange;
  previousClose: number | null;
  points: StockChartPoint[];
};

type StockChartResponse = StockChartData & {
  message?: string;
};

type State = {
  data: StockChartData | null;
  loading: boolean;
  error: string | null;
};

const initialState: State = {
  data: null,
  loading: false,
  error: null,
};

export function useFmpStockChart(symbol: string, range: StockChartRange, token: string | null) {
  const [state, setState] = useState<State>(initialState);

  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol || !token) {
      setState(initialState);

      return;
    }

    const controller = new AbortController();

    let active = true;

    const load = async () => {
      try {
        setState((current) => ({
          ...current,
          loading: true,
          error: null,
        }));

        const API_URL = process.env.EXPO_PUBLIC_API_URL;

        if (!API_URL) {
          throw new Error('API URL is not configured.');
        }

        const url = `${API_URL.replace(/\/$/, '')}/api/stocks/${encodeURIComponent(
          normalizedSymbol,
        )}/chart?range=${encodeURIComponent(range)}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },

          signal: controller.signal,
        });

        const data = (await response.json()) as StockChartResponse;

        if (!response.ok) {
          throw new Error(data.message || 'Could not load stock chart.');
        }

        if (!active) {
          return;
        }

        setState({
          data,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (!active) {
          return;
        }

        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Could not load stock chart.',
        });
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [symbol, range, token, attempt]);

  return {
    ...state,
    refresh,
  };
}
