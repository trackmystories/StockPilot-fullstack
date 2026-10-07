import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import type {StockIntelligenceMetrics} from '../types';
export type MomentumData = {
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  return12M: number | null;
  price: number | null;
  sma50: number | null;
  sma200: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  rsi14: number | null;
};
export type EstimatesData = {
  currentPeriod?: string;
  nextPeriod?: string;
  observedAt?: string;
  currency?: string | null;
  epsRevision?: number | null;
  revenueRevision?: number | null;
  revisionDays?: number | null;
  currentEps: number | null;
  nextEps: number | null;
  currentRevenue: number | null;
  nextRevenue: number | null;
  epsGrowth: number | null;
  revenueGrowth: number | null;
  analystCount: number | null;
};
export type CompanyData = {
  currency?: string | null;
  companyName: string;
  marketCap: number | null;
  price: number | null;
  volume: number | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
};
export type IntelligenceCalculatorInput = {
  symbol: string;
  company: CompanyData;
  financials: FmpFinancialStatements;
  metrics: StockIntelligenceMetrics;
  momentum: MomentumData | null;
  estimates: EstimatesData | null;
};
export type IntelligenceCalculatorResult = {
  confidence?: 'low' | 'medium' | 'high';
  eligible?: boolean;
  reasons?: string[];
  components?: Record<string, unknown> | unknown[];
  score: number;
  coverage: number;
};
export type IntelligenceCalculatorId =
  | 'financially-strong'
  | 'strong-balance-sheet'
  | 'high-quality'
  | 'high-growth'
  | 'undervalued'
  | 'strong-momentum'
  | 'estimates-rising'
  | 'quality-near-lows'
  | 'quality-near-highs'
  | 'growth-near-lows'
  | 'oversold-quality'
  | 'undervalued-momentum'
  | 'small-cap-quality'
  | 'small-cap-growth'
  | 'low-cap-ai'
  | 'low-cap-ai-growth'
  | 'theme-ai'
  | 'theme-semiconductors'
  | 'theme-data-centers'
  | 'theme-energy'
  | 'theme-cybersecurity'
  | 'theme-robotics';
export type IntelligenceCalculator = {
  id: IntelligenceCalculatorId;
  calculate(input: IntelligenceCalculatorInput): IntelligenceCalculatorResult;
};
