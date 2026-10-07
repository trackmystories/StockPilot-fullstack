import {useCallback, useEffect, useState} from 'react';
import {useAppSelector} from '../../store/hooks';
import {HttpWatchlistRepository} from '../infrastructure/HttpWatchlistRepository';

const repository = new HttpWatchlistRepository();

export function useWatchlist() {
  const token = useAppSelector((state) => state.auth.token);
  const [tickers, setTickers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setTickers([]);
      setError(null);
      setIsLoading(false);

      return [];
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await repository.getTickers(token);
      const normalized = result.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean);
      setTickers(normalized);

      return normalized;
    } catch (loadError) {
      console.error('Could not load watchlist:', loadError);

      const message = loadError instanceof Error ? loadError.message : 'Could not load watchlist';

      setError(message);

      return [];
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isFavorite = useCallback(
    (ticker: string) => {
      const normalized = ticker.trim().toUpperCase();

      return tickers.includes(normalized);
    },
    [tickers],
  );

  const addFavorite = useCallback(
    async (ticker: string) => {
      if (!token) {
        throw new Error('User is not authenticated');
      }

      const normalized = ticker.trim().toUpperCase();

      try {
        setIsUpdating(true);
        setError(null);

        await repository.addStock(token, normalized);

        setTickers((current) => {
          if (current.includes(normalized)) {
            return current;
          }

          return [...current, normalized];
        });
      } catch (addError) {
        const message =
          addError instanceof Error ? addError.message : 'Could not add stock to watchlist';

        setError(message);

        throw addError;
      } finally {
        setIsUpdating(false);
      }
    },
    [token],
  );

  const removeFavorite = useCallback(
    async (ticker: string) => {
      if (!token) {
        throw new Error('User is not authenticated');
      }

      const normalized = ticker.trim().toUpperCase();

      try {
        setIsUpdating(true);
        setError(null);

        await repository.removeStock(token, normalized);

        setTickers((current) => current.filter((item) => item !== normalized));
      } catch (removeError) {
        const message =
          removeError instanceof Error
            ? removeError.message
            : 'Could not remove stock from watchlist';

        setError(message);

        throw removeError;
      } finally {
        setIsUpdating(false);
      }
    },
    [token],
  );

  const toggleFavorite = useCallback(
    async (ticker: string) => {
      const normalized = ticker.trim().toUpperCase();

      if (isFavorite(normalized)) {
        await removeFavorite(normalized);

        return;
      }

      await addFavorite(normalized);
    },
    [isFavorite, addFavorite, removeFavorite],
  );

  return {
    tickers,
    isLoading,
    isUpdating,
    error,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refresh,
  };
}
