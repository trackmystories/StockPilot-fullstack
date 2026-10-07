export type FairValueMethodId =
  | 'analyst-target'
  | 'peer-forward-pe'
  | 'peer-pe'
  | 'peer-price-to-sales'
  | 'peer-price-to-book'
  | 'peer-price-to-fcf'
  | 'peer-ev-to-ebitda';

export type FairValueMethod = {
  id: FairValueMethodId;
  name: string;
  source: 'analyst' | 'peer';
  impliedValue: number;
  companyMultiple: number | null;
  peerMedian: number | null;
  peerCount: number | null;
  peerGroup: string | null;
  peerLevel: 'industry' | 'sector' | null;
};

export type FairValueResult = {
  currentPrice: number | null;
  estimatedFairValue: number | null;
  differencePercent: number | null;
  status:
    | 'below-model-reference'
    | 'near-model-reference'
    | 'above-model-reference'
    | 'insufficient-data';
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  eligible: boolean;
  currency: string | null;
  methods: FairValueMethod[];
};

export type EarningsOutlookComponent = {
  value: number | null;
  score: number | null;
  weight: number;
};

export type EarningsOutlookResult = {
  status: 'improving' | 'stable' | 'mixed' | 'weakening' | 'insufficient-data';
  score: number | null;
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  eligible: boolean;
  analystCount: number | null;
  revisionPeriodDays: number | null;
  currentPeriod: string | null;
  nextPeriod: string | null;
  eps: {
    currentEstimate: number | null;
    nextEstimate: number | null;
    forwardGrowthPercent: number | null;
    revisionPercent: number | null;
  };
  revenue: {
    currentEstimate: number | null;
    nextEstimate: number | null;
    forwardGrowthPercent: number | null;
    revisionPercent: number | null;
  };
  components: Record<string, EarningsOutlookComponent>;
};

export type InvestmentCaseItem = {
  key: string;
  title: string;
  evidence: string;
  source: 'scorecard' | 'earnings-outlook' | 'fair-value' | 'peer-comparison' | 'data-quality';
  importance: number;
};

export type InvestmentCaseResult = {
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  strengths: InvestmentCaseItem[];
  watch: InvestmentCaseItem[];
  risks: InvestmentCaseItem[];
};
