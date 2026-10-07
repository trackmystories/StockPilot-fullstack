import {useCallback, useRef, useState} from 'react';

import {AppState, DeviceEventEmitter} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';

import {useAppSelector} from '../../store/hooks';

import {notificationRepository} from '../infrastructure/HttpNotificationRepository';

import {NOTIFICATIONS_CHANGED} from './usePushNotifications';

import type {StockPilotNotification} from '../types/notification';

export function useNotifications({checkUnreadPages = false}: {checkUnreadPages?: boolean} = {}) {
  const token = useAppSelector((state) => state.auth.token);

  const [items, setItems] = useState<StockPilotNotification[]>([]);

  const [cursor, setCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generation = useRef(0);
  const busy = useRef(false);
  const mutation = useRef(false);

  const load = useCallback(
    async (next?: string | null) => {
      if (!token || busy.current || mutation.current) {
        return;
      }

      busy.current = true;

      const version = generation.current;

      setLoading(true);
      setError('');

      try {
        const page = await notificationRepository.list(token, next);
        if (checkUnreadPages && !next) {
          const visited = new Set<string>();
          while (page.nextCursor && !page.items.some((item) => !item.read)) {
            if (version !== generation.current) return;
            if (visited.has(page.nextCursor)) throw new Error('Repeated notification cursor.');
            visited.add(page.nextCursor);
            const older = await notificationRepository.list(token, page.nextCursor);
            page.items = [...page.items, ...older.items];
            page.nextCursor = older.nextCursor;
          }
        }

        if (version !== generation.current) {
          return;
        }

        setItems((current) =>
          next
            ? [
                ...current,
                ...page.items.filter((item) => !current.some((value) => value.id === item.id)),
              ]
            : page.items,
        );

        setCursor(page.nextCursor);
      } catch (cause) {
        if (version === generation.current) {
          setError(cause instanceof Error ? cause.message : 'Could not load notifications');
        }
      } finally {
        if (version === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [token, checkUnreadPages],
  );

  useFocusEffect(
    useCallback(() => {
      generation.current++;
      busy.current = false;

      void load();

      const interval = setInterval(() => {
        if (AppState.currentState === 'active') {
          void load();
        }
      }, 30000);

      const subscription = DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED, () => void load());

      const appState = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          void load();
        }
      });

      return () => {
        generation.current++;
        busy.current = false;

        clearInterval(interval);

        subscription.remove();
        appState.remove();
      };
    }, [load]),
  );

  const markRead = async (id: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const version = generation.current;

    mutation.current = true;

    // Ignore list requests that started before this write.
    generation.current++;

    busy.current = false;
    setLoading(false);

    try {
      await notificationRepository.markRead(token, id);

      if (generation.current === version + 1) {
        setItems((current) =>
          current.map((item) => (item.id === id ? {...item, read: true} : item)),
        );
      }
    } finally {
      mutation.current = false;
    }
  };

  const markAllRead = async () => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const version = generation.current;

    mutation.current = true;
    generation.current++;

    busy.current = false;
    setLoading(false);

    try {
      const result = await notificationRepository.markAllRead(token);

      if (generation.current === version + 1) {
        setItems((current) =>
          current.map((item) => ({
            ...item,

            read: item.read || Date.parse(item.createdAt) <= Date.parse(result.readAllBefore),
          })),
        );
      }
    } finally {
      mutation.current = false;
    }
  };

  return {
    items,
    loading,
    error,

    refresh: () => load(),

    loadMore: () => load(cursor),

    hasMore: !!cursor,

    markRead,
    markAllRead,
  };
}
