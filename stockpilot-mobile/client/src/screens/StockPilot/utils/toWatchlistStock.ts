import type {WatchlistStock} from '../../WatchList/application/watchlistMomentum';
import type {StockRiskDetails} from '../infrastructure/HttpStockRiskRepository';
import type {SelectStock, StockMarketQuote} from '../types/stockPilot';

function createEmptyMetric() {
  return {
    score: null,
    description: 'Not available.',
  };
}

function getMarketCapSize(value: number | null | undefined): SelectStock['marketCap'] {
  if (value == null) {
    return null;
  }

  if (value >= 200e9) {
    return 'Mega';
  }

  if (value >= 10e9) {
    return 'Large';
  }

  if (value >= 2e9) {
    return 'Mid';
  }

  return 'Small';
}

export function toWatchlistStock(
  symbol: string,
  quote?: StockMarketQuote,
  risk?: StockRiskDetails,
  momentumScore: number | null = null,
): WatchlistStock {
  return {
    symbol,
    companyName: risk?.companyName || quote?.name || symbol,
    logoUrl: risk?.logoUrl ?? null,
    themeId: '' as SelectStock['themeId'],
    themeName: '',
    sector: '',
    marketCap: getMarketCapSize(quote?.marketCap),
    score: null,
    riskScore: risk?.riskScore ?? null,
    riskLevel: risk?.riskLevel ?? null,
    volatilityScore: risk?.volatilityScore ?? null,
    thesis: '',
    price: quote?.price ?? null,
    change: quote?.change ?? null,
    changePercentage: quote?.changePercentage ?? null,
    featured: false,
    trend: [],
    revenueGrowth: null,
    profitability: null,
    debt: null,
    analystUpside: null,
    momentum: null,
    momentumScore,
    percentFromATH: null,
    percentFromATL: null,
    growth: createEmptyMetric(),
    valuation: createEmptyMetric(),
    financialHealth: createEmptyMetric(),
    marketOutlook: createEmptyMetric(),
    highlights: [],
    investmentThesis: {
      confidence: null,
      text: '',
    },
    earnings: {
      nextEarnings: null,
      estimatedEps: null,
      epsGrowth: null,
      estimatedRevenue: null,
      revenueGrowth: null,
    },
    catalysts: [],
    priceTargets: {
      bear: null,
      base: null,
      bull: null,
    },
    upsidePotential: null,
    bullCase: [],
    bearCase: [],
    quote: {
      currency: 'USD',
      asOf: quote?.asOf ?? null,
      source: quote?.source,
      status: quote?.price != null ? 'available' : 'unavailable',
    },
  };
}
