import AsyncStorage from '@react-native-async-storage/async-storage';

type StockDataKind = 'intelligence' | 'financials';

type CachedStockData<T> = {
  cachedAt: number;
  data: T;
};

const CACHE_PREFIX = 'stockpilot:last-known-good';

function cacheKey(kind: StockDataKind, symbol: string): string {
  return `${CACHE_PREFIX}:${kind}:${symbol.trim().toUpperCase()}`;
}

export async function saveStockData<T>(kind: StockDataKind, symbol: string, data: T): Promise<void> {
  if (!symbol.trim()) return;

  const payload: CachedStockData<T> = {
    cachedAt: Date.now(),
    data,
  };

  try {
    await AsyncStorage.setItem(cacheKey(kind, symbol), JSON.stringify(payload));
  } catch (error) {
    console.warn('[StockDataCache] Could not save cached stock data:', error);
  }
}

export async function loadStockData<T>(kind: StockDataKind, symbol: string): Promise<CachedStockData<T> | null> {
  if (!symbol.trim()) return null;

  try {
    const raw = await AsyncStorage.getItem(cacheKey(kind, symbol));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedStockData<T>>;

    if (typeof parsed.cachedAt !== 'number' || parsed.data == null) {
      return null;
    }

    return {
      cachedAt: parsed.cachedAt,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}