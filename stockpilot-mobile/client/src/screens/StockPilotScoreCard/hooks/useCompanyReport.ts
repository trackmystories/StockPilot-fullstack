import {useCallback, useEffect, useState} from 'react';
import {authenticatedRequest} from '../../Auth/infrastructure/authenticatedRequest';
import type {ReportResponse} from '../types/companyReport';

type State = {
  key: string;
  data: ReportResponse | null;
  loading: boolean;
  error: string | null;
};

export function useCompanyReport(symbol: string, token: string | null) {
  const normalized = symbol.trim().toUpperCase();
  const key = `${normalized}:${token ?? ''}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({
    key: '',
    data: null,
    loading: true,
    error: null,
  });
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (!normalized || !token) {
      setState({
        key,
        data: null,
        loading: false,
        error: 'Please sign in to read this report.',
      });

      return () => controller.abort();
    }

    setState({
      key,
      data: null,
      loading: true,
      error: null,
    });

    void authenticatedRequest<ReportResponse>(
      `/api/stocks/${encodeURIComponent(normalized)}/report`,
      {
        signal: controller.signal,
      },
    )
      .then((data) => {
        if (
          data.symbol !== normalized ||
          !['ready', 'not_prepared'].includes(data.status) ||
          (data.status === 'ready' &&
            (!data.report ||
              data.report.symbol !== normalized ||
              !Array.isArray(data.report.sections) ||
              !Array.isArray(data.report.sources)))
        ) {
          throw new Error('The server returned an invalid report.');
        }

        if (active) {
          setState({
            key,
            data,
            loading: false,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted) {
          setState({
            key,
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Could not load this report.',
          });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [normalized, token, key, attempt]);

  // Hide the previous stock's report before the next effect runs.
  if (state.key !== key) {
    return {
      data: null,
      loading: true,
      error: null,
      refresh,
    };
  }

  return {...state, refresh};
}