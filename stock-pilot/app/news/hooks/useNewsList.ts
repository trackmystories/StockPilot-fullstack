'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {ArticleSummary} from '../domain/News';
import {newsService} from '../newsDependencies';

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong';
}

export function useNewsList() {
  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const cursor = useRef<string | null>(null);
  const serial = useRef(0);
  const busy = useRef(false);

  const load = useCallback(async (reset: boolean) => {
    if (!reset && (busy.current || !cursor.current)) {
      return;
    }

    const request = ++serial.current;

    busy.current = true;

    setLoading(true);
    setError('');

    try {
      const page = await newsService.list(
        undefined,
        reset
          ? undefined
          : cursor.current ?? undefined,
      );

      if (request !== serial.current) {
        return;
      }

      cursor.current = page.nextCursor;

      setHasMore(Boolean(page.nextCursor));

      setItems((current) => {
        if (reset) {
          return page.items;
        }

        return [
          ...new Map(
            [...current, ...page.items].map((item) => [
              item.id,
              item,
            ]),
          ).values(),
        ];
      });
    } catch (error) {
      if (request === serial.current) {
        setError(errorMessage(error));

        if (reset) {
          setItems([]);
          cursor.current = null;
          setHasMore(false);
        }
      }
    } finally {
      if (request === serial.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(true);

    return () => {
      serial.current++;
      busy.current = false;
    };
  }, [load]);

  return {
    items,
    loading,
    error,
    hasMore,

    refresh: () => load(true),

    loadMore: () => load(false),
  };
}