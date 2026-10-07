import type {ScoreConfidence} from '../../stocks/useStockIntelligence';

export type MarketStockCategory =
  | 'trending'
  | 'gainers'
  | 'losers'
  | 'strong-balance-sheet'
  | 'high-quality'
  | 'financially-strong';

export type MarketStock = {
  symbol: string;
  companyName: string;
  logoUrl: string | null;
  price: number | null;
  change: number | null;
  changePercentage: number | null;
  riskScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  momentumScore?: number | null;
  volatilityScore: number | null;
  score: number;
  coverage: number;
  confidence?: ScoreConfidence;
  eligible?: boolean;
  rank: number;
};

export type MarketStocksResponse = {
  items: MarketStock[];
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
  runId: string | null;
};
export type PaginatedMarketStocks = {
  items: MarketStock[];
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
};
