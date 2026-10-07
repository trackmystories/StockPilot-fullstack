export const PORTFOLIO_CURRENCIES = ['USD', 'EUR'] as const;
export type PortfolioCurrency = (typeof PORTFOLIO_CURRENCIES)[number];
export type PortfolioKind = 'real' | 'model';
export type TransactionKind = 'opening' | 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'dividend' | 'fee' | 'split';
export type DecimalString = string;

export type PortfolioInstrument = {
  id: string;
  symbol: string;
  companyName: string;
  exchange: string | null;
  currency: PortfolioCurrency;
  logoUrl: string | null;
};
export type CreatePortfolioInput = {
  requestId: string;
  name: string;
  currency: PortfolioCurrency;
};
export type UpdatePortfolioInput = {
  currency?: PortfolioCurrency;
  name?: string;
  archived?: boolean;
};
export type TransactionInput = {
  currency?: PortfolioCurrency;
  instrumentId?: string;
  requestId: string;
  kind: TransactionKind;
  date: string;
  symbol: string | null;
  quantity: DecimalString | null;
  unitPrice: DecimalString | null;
  amount: DecimalString | null;
  fees: DecimalString;
  splitRatio: DecimalString | null;
  note: string;
};
export type PortfolioTransaction = TransactionInput & {
  id: string;
  instrument: PortfolioInstrument | null;
  sequence: number;
  createdAt: string;
  voidedAt: string | null;
  fingerprint: string;
};
export type LedgerPosition = {
  instrument: PortfolioInstrument;
  quantity: DecimalString;
  costBasis: DecimalString | null;
  lastSplitDate: string | null;
};
export type PortfolioLedger = {
  cash: DecimalString;
  positions: LedgerPosition[];
  realisedGain: DecimalString | null;
  dividends: DecimalString;
  standaloneFees: DecimalString;
  totalFees: DecimalString;
  netCashDeposits: DecimalString;
};
export type PortfolioMeta = {
  ledgerCurrency?: PortfolioCurrency;
  deleting?: boolean;
  id: string;
  name: string;
  kind: PortfolioKind;
  currency: PortfolioCurrency;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
  transactionCount: number;
  historyEpoch: number;
  historyNote: string | null;
};
export type PortfolioMarketStock = {
  instrument: PortfolioInstrument;
  price: number | null;
  priceAsOf: string | null;
  stale: boolean;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  quality: number | null;
  financialHealth: number | null;
  momentum: number | null;
  freeCashFlow: number | null;
  revenueGrowth: number | null;
};
export type PortfolioHolding = LedgerPosition & {
  reportingValue?: DecimalString | null;
  reportingCost?: DecimalString | null;
  reportingGain?: DecimalString | null;
  reportingCurrency?: PortfolioCurrency;
  fxRate?: DecimalString | null;
  price: DecimalString | null;
  priceAsOf: string | null;
  marketValue: DecimalString | null;
  weight: number | null;
  unrealisedGain: DecimalString | null;
  unrealisedGainPercent: number | null;
  sector: string | null;
  industry: string | null;
  momentum: number | null;
  marketCap: number | null;
  stale: boolean;
  unavailableReason: string | null;
};
export type Allocation = {
  label: string;
  value: DecimalString;
  weight: number;
};
export type Characteristic = {
  id: string;
  label: string;
  matchingWeight: number | null;
  coverageWeight: number | null;
};
export type PortfolioInsight = {
  id: string;
  tone: 'info' | 'warning';
  title: string;
  text: string;
};
export type PortfolioAnalysis = {
  reportingVersion?: 2;
  gainBasis?: 'native_price_change_at_current_fx';
  fx?: {
    required: boolean;
    asOf: string | null;
    source: 'ECB' | null;
    eurUsd: DecimalString | null;
    stale: boolean;
    unavailable: boolean;
  };
  portfolioId: string;
  currency: PortfolioCurrency;
  revision: number;
  runId: string | null;
  calculatedAt: string;
  pricesAsOf: string | null;
  totalValue: DecimalString | null;
  pricedSubtotal: DecimalString;
  cash: DecimalString | null;
  holdingsValue: DecimalString | null;
  unrealisedGain: DecimalString | null;
  realisedGain: DecimalString | null;
  investmentGain: DecimalString | null;
  dividends: DecimalString | null;
  fees: DecimalString | null;
  netCashDeposits: DecimalString | null;
  holdings: PortfolioHolding[];
  sectors: Allocation[];
  industries: Allocation[];
  companySizes: Allocation[];
  characteristics: Characteristic[];
  insights: PortfolioInsight[];
  coverage: {
    priced: number;
    total: number;
    unpricedSymbols: string[];
    staleSymbols: string[];
    unknownCostSymbols: string[];
  };
};

export type PortfolioObservation = {
  date: string;
  observedAt: string;
  value: DecimalString | null;
  currency?: PortfolioCurrency;
  reportingVersion?: 2;
  fxAsOf?: string | null;
  revision: number;
  runId: string | null;
  epoch: number;
  netCashDeposits: DecimalString | null;
};

export type PortfolioDetail = {
  observations?: PortfolioObservation[];
  portfolio: PortfolioMeta;
  analysis: PortfolioAnalysis;
  activity: PortfolioTransaction[];
  nextActivityCursor: number | null;
};
export type PortfolioListItem = {
  portfolio: PortfolioMeta;
  analysis: PortfolioAnalysis;
};
export type PortfolioListResponse = {
  items: PortfolioListItem[];
};
