import type {ComponentProps} from 'react';
import type {Ionicons} from '@expo/vector-icons';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../..';
import type {StockRiskDetails} from '../infrastructure/HttpStockRiskRepository';
import type {MarketStock} from './marketStock';

export type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'StockPilot'>;

export type ListKey =
  | 'estimates-rising'
  | 'strong-momentum'
  | 'high-quality'
  | 'financially-strong'
  | 'strong-balance-sheet';

export type ListDefinition = {
  key: ListKey;
  label: string;
};

export type ListCacheItem = {
  stocks: MarketStock[];
  total: number;
};

export type ListCache = Record<ListKey, ListCacheItem>;

export type SelectRiskLevel = 'low' | 'medium' | 'high';

export type MarketCapSize = 'Small' | 'Mid' | 'Large' | 'Mega';

export type ProfitabilityOption = 'Profitable' | 'Unprofitable' | 'High Margin';

export type DebtOption = 'Low Debt' | 'Moderate Debt' | 'High Debt';

export type MomentumOption = 'Weak' | 'Neutral' | 'Strong';

export type SelectThemeId =
  | 'ai-compute'
  | 'data-centers'
  | 'power-nuclear'
  | 'cybersecurity'
  | 'space'
  | 'semiconductors'
  | 'robotics'
  | 'healthcare-ai';

export type SelectTheme = {
  id: SelectThemeId;
  name: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  backgroundColor: string;
  iconColor: string;
};

export type ScoreMetric = {
  score: number | null;
  description: string;
};

export type StockHighlight = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
};

export type ThesisConfidence = 'Low' | 'Medium' | 'High';

export type InvestmentThesis = {
  confidence: ThesisConfidence | null;
  text: string;
};

export type EarningsEstimates = {
  nextEarnings: string | null;
  estimatedEps: number | null;
  epsGrowth: number | null;
  estimatedRevenue: string | null;
  revenueGrowth: number | null;
};

export type StockCatalyst = {
  id: string;
  date: string;
  title: string;
  description: string;
};

export type PriceTargets = {
  bear: number | null;
  base: number | null;
  bull: number | null;
};

export type LatestReported = {
  period: string;
  reportedDate: string;
  revenue: number | null;
  revenueCurrency: string;
  revenueGrowthYoY: number | null;
  accountingStandard: string;
  reportedEps: number | null;
  epsCurrency: string;
  epsBasis: string;
  adjustedEps: number | null;
  notes: string;
  sourceId: string;
};

export type StockSource = {
  id: string;
  title: string;
  url: string;
  publishedDate?: string | null;
};

export type StockMarketQuote = {
  symbol: string;
  name?: string | null;
  price: number | null;
  change: number | null;
  changePercentage: number | null;
  marketCap?: number | null;
  asOf?: string;
  source?: string;
};

export type StockQuote = {
  currency: string;
  asOf: string | null;
  source?: string;
  status?: 'available' | 'unavailable';
};

export type CachedMarket = {
  momentumScore?: number | null;
  quote?: StockMarketQuote;
  risk?: StockRiskDetails;
  updatedAt: number;
};

export type SelectStock = {
  symbol: string;
  companyName: string;
  logoUrl?: string | null;

  themeId: SelectThemeId;
  themeName: string;
  sector: string;

  marketCap: MarketCapSize | null;

  score: number | null;

  riskScore: number | null;
  riskLevel: SelectRiskLevel | null;
  volatilityScore: number | null;
  momentumScore?: number | null;

  thesis: string;

  price: number | null;
  change: number | null;
  changePercentage: number | null;

  featured: boolean;

  trend: number[];

  revenueGrowth: number | null;
  profitability: ProfitabilityOption | null;
  debt: DebtOption | null;
  analystUpside: number | null;
  momentum: MomentumOption | null;
  percentFromATH: number | null;
  percentFromATL: number | null;

  growth: ScoreMetric;
  valuation: ScoreMetric;
  financialHealth: ScoreMetric;
  marketOutlook: ScoreMetric;

  highlights: StockHighlight[];

  investmentThesis: InvestmentThesis;

  earnings: EarningsEstimates;

  catalysts: StockCatalyst[];

  priceTargets: PriceTargets;

  upsidePotential: number | null;

  bullCase: string[];
  bearCase: string[];

  latestReported?: LatestReported | null;

  quote?: StockQuote | null;

  sources?: StockSource[];
};
