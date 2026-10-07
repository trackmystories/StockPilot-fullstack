import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { newRequestId } from '../domain/format';

export function usePortfolioAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const generation = useRef(0);
  const active = useRef(false);
  const operation = useRef<{
    key: string;
    id: string;
  } | null>(null);
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => {
      active.current = false;
      generation.current += 1;
    };
  }, []));
  const run = async <T,>(key: string, action: (requestId: string) => Promise<T>, onSuccess: (result: T) => void) => {
    if (locked.current) return;
    const started = generation.current;
    locked.current = true;
    setPending(true);
    setError(null);
    if (operation.current?.key !== key) operation.current = {
      key,
      id: newRequestId()
    };
    try {
      const result = await action(operation.current.id);
      operation.current = null;
      if (active.current && started === generation.current) onSuccess(result);
    } catch (cause: unknown) {
      if (active.current && started === generation.current) setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.');
    } finally {
      locked.current = false;
      if (active.current) setPending(false);
    }
  };
  return {
    pending,
    error,
    run
  };
}
