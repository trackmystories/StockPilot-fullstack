import type {SelectStock} from '../../StockPilot/types/stockPilot';
import type {SearchStockPreview} from '../types/stockSearch';

function emptyMetric() {
  return {
    score: null,
    description: 'Not available.',
  };
}

export function searchStockToSelectStock(
  stock: SearchStockPreview,
): SelectStock {
  return {
    symbol: stock.symbol,
    companyName: stock.companyName,
    logoUrl: stock.logoUrl ?? null,

    themeId: '' as SelectStock['themeId'],
    themeName: '',
    sector: '',

    marketCap: null,

    score: null,

    riskScore: null,
    riskLevel: null,
    volatilityScore: null,
    momentumScore: null,

    thesis: '',

    price: null,
    change: null,
    changePercentage: null,

    featured: false,

    trend: [],

    revenueGrowth: null,
    profitability: null,
    debt: null,
    analystUpside: null,
    momentum: null,
    percentFromATH: null,
    percentFromATL: null,

    growth: emptyMetric(),
    valuation: emptyMetric(),
    financialHealth: emptyMetric(),
    marketOutlook: emptyMetric(),

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
      currency: stock.currency ?? 'USD',
      asOf: null,
      status: 'unavailable',
    },

    sources: [],
  };
}