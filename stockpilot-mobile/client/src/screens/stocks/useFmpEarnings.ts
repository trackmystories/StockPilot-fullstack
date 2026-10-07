import {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';

export type EarningsSnapshot = {
  symbol: string;
  source: 'FMP';
  fetchedAt: string;
  warnings: string[];

  reported: {
    periodEnd: string;
    currency: string | null;
    revenue: number | null;
    revenueGrowth: number | null;
    eps: number | null;
    epsBasis: string;
    reportedDate: null;
    adjustedEps: null;
  } | null;

  estimates: {
    period: string | null;
    eps: number | null;
    revenue: number | null;
    epsGrowth: number | null;
    revenueGrowth: number | null;
    epsCurrency: string | null;
    revenueCurrency: string | null;
    nextEarningsDate: null;
  };
};

export function useFmpEarnings(symbol: string, token: string | null) {
  const [attempt, setAttempt] = useState(0);

  const [state, setState] = useState<{
    symbol: string;
    token: string | null;
    data: EarningsSnapshot | null;
    loading: boolean;
    error: string | null;
  }>({
    symbol,
    token,
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      let active = true;

      setState({
        symbol,
        token,
        data: null,
        loading: true,
        error: null,
      });

      const timer = setTimeout(() => {
        if (!active) {
          return;
        }

        active = false;
        controller.abort();

        setState({
          symbol,
          token,
          data: null,
          loading: false,
          error: 'Earnings request timed out. Please retry.',
        });
      }, 15000);

      void (async () => {
        try {
          const base = process.env.EXPO_PUBLIC_API_URL;

          if (!token) {
            throw new Error('Please sign in to load earnings.');
          }

          if (!base) {
            throw new Error('Server address is not configured.');
          }

          const response = await fetch(
            `${base.replace(/\/$/, '')}/api/stocks/${encodeURIComponent(symbol)}/earnings`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            throw new Error(
              response.status === 401
                ? 'Session expired. Please sign in again.'
                : 'earnings unavailable. Please retry.',
            );
          }

          const {earnings} = await response.json();

          if (
            !earnings ||
            earnings.symbol !== symbol ||
            earnings.source !== 'FMP' ||
            !Array.isArray(earnings.warnings) ||
            !earnings.estimates ||
            typeof earnings.fetchedAt !== 'string'
          ) {
            throw new Error('Invalid earnings response.');
          }

          if (active) {
            setState({
              symbol,
              token,
              data: earnings,
              loading: false,
              error: null,
            });
          }
        } catch (error) {
          if (active) {
            setState({
              symbol,
              token,
              data: null,
              loading: false,
              error: error instanceof Error ? error.message : 'Could not load earnings.',
            });
          }
        } finally {
          clearTimeout(timer);
        }
      })();

      return () => {
        active = false;
        clearTimeout(timer);
        controller.abort();
      };
    }, [symbol, token, attempt]),
  );

  const current =
    state.symbol === symbol && state.token === token
      ? state
      : {
          data: null,
          loading: true,
          error: null,
        };

  return {
    ...current,
    refresh,
  };
}
