import {useCallback, useEffect, useRef, useState} from 'react';
import type {FilterResults, FilterSort} from '../domain/stockFilter';
import {stockFilterRepository} from '../infrastructure/HttpStockFilterRepository';
export function useStockFilterResults(selectedIds: string[], runId: string, sort: FilterSort) {
  const [data, setData] = useState<FilterResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const busy = useRef(false);
  const selectionKey = JSON.stringify(selectedIds);
  const load = useCallback(async (offset: number, append: boolean) => {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || busy.current)
      return;
    busy.current = true;
    const id = requestId.current;
    setError(null);
    if (append)
      setLoadingMore(true); else setLoading(true);
    try {
      const response = await stockFilterRepository.query({
        selectedIds: JSON.parse(selectionKey) as string[],
        runId,
        sort,
        offset,
        limit: 50
      }, signal);
      if (!signal.aborted && id === requestId.current)
        setData((previous) => ({
          ...response,
          items: append && previous
            ? [...new Map([...previous.items, ...response.items].map((item) => [item.symbol, item])).values()]
            : response.items
        }));
    } catch (cause) {
      if (!signal.aborted && id === requestId.current)
        setError(cause instanceof Error ? cause.message : 'Could not load filtered stocks.');
    } finally {
      if (!signal.aborted && id === requestId.current) {
        busy.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [selectionKey, runId, sort]);
  useEffect(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    requestId.current += 1;
    busy.current = false;
    setData(null);
    void load(0, false);
    return () => {
      controller.current?.abort();
      requestId.current += 1;
      busy.current = false;
    };
  }, [load, revision]);
  const loadMore = useCallback(() => {
    if (data?.nextOffset !== null && data?.nextOffset !== undefined)
      void load(data.nextOffset, true);
  }, [data?.nextOffset, load]);
  return {
    data,
    loading,
    loadingMore,
    error,
    loadMore,
    retry: () => setRevision((value) => value + 1)
  };
}