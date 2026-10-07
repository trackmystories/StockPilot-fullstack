export type ScoreDirection = 'higher_is_better' | 'higher_is_riskier';

export type ScoreConfidence = 'low' | 'medium' | 'high';

export type ScoreComponent = {
  score: number | null;
  rawValue: number | null;
  weight: number;
  coverage?: number;
};

export type ScoreResult = {
  eligible?: boolean;
  reasons?: string[];
  score: number | null;
  direction: ScoreDirection;
  coverage: number;
  confidence: ScoreConfidence;
  components: Record<string, ScoreComponent>;
};

export type PeerMetric = {
  percentile: number;
  count: number;
  group: string;
  level: 'industry' | 'sector';
  q25: number;
  median: number;
  q75: number;
};

export type PeerContext = {
  metrics: Partial<Record<keyof StockIntelligenceMetrics, PeerMetric>>;
  analysisMetrics?: Partial<Record<keyof StockIntelligenceMetrics, PeerMetric>>;
};

export type MetricQuality = {
  asOf: string | null;
  statementAgeDays: number | null;
  priceAsOf: string | null;
  priceAgeDays: number | null;
  reportedCurrency: string | null;
  currencyComparable: boolean;
  quoteCurrency: string | null;
  warnings: string[];
};

export type StockIntelligenceMetrics = {
  secSupplement?: {
    fingerprint: string | null;
    status: 'used' | 'no_compatible_facts' | 'not_prepared';
    facts: Array<{
      metric: 'currentRatio' | 'debtToEquity' | 'cashToShortTermDebt';
      value: number;
      asOf: string;
      numerator: number;
      denominator: number;
      evidenceId: string;
      url: string;
      accession: string;
      filedAt: string;
    }>;
  };
  dataQuality?: MetricQuality;
  peers?: PeerContext;
  revenueTtm: number | null;
  netIncomeTtm: number | null;
  operatingIncomeTtm: number | null;
  ebitdaTtm: number | null;
  epsDilutedTtm: number | null;
  profitabilityConsistency: number | null;
  positiveFcfQuarters: number | null;
  stockBasedCompensationToRevenue: number | null;
  netStockIssuanceToRevenue: number | null;
  incrementalOperatingMargin: number | null;
  operatingIncomeGrowthYoY: number | null;
  debtToEquity: number | null;
  shortTermDebt: number | null;
  interestExpenseTtm: number | null;
  revenueGrowthYoY: number | null;
  revenueGrowthTtm: number | null;
  revenueCagr3Y: number | null;
  revenueAcceleration: number | null;
  revenueGrowthConsistency: number | null;
  epsGrowthYoY: number | null;
  epsCagr3Y: number | null;
  grossMargin: number | null;
  grossMarginChangeYoY: number | null;
  operatingMargin: number | null;
  operatingMarginChangeYoY: number | null;
  netMargin: number | null;
  freeCashFlow: number | null;
  freeCashFlowGrowthYoY: number | null;
  freeCashFlowMargin: number | null;
  operatingCashFlowMargin: number | null;
  cashConversion: number | null;
  fcfConversion: number | null;
  accrualRatio: number | null;
  roic: number | null;
  incrementalRoic: number | null;
  revenueToInvestedCapital: number | null;
  capexIntensity: number | null;
  cash: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  currentRatio: number | null;
  interestCoverage: number | null;
  netDebtToEbitda: number | null;
  debtGrowthYoY: number | null;
  cashToShortTermDebt: number | null;
  cashRunwayQuarters: number | null;
  dilutedShareGrowthYoY: number | null;
  netStockIssuance: number | null;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  priceToFcf: number | null;
  evToEbitda: number | null;
  fcfYield: number | null;
  price: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return12m: number | null;
  volume: number | null;
  averageVolume: number | null;
  forwardRevenueGrowth: number | null;
  forwardEpsGrowth: number | null;
  analystCount: number | null;
};

export type StockIntelligenceScores = {
  overall: ScoreResult;
  conviction: ScoreResult;
  quality: ScoreResult;
  growth: ScoreResult;
  valuation: ScoreResult;
  financialHealth: ScoreResult;
  momentum: ScoreResult;
  earningsQuality: ScoreResult;
  capitalEfficiency: ScoreResult;
  reratingPotential: ScoreResult;
  execution: ScoreResult;
  cashPower: ScoreResult;
  fundingPressure: ScoreResult;
  dilutionRisk: ScoreResult;
  balanceSheetResilience: ScoreResult;
  growthDurability: ScoreResult;
  marginPower: ScoreResult;
  capitalDiscipline: ScoreResult;
  earningsReliability: ScoreResult;
  businessEfficiency: ScoreResult;
  valuationCompressionRisk: ScoreResult;
  recovery: ScoreResult;
  breakoutReadiness: ScoreResult;
  fundamentalMomentum: ScoreResult;
  survival: ScoreResult;
  shareholderFriendliness: ScoreResult;
  selfFunding: ScoreResult;
  operatingLeverage: ScoreResult;
  dilution: ScoreResult;
  risk: ScoreResult;
  volatility: ScoreResult;
};

export type StockIntelligenceMetric = {
  key: string;
  name: string;
  description: string;
  value: number | null;
  displayValue: string;
  score: number | null;
  weight: number;
};

export type StockIntelligenceCategory = {
  coverage?: number;
  confidence?: ScoreConfidence;
  key: string;
  name: string;
  description: string;
  score: number | null;
  metrics: StockIntelligenceMetric[];
};

export type StockIntelligence = {
  sourceRunId?: string;
  calculationVersion?: number;
  analysisVersion?: number;
  evidencePolicyVersion?: number;
  stale?: boolean;
  symbol: string;
  generatedAt: string;
  scores: StockIntelligenceScores;
  categories: {
    strongBalanceSheet: StockIntelligenceCategory;
  };
  metrics: StockIntelligenceMetrics;
};

export type FmpFinancialStatements = {
  symbol: string;
  income: Record<string, unknown>[];
  balanceSheet: Record<string, unknown>[];
  cashFlow: Record<string, unknown>[];
};

export type StockSnapshot = {
  symbol: string;
  companyName: string;
  logoUrl: string | null;
  riskScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  volatilityScore: number | null;
};
