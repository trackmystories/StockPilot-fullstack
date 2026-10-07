import type {SelectStock} from '../../StockPilot/types/stockPilot';

export type RecentSearchStock = SelectStock;

export type SearchStockPreview = {
  symbol: string;
  companyName: string;
  exchange?: string | null;
  logoUrl?: string | null;
  currency?: string | null;
};