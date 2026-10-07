import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';

export function usePortfolioResource<T>(load: (signal: AbortSignal) => Promise<T>, key = '') {
  const uid = useAppSelector((state) => state.auth.user?.uid ?? null);
  const [state, setState] = useState<{
    uid: string | null;
    key: string;
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    uid,
    key,
    data: null,
    loading: true,
    error: null
  });
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    const serial = ++request.current;
    if (!uid) {
      setState({
        uid,
        key,
        data: null,
        loading: false,
        error: 'Sign in to view portfolios.'
      });
      return () => controller.abort();
    }
    setState((current) => ({
      uid,
      key,
      data: current.uid === uid && current.key === key ? current.data : null,
      loading: true,
      error: null
    }));
    void load(controller.signal).then((data) => {
      if (!controller.signal.aborted && serial === request.current) setState({
        uid,
        key,
        data,
        loading: false,
        error: null
      });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && serial === request.current) setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load portfolio.'
      }));
    });
    return () => {
      controller.abort();
      request.current += 1;
    };
  }, [load, revision, uid, key]));
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return {
    data: state.uid === uid && state.key === key ? state.data : null,
    loading: state.uid !== uid || state.key !== key || state.loading,
    error: state.uid === uid && state.key === key ? state.error : null,
    reload
  };
}
