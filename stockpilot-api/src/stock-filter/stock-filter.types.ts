import type {StockIntelligenceScores} from '../intelligence/types';
export const SCORE_KEYS = [
  'overall',
  'quality',
  'growth',
  'valuation',
  'financialHealth',
  'momentum',
  'conviction',
  'earningsQuality',
  'capitalEfficiency',
  'reratingPotential',
  'execution',
  'cashPower',
  'fundingPressure',
  'dilutionRisk',
  'balanceSheetResilience',
  'growthDurability',
  'marginPower',
  'capitalDiscipline',
  'earningsReliability',
  'businessEfficiency',
  'valuationCompressionRisk',
  'recovery',
  'breakoutReadiness',
  'fundamentalMomentum',
  'survival',
  'shareholderFriendliness',
  'selfFunding',
  'operatingLeverage',
  'dilution',
  'risk',
  'volatility',
] as const satisfies readonly (keyof StockIntelligenceScores)[];
export type ScoreKey = (typeof SCORE_KEYS)[number];
export type FilterSort = 'symbol' | 'overall' | 'risk';
export type FilterNode = {
  id: string;
  label: string;
  count: number;
  children?: FilterNode[];
};
export type FilterSection = {
  id: string;
  title: string;
  mode: 'single' | 'multiple';
  description?: string;
  options: FilterNode[];
};
export type FilterStock = {
  symbol: string;
  companyName: string;
  logoUrl: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  price: number | null;
  marketCap: number | null;
  changePercentage: number | null;
  quoteAsOf: string | null;
  calculatedAt: string | null;
  stale: boolean;
  score: number | null;
  coverage: number | null;
  riskScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  volatilityScore: number | null;
  scores: Record<ScoreKey, number | null>;
  metrics: Record<string, number | null>;
  secMetricsIncluded: boolean;
};
export type FilterQuery = {
  selectedIds: string[];
  sort: FilterSort;
  offset: number;
  limit: number;
  runId: string;
};
export type FilterLoading = {
  status: 'loading';
  message: string;
};
export type FilterOptions = {
  status: 'ready';
  runId: string;
  total: number;
  loadedAt: string;
  sections: FilterSection[];
};
export type FilterResults = {
  status: 'ready';
  runId: string;
  total: number;
  items: FilterStock[];
  nextOffset: number | null;
  loadedAt: string;
};