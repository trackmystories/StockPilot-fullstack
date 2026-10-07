import {useCallback, useEffect, useState} from 'react';
import {recentSearchesStorage} from '../storage/recentSearchesStorage';
import type {RecentSearchStock} from '../types/stockSearch';

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<
    RecentSearchStock[]
  >([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const stored = await recentSearchesStorage.getAll();

      if (active) {
        setRecentSearches(stored);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const addRecentSearch = useCallback(
    async (stock: RecentSearchStock) => {
      const next = await recentSearchesStorage.add(stock);

      setRecentSearches(next);
    },
    [],
  );

  const removeRecentSearch = useCallback(
    async (symbol: string) => {
      const next = await recentSearchesStorage.remove(symbol);

      setRecentSearches(next);
    },
    [],
  );

  const clearRecentSearches = useCallback(async () => {
    await recentSearchesStorage.clear();

    setRecentSearches([]);
  }, []);

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
}