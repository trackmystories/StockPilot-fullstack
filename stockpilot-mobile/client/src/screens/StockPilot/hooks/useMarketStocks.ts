import {useCallback, useEffect, useRef, useState} from 'react';
import type {MarketStocksResponse} from '../types/marketStock';
import type {SelectStock} from '../types/stockPilot';
import {marketStockToSelectStock} from '../utils/marketStockToSelectStock';

type Loader = {
  execute: (id: string, page: number, limit: number) => Promise<MarketStocksResponse>;
};

const PAGE_SIZE = 5;

export function useMarketStocks(loader: Loader, algorithm?: string, initialStocks?: SelectStock[]) {
  const [stocks, setStocks] = useState<SelectStock[]>(initialStocks ?? []);
  const [total, setTotal] = useState(initialStocks?.length ?? 0);
  const [loading, setLoading] = useState(Boolean(algorithm));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const page = useRef(-1);
  const runId = useRef<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const retryFromStart = useRef(true);

  const load = useCallback(
    async (reset: boolean) => {
      if (!algorithm || busy.current) return;
      busy.current = true;
      const requestGeneration = generation.current;
      let requestedPage = reset ? 0 : page.current + 1;
      setError(null);
      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        let result = await loader.execute(algorithm, requestedPage, PAGE_SIZE);
        if (requestGeneration !== generation.current) return;

        // A weekly rebuild can change the rankings between page requests.
        // Restart rather than combining stocks from two different runs.
        if (requestedPage > 0 && result.runId !== runId.current) {
          requestedPage = 0;
          result = await loader.execute(algorithm, 0, PAGE_SIZE);
          if (requestGeneration !== generation.current) return;
        }

        const incoming = result.items.map(marketStockToSelectStock);
        setStocks((current) =>
          requestedPage === 0
            ? incoming
            : [
                ...current,
                ...incoming.filter(
                  (stock) => !current.some((item) => item.symbol === stock.symbol),
                ),
              ],
        );
        setTotal(result.total);
        setHasMore(result.hasMore);
        page.current = requestedPage;
        runId.current = result.runId;
      } catch {
        if (requestGeneration === generation.current) {
          retryFromStart.current = requestedPage === 0;
          setError('Could not load this smart list. Please try again.');
        }
      } finally {
        if (requestGeneration === generation.current) {
          busy.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [algorithm, loader],
  );

  useEffect(() => {
    generation.current += 1;
    busy.current = false;
    page.current = -1;
    runId.current = null;
    setStocks(initialStocks ?? []);
    setTotal(initialStocks?.length ?? 0);
    setHasMore(false);
    setError(null);
    setLoading(Boolean(algorithm));
    setLoadingMore(false);
    if (algorithm) void load(true);
    return () => {
      generation.current += 1;
      busy.current = false;
    };
  }, [algorithm, initialStocks, load]);

  return {
    stocks,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    refresh: () => load(true),
    loadMore: () => (hasMore ? load(false) : Promise.resolve()),
    retry: () => load(retryFromStart.current),
  };
}
