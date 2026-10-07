import type {StockQuote} from './useFmpQuote.ts';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type {SelectStock} from '../StockPilot/types/stockPilot.js';
import {fetchStocks} from './stockData';

type Catalog = {
  stocks: SelectStock[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateQuote: (quote: StockQuote) => void;
};

type Props = {
  token: string | null;
  children: ReactNode;
};

const Context = createContext<Catalog | null>(null);

export function StocksProvider({token, children}: Props) {
  const [stocks, setStocks] = useState<SelectStock[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const active = useRef<AbortController | null>(null);

  const updateQuote = useCallback((quote: StockQuote) => {
    setStocks((current) =>
      current.map((stock) =>
        stock.symbol === quote.symbol
          ? {
              ...stock,
              price: quote.price,
              change: quote.change,
              changePercentage: quote.changePercentage,
              quote: {
                currency: stock.quote?.currency || 'USD',
                asOf: quote.asOf,
                source: quote.source,
                status: 'available' as const,
              },
            }
          : stock,
      ),
    );
  }, []);

  const refresh = useCallback(() => {
    active.current?.abort();

    if (!token) {
      setStocks([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    active.current = controller;

    setLoading(true);
    setError(null);

    fetchStocks(process.env.EXPO_PUBLIC_API_URL, token, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setStocks(data);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : 'Could not load stocks.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, [token]);

  useEffect(() => {
    refresh();

    return () => active.current?.abort();
  }, [refresh]);

  return (
    <Context.Provider
      value={{
        stocks,
        loading,
        error,
        refresh,
        updateQuote,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useStocks(): Catalog {
  const value = useContext(Context);

  if (!value) {
    throw new Error('useStocks requires StocksProvider');
  }

  return value;
}
