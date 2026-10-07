import {useCallback, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useAppSelector} from '../../store/hooks';
import type {ArticleSummary} from '../domain/News';
import {newsService} from '../newsDependencies';
import {errorMessage} from '../components/NewsUI';

export function useNewsList() {
  const token = useAppSelector((state) => state.auth.token) ?? '';

  const [items, setItems] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const cursor = useRef<string | null>(null);
  const serial = useRef(0);
  const busy = useRef(false);

  const load = useCallback(
    async (reset: boolean) => {
      if (!reset && (busy.current || !cursor.current)) {
        return;
      }

      const request = ++serial.current;

      busy.current = true;
      setLoading(true);
      setError('');

      try {
        const page = await newsService.list(token, reset ? undefined : cursor.current!);

        if (request !== serial.current) {
          return;
        }

        cursor.current = page.nextCursor;
        setHasMore(Boolean(page.nextCursor));

        setItems((current) =>
          reset
            ? page.items
            : [...new Map([...current, ...page.items].map((item) => [item.id, item])).values()],
        );
      } catch (cause) {
        if (request !== serial.current) {
          return;
        }

        setError(errorMessage(cause));

        if (reset) {
          setItems([]);
          cursor.current = null;
          setHasMore(false);
        }
      } finally {
        if (request === serial.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void load(true);

      return () => {
        serial.current++;
        busy.current = false;
      };
    }, [load]),
  );

  return {
    items,
    loading,
    error,
    hasMore,
    refresh: () => load(true),
    loadMore: () => load(false),
  };
}
