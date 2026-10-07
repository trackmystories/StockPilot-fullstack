import type {SelectStock} from '../StockPilot/types/stockPilot';

type RecordValue = Record<string, unknown>;

const record = (value: unknown): RecordValue => {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as RecordValue;
  }

  return {};
};

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const rows = (value: unknown): RecordValue[] => (Array.isArray(value) ? value.map(record) : []);

const choice = <T extends string>(value: unknown, values: readonly T[]): T | null => {
  return values.includes(value as T) ? (value as T) : null;
};

const metric = (value: unknown) => {
  const data = record(value);

  return {
    score: num(data.score),
    description: str(data.description) || 'Not available.',
  };
};

export function normalizeStock(value: unknown): SelectStock {
  const data = record(value);

  if (!str(data.symbol).trim() || !str(data.companyName).trim()) {
    throw new Error('Stock record is missing its symbol or company name.');
  }

  const earnings = record(data.earnings);
  const targets = record(data.priceTargets);
  const thesis = record(data.investmentThesis);
  const reported = record(data.latestReported);
  const quote = record(data.quote);

  return {
    symbol: str(data.symbol).trim().toUpperCase(),
    companyName: str(data.companyName),

    themeId: str(data.themeId) as SelectStock['themeId'],
    themeName: str(data.themeName),
    sector: str(data.sector),

    marketCap: choice(data.marketCap, ['Small', 'Mid', 'Large', 'Mega'] as const),

    score: num(data.score),

    riskLevel: choice(data.riskLevel, ['low', 'medium', 'high'] as const),

    thesis: str(data.thesis),

    price: num(data.price),
    change: num(data.change),
    changePercentage: num(data.changePercentage),

    featured: data.featured === true,

    trend: Array.isArray(data.trend)
      ? data.trend.filter((item): item is number => num(item) !== null)
      : [],

    revenueGrowth: num(data.revenueGrowth),

    profitability: choice(data.profitability, [
      'Profitable',
      'Unprofitable',
      'High Margin',
    ] as const),

    debt: choice(data.debt, ['Low Debt', 'Moderate Debt', 'High Debt'] as const),

    analystUpside: num(data.analystUpside),

    momentum: choice(data.momentum, ['Weak', 'Neutral', 'Strong'] as const),

    percentFromATH: num(data.percentFromATH),
    percentFromATL: num(data.percentFromATL),

    growth: metric(data.growth),
    valuation: metric(data.valuation),
    financialHealth: metric(data.financialHealth),
    marketOutlook: metric(data.marketOutlook),

    highlights: rows(data.highlights).map((item, index) => ({
      id: str(item.id) || String(index),
      title: str(item.title),
      subtitle: str(item.subtitle),
      value: str(item.value),
    })),

    investmentThesis: {
      confidence: choice(thesis.confidence, ['Low', 'Medium', 'High'] as const),
      text: str(thesis.text) || str(data.thesis),
    },

    earnings: {
      nextEarnings: str(earnings.nextEarnings) || null,
      estimatedEps: num(earnings.estimatedEps),
      epsGrowth: num(earnings.epsGrowth),
      estimatedRevenue: str(earnings.estimatedRevenue) || null,
      revenueGrowth: num(earnings.revenueGrowth),
    },

    catalysts: rows(data.catalysts).map((item, index) => ({
      ...item,
      id: str(item.id) || String(index),
      date: str(item.date),
      title: str(item.title),
      description: str(item.description),
    })),

    priceTargets: {
      bear: num(targets.bear),
      base: num(targets.base),
      bull: num(targets.bull),
    },

    upsidePotential: num(data.upsidePotential),

    bullCase: strings(data.bullCase),
    bearCase: strings(data.bearCase),

    latestReported: Object.keys(reported).length
      ? {
          period: str(reported.period),
          reportedDate: str(reported.reportedDate),
          revenue: num(reported.revenue),
          revenueCurrency: str(reported.revenueCurrency),
          revenueGrowthYoY: num(reported.revenueGrowthYoY),
          accountingStandard: str(reported.accountingStandard),
          reportedEps: num(reported.reportedEps),
          epsCurrency: str(reported.epsCurrency),
          epsBasis: str(reported.epsBasis),
          adjustedEps: num(reported.adjustedEps),
          notes: str(reported.notes),
          sourceId: str(reported.sourceId),
        }
      : null,

    quote: Object.keys(quote).length
      ? {
          currency: str(quote.currency) || 'USD',
          asOf: str(quote.asOf) || null,
          source: str(quote.source) || undefined,
          status: quote.status === 'available' ? 'available' : 'unavailable',
        }
      : null,

    sources: rows(data.sources).map((item) => ({
      id: str(item.id),
      title: str(item.title),
      url: str(item.url),
      publishedDate: str(item.publishedDate) || null,
    })),
  };
}

export function parseStocksResponse(value: unknown): SelectStock[] {
  const payload = record(value);

  if (!Array.isArray(payload.stocks)) {
    throw new Error('Invalid stock response from server.');
  }

  return payload.stocks.map(normalizeStock);
}

export async function fetchStocks(
  baseUrl: string | undefined,
  token: string,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<SelectStock[]> {
  if (!baseUrl) {
    throw new Error('Set EXPO_PUBLIC_API_URL to your server address.');
  }

  const response = await request(`${baseUrl.replace(/\/$/, '')}/api/stocks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Session expired. Please sign in again.'
        : 'Could not load stocks. Please try again.',
    );
  }

  return parseStocksResponse(await response.json());
}
