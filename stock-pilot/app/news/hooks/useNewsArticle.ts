'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type {Article} from '../domain/News';
import {newsService} from '../newsDependencies';

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Something went wrong';

export function useNewsArticle(id: string) {
  const [article, setArticle] =
    useState<Article | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError('');
    setArticle(null);

    try {
      const value = await newsService.get(id);

      setArticle(value);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, retryCount]);

  return {
    article,
    loading,
    error,

    retry: () => {
      setRetryCount((value) => value + 1);
    },
  };
}