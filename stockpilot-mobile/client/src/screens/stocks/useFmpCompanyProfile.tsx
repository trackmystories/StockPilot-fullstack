import {useCallback, useEffect, useState} from 'react';

export type FmpCompanyProfile = {
  symbol: string;

  companyName: string | null;

  sector: string | null;

  industry: string | null;

  exchange: string | null;

  exchangeFullName: string | null;

  country: string | null;

  city: string | null;

  ceo: string | null;

  fullTimeEmployees: number | null;

  website: string | null;

  description: string | null;

  ipoDate: string | null;

  beta: number | null;

  image: string | null;

  source: 'FMP';
};

export function useFmpCompanyProfile(symbol: string, token: string | null) {
  const [profile, setProfile] = useState<FmpCompanyProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!symbol) {
      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      setError(null);

      const API_URL = process.env.EXPO_PUBLIC_API_URL;

      if (!API_URL) {
        throw new Error('API URL is not configured.');
      }

      const response = await fetch(`${API_URL}/api/company-profile/${encodeURIComponent(symbol)}`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load company profile.');
      }

      setProfile(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load company profile.');
    } finally {
      setLoading(false);
    }
  }, [symbol, token]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    profile,
    loading,
    error,
    refresh: load,
  };
}
