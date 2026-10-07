import type {PreparedInput} from '../prepared-stock.type';
const unique = (values: string[]): string[] => [...new Set(values)];
const LEAVES: Record<string, string[]> = {
  quality: [
    'cashConversion',
    'freeCashFlowMargin',
    'grossMargin',
    'operatingMargin',
    'profitabilityConsistency',
    'roic',
  ],
  growth: [
    'analystCount',
    'epsCagr3Y',
    'epsGrowthYoY',
    'forwardEpsGrowth',
    'forwardRevenueGrowth',
    'revenueAcceleration',
    'revenueCagr3Y',
    'revenueGrowthConsistency',
    'revenueGrowthYoY',
  ],
  valuation: ['evToEbitda', 'fcfYield', 'forwardPe', 'pe', 'priceToBook', 'priceToFcf', 'priceToSales'],
  financialHealth: [
    'cash',
    'cashToShortTermDebt',
    'currentRatio',
    'debtGrowthYoY',
    'freeCashFlowMargin',
    'interestCoverage',
    'interestExpenseTtm',
    'netDebtToEbitda',
    'shortTermDebt',
    'totalDebt',
  ],
  momentum: ['price', 'priceAvg200', 'priceAvg50', 'return12m', 'return1m', 'return3m', 'return6m'],
  earningsQuality: ['accrualRatio', 'cashConversion', 'fcfConversion', 'operatingMarginChangeYoY'],
  capitalEfficiency: ['capexIntensity', 'incrementalRoic', 'revenueToInvestedCapital', 'roic'],
  cashPower: ['cashConversion', 'fcfConversion', 'freeCashFlowGrowthYoY', 'freeCashFlowMargin', 'positiveFcfQuarters'],
  fundingPressure: ['cashRunwayQuarters', 'currentRatio', 'debtGrowthYoY', 'dilutedShareGrowthYoY', 'freeCashFlow'],
  dilutionRisk: [
    'cashRunwayQuarters',
    'dilutedShareGrowthYoY',
    'freeCashFlow',
    'freeCashFlowMargin',
    'netStockIssuanceToRevenue',
    'stockBasedCompensationToRevenue',
  ],
  growthDurability: [
    'freeCashFlowGrowthYoY',
    'operatingMarginChangeYoY',
    'revenueGrowthConsistency',
    'revenueGrowthTtm',
    'roic',
  ],
  marginPower: ['grossMargin', 'grossMarginChangeYoY', 'operatingMargin', 'operatingMarginChangeYoY'],
  capitalDiscipline: ['capexIntensity', 'debtGrowthYoY', 'dilutedShareGrowthYoY', 'incrementalRoic', 'roic'],
  businessEfficiency: ['operatingMargin', 'revenueToInvestedCapital', 'roic'],
  fundamentalMomentum: ['epsGrowthYoY', 'freeCashFlowGrowthYoY', 'operatingMarginChangeYoY', 'revenueAcceleration'],
  operatingLeverage: ['incrementalOperatingMargin', 'operatingMarginChangeYoY', 'revenueGrowthYoY'],
  recovery: ['price', 'yearHigh'],
  highQuality: [
    'cashConversion',
    'freeCashFlow',
    'freeCashFlowMargin',
    'operatingMargin',
    'positiveFcfQuarters',
    'profitabilityConsistency',
    'roic',
  ],
  highGrowth: [
    'epsGrowthYoY',
    'forwardRevenueGrowth',
    'operatingIncomeGrowthYoY',
    'revenueAcceleration',
    'revenueCagr3Y',
    'revenueGrowthConsistency',
    'revenueGrowthTtm',
    'revenueGrowthYoY',
  ],
  undervalued: ['evToEbitda', 'fcfYield', 'forwardPe', 'freeCashFlow', 'netIncomeTtm', 'pe', 'priceToSales'],
};
const COMPOSITES: Record<string, string[]> = {
  conviction: [
    'quality',
    'growth',
    'valuation',
    'financialHealth',
    'earningsQuality',
    'capitalEfficiency',
    'fundamentalMomentum',
  ],
  balanceSheetResilience: ['financialHealth', 'cashPower', 'fundingPressure'],
  earningsReliability: ['earningsQuality', 'cashPower', 'marginPower'],
  execution: ['fundamentalMomentum', 'cashPower', 'marginPower', 'financialHealth'],
  selfFunding: ['cashPower', 'financialHealth', 'dilutionRisk', 'fundingPressure'],
  survival: ['financialHealth', 'cashPower', 'fundingPressure', 'dilutionRisk'],
  dilution: ['dilutionRisk'],
  shareholderFriendliness: ['dilution', 'capitalDiscipline', 'financialHealth', 'cashPower'],
  recovery: ['fundamentalMomentum', 'financialHealth'],
  reratingPotential: ['fundamentalMomentum', 'growthDurability', 'marginPower', 'valuation', 'recovery'],
  valuationCompressionRisk: ['valuation', 'growth', 'marginPower', 'momentum'],
  breakoutReadiness: ['momentum', 'fundamentalMomentum', 'marginPower', 'growth'],
};
export const PEER_KEYS = [
  'revenueGrowthYoY',
  'revenueGrowthTtm',
  'revenueCagr3Y',
  'epsGrowthYoY',
  'grossMargin',
  'operatingMargin',
  'netMargin',
  'freeCashFlowMargin',
  'roic',
  'revenueToInvestedCapital',
  'capexIntensity',
  'pe',
  'forwardPe',
  'priceToSales',
  'priceToBook',
  'priceToFcf',
  'evToEbitda',
  'fcfYield',
  'return3m',
  'return6m',
  'return12m',
];
export function scoreDependencies(input: PreparedInput): Record<string, string[]> {
  const keys = unique([
    ...Object.keys(LEAVES).filter((key) => !['highQuality', 'highGrowth', 'undervalued'].includes(key)),
    ...Object.keys(COMPOSITES),
  ]);
  const expand = (key: string): string[] => {
    let direct = [...(LEAVES[key] ?? [])];
    if (
      ['fundingPressure', 'dilutionRisk'].includes(key) &&
      input.metrics.freeCashFlow !== null &&
      input.metrics.freeCashFlow >= 0
    )
      direct = direct.filter((k) => k !== 'cashRunwayQuarters');
    if (key === 'financialHealth') {
      if (input.metrics.shortTermDebt === 0 && input.metrics.cash !== null)
        direct = direct.filter((k) => k !== 'cashToShortTermDebt');
      if (input.metrics.totalDebt === 0) direct = direct.filter((k) => k !== 'debtGrowthYoY');
      if (input.metrics.totalDebt === 0 && input.metrics.interestExpenseTtm === 0)
        direct = direct.filter((k) => k !== 'interestCoverage');
    }
    return unique([...direct, ...(COMPOSITES[key] ?? []).flatMap(expand)]);
  };
  return {
    ...Object.fromEntries(keys.map((key) => [key, expand(key)])),
    risk: ['risk.riskScore'],
    volatility: ['risk.volatilityScore'],
  };
}
export function listDependencies(): Record<string, string[]> {
  const quality = LEAVES.highQuality;
  const growth = LEAVES.highGrowth;
  const valuation = LEAVES.undervalued;
  const near = ['momentum.price', 'momentum.yearHigh', 'momentum.yearLow'];
  const momentum = ['return3m', 'return6m', 'return12m', 'price', 'priceAvg200'];
  const profile = ['company.companyName', 'company.sector', 'company.industry'];
  const lists: Record<string, string[]> = {
    'financially-strong': [
      'operatingMargin',
      'freeCashFlowMargin',
      'freeCashFlow',
      'currentRatio',
      'interestCoverage',
      'netDebtToEbitda',
      'revenueGrowthTtm',
      'revenueAcceleration',
      'dilutedShareGrowthYoY',
    ],
    'strong-balance-sheet': [
      'cash',
      'totalDebt',
      'debtToEquity',
      'currentRatio',
      'operatingIncomeTtm',
      'interestExpenseTtm',
      'ebitdaTtm',
      'freeCashFlow',
      'operatingMargin',
    ],
    'high-quality': quality,
    'high-growth': growth,
    undervalued: valuation,
    'strong-momentum': momentum,
    'estimates-rising': [
      'estimates.epsRevision',
      'estimates.revenueRevision',
      'estimates.revisionDays',
      'estimates.analystCount',
    ],
    'quality-near-lows': [...quality, ...near],
    'quality-near-highs': [...quality, ...near],
    'growth-near-lows': [...growth, ...near],
    'oversold-quality': [...quality, ...near, 'momentum.rsi14'],
    'undervalued-momentum': [...valuation, ...momentum],
    'small-cap-quality': [...quality, 'company.currency'],
    'small-cap-growth': [...growth, 'company.currency'],
    'low-cap-ai': [...profile, 'company.currency'],
    'low-cap-ai-growth': [...profile, ...growth, 'company.currency'],
    ...Object.fromEntries(
      ['ai', 'semiconductors', 'data-centers', 'energy', 'cybersecurity', 'robotics'].map((theme) => [
        `theme-${theme}`,
        profile,
      ]),
    ),
  };
  return Object.fromEntries(
    Object.entries(lists).map(([id, fields]) => [
      id,
      unique([...fields, 'marketCap', 'company.marketCap', 'price', 'company.sector']),
    ]),
  );
}