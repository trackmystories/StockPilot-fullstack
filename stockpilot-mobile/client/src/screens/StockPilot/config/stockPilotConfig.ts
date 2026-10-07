import type {ListCache, ListDefinition} from '../types/stockPilot';

export const PRELOAD_LIMIT = 15;
export const MARKET_TTL = 60_000;
export const WATCHLIST_BATCH_SIZE = 3;

export const STOCKPILOT_LISTS: ListDefinition[] = [
  {
    key: 'estimates-rising',
    label: 'Estimates Rising',
  },
  {
    key: 'strong-momentum',
    label: 'Strong Momentum',
  },
  {
    key: 'high-quality',
    label: 'High Quality',
  },
  {
    key: 'financially-strong',
    label: 'Financially Strong',
  },
  {
    key: 'strong-balance-sheet',
    label: 'Strong Balance Sheets',
  },
];

export function createEmptyListCache(): ListCache {
  const cache: Partial<ListCache> = {};

  STOCKPILOT_LISTS.forEach(({key}) => {
    cache[key] = {
      stocks: [],
      total: 0,
    };
  });

  return cache as ListCache;
}
