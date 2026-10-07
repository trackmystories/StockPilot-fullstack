import type { Allocation, PortfolioAnalysis, PortfolioCurrency, PortfolioHolding, PortfolioListItem, TransactionInput } from './portfolio';

export type InvestmentStock = {
  instrumentId?: string;
  symbol: string;
  companyName: string;
  currency: string | null;
  logoUrl?: string | null;
  exchange?: string | null;
};

export type InvestmentDraft = {
  stock: InvestmentStock;
  quantity: string;
  unitPrice: string;
  date: string;
};

const SCALE = BigInt(100000000);
const decimalPattern = /^-?\d+(?:\.\d{1,8})?$/;

function units(value: string): bigint {
  if (!decimalPattern.test(value)) throw new Error('Invalid saved decimal value.');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const amount = BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, '0'));
  return negative ? -amount : amount;
}

function decimal(value: bigint): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const fraction = String(absolute % SCALE).padStart(8, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${absolute / SCALE}${fraction ? `.${fraction}` : ''}`;
}

function sum(values: (string | null)[]): string | null {
  if (values.some((value) => value === null)) return null;
  return decimal(values.reduce<bigint>((total, value) => total + units(value!), BigInt(0)));
}

export function normalizedCurrency(value?: string | null): PortfolioCurrency | null {
  const currency = value?.trim().toUpperCase();
  return currency === 'USD' || currency === 'EUR' ? currency : null;
}

export function currencyCompatible(stockCurrency: string | null, _portfolioCurrency: PortfolioCurrency): boolean {
  return !stockCurrency?.trim() || normalizedCurrency(stockCurrency) !== null;
}

export function visiblePortfolios(items: PortfolioListItem[]): PortfolioListItem[] {
  // Existing model portfolios are still user data. Do not hide or convert them.
  return items.filter((item) => !item.portfolio.archived && !item.portfolio.deleting);
}

export function holdingReportingValue(holding: PortfolioHolding, currency: PortfolioCurrency): string | null {
  if (holding.reportingCurrency === currency) return holding.reportingValue ?? null;
  return holding.instrument.currency === currency ? holding.marketValue : null;
}

export function holdingReportingCost(holding: PortfolioHolding, currency: PortfolioCurrency): string | null {
  if (holding.reportingCurrency === currency) return holding.reportingCost ?? null;
  return holding.instrument.currency === currency ? holding.costBasis : null;
}

export function holdingReportingGain(holding: PortfolioHolding, currency: PortfolioCurrency): string | null {
  const value = holdingReportingValue(holding, currency);
  const cost = holdingReportingCost(holding, currency);
  return value === null || cost === null ? null : decimal(units(value) - units(cost));
}

export function stockSummary(analysis: PortfolioAnalysis) {
  const holdings = analysis.holdings;
  const value = sum(holdings.map((holding) => holdingReportingValue(holding, analysis.currency)));
  const pricedSubtotal = sum(holdings.map((holding) => holdingReportingValue(holding, analysis.currency) ?? '0'))!;
  const invested = sum(holdings.map((holding) => holdingReportingCost(holding, analysis.currency)));
  const gain = value === null || invested === null ? null : decimal(units(value) - units(invested));
  return {
    value,
    pricedSubtotal,
    invested,
    gain,
    gainPercent: gain !== null && invested !== null && Number(invested) > 0 ? Number(gain) / Number(invested) * 100 : null,
    unpriced: holdings.filter((holding) => holdingReportingValue(holding, analysis.currency) === null).length,
  };
}

export function stockAllocations(holdings: PortfolioHolding[], field: 'sector' | 'industry', currency: PortfolioCurrency): Allocation[] {
  const groups = new Map<string, bigint>();
  let total = BigInt(0);
  for (const holding of holdings) {
    const reportingValue = holdingReportingValue(holding, currency);
    if (reportingValue === null) continue;
    const value = units(reportingValue);
    if (value <= BigInt(0)) continue;
    const label = holding[field]?.trim() || 'Unclassified';
    groups.set(label, (groups.get(label) ?? BigInt(0)) + value);
    total += value;
  }
  return [...groups].map(([label, value]) => ({
    label,
    value: decimal(value),
    weight: total > BigInt(0) ? Number(value) / Number(total) * 100 : 0,
  })).sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));
}

function positiveInput(value: string, label: string): string {
  const normalized = value.trim().replace(',', '.').replace(/^\./, '0.');
  if (!/^\d+(?:\.\d{1,8})?$/.test(normalized) || units(normalized) <= BigInt(0) || units(normalized) > units('1000000000000')) {
    throw new Error(`${label} must be a positive number with up to eight decimal places.`);
  }
  return normalized;
}

export function investmentTotal(quantity: string, price: string): string | null {
  try {
    const q = units(positiveInput(quantity, 'Quantity'));
    const p = units(positiveInput(price, 'Purchase price'));
    return decimal((q * p + SCALE / BigInt(2)) / SCALE);
  } catch {
    return null;
  }
}

export function investmentInput(draft: InvestmentDraft, requestId: string, today = new Date().toISOString().slice(0, 10)): TransactionInput {
  const date = draft.date.trim();
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > today) {
    throw new Error('Enter a valid purchase date (YYYY-MM-DD), not a future date.');
  }
  const symbol = draft.stock.symbol.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) throw new Error('Choose a valid stock.');
  const currency = normalizedCurrency(draft.stock.currency);
  if (!currency) throw new Error('Resolve the stock currency before recording the investment.');
  const quantity = positiveInput(draft.quantity, 'Quantity');
  const unitPrice = positiveInput(draft.unitPrice, 'Purchase price');
  const total = investmentTotal(quantity, unitPrice);
  if (total === null || units(total) > units('1000000000000000')) throw new Error('Investment amount is too large.');
  return {
    requestId,
    // The existing backend supports cashless, additive position imports as "opening".
    // A "buy" would require a cash deposit. Never fabricate deposits to bypass that rule.
    kind: 'opening',
    date,
    symbol,
    currency,
    ...(draft.stock.instrumentId ? {instrumentId: draft.stock.instrumentId} : {}),
    quantity,
    unitPrice,
    amount: null,
    fees: '0',
    splitRatio: null,
    note: '',
  };
}
