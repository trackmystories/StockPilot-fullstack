import {authenticatedRequest} from '../../Auth/infrastructure/authenticatedRequest';
import type {StockListMetric} from '../../StockPilot/components/MarketStockRow';
import type {SelectStock} from '../../StockPilot/types/stockPilot';
export type WatchlistStock = SelectStock & {momentumScore: number | null};
type MomentumResponse = {
  symbol?: string;
  stale?: boolean;
  scores?: {
    momentum?: {score?: number | null; coverage?: number; eligible?: boolean};
  };
};
export function readWatchlistMomentum(data: MomentumResponse, symbol: string): number | null {
  const result = data?.scores?.momentum;
  if (
    data?.symbol?.trim().toUpperCase() !== symbol.trim().toUpperCase() ||
    data.stale === true ||
    result?.eligible !== true ||
    result.coverage !== 1 ||
    typeof result.score !== 'number' ||
    !Number.isFinite(result.score) ||
    result.score < 0 ||
    result.score > 10
  ) {
    return null;
  }
  return result.score;
}
export async function loadWatchlistMomentum(symbol: string): Promise<number | null> {
  const data = await authenticatedRequest<MomentumResponse>(
    `/api/stocks/${encodeURIComponent(symbol)}/intelligence`,
  );
  return readWatchlistMomentum(data, symbol);
}
export const WATCHLIST_MOMENTUM_METRIC: StockListMetric = {
  label: 'Momentum',
  direction: 'higher_is_better',
  getScore: (stock) => {
    const score = 'momentumScore' in stock ? stock.momentumScore : null;
    return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 10
      ? score
      : null;
  },
};
