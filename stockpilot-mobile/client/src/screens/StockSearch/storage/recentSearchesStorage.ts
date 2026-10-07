import AsyncStorage from '@react-native-async-storage/async-storage';
import type {RecentSearchStock} from '../types/stockSearch';

const STORAGE_KEY = '@stockpilot/recent-searches';
const MAX_RECENT_SEARCHES = 5;

async function read(): Promise<RecentSearchStock[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(stocks: RecentSearchStock[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
}

export const recentSearchesStorage = {
  async getAll() {
    return read();
  },

  async add(stock: RecentSearchStock) {
    const current = await read();

    const next = [
      stock,
      ...current.filter(
        (item) =>
          item.symbol.toUpperCase() !== stock.symbol.toUpperCase(),
      ),
    ].slice(0, MAX_RECENT_SEARCHES);

    await write(next);

    return next;
  },

  async remove(symbol: string) {
    const current = await read();

    const next = current.filter(
      (stock) =>
        stock.symbol.toUpperCase() !== symbol.toUpperCase(),
    );

    await write(next);

    return next;
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);

    return [];
  },
};