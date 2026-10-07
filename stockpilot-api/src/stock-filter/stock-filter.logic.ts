import {enforceScorecardEvidence} from '../intelligence/scorecard-evidence';
import type {StockIntelligence} from '../intelligence/types';
import {SCORE_KEYS, type FilterNode, type FilterSection, type FilterSort, type FilterStock, type ScoreKey} from './stock-filter.types';
export const FILTER_METRIC_KEYS = [
  'pe',
  'forwardPe',
  'fcfYield',
  'netIncomeTtm',
  'freeCashFlow',
  'revenueGrowthYoY',
  'epsGrowthYoY',
  'debtToEquity',
  'currentRatio',
  'roic',
  'operatingMargin',
  'interestCoverage',
  'netDebtToEbitda',
  // Required by the existing operating-leverage evidence policy.
  'operatingIncomeTtm',
  'incrementalOperatingMargin',
  'marketCap',
  'price'
] as const;
type SavedDocument = Record<string, unknown>;
type Predicate = (stock: FilterStock) => boolean;
type Clause = {
  group: string;
  test: Predicate;
};
export type FilterCatalog = {
  stocks: FilterStock[];
  sections: FilterSection[];
  clauses: Map<string, Clause>;
};
const record = (value: unknown): SavedDocument => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as SavedDocument : {};
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
function date(value: unknown): string | null {
  const time = typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(time) && Math.abs(time) <= 8640000000000000 ? new Date(time).toISOString() : null;
}
export function savedDataIsStale(calculatedAt: string | null, quoteAsOf: string | null, now = Date.now()): boolean {
  const times = [calculatedAt, quoteAsOf].map((value) => value ? Date.parse(value) : NaN);
  return times.some((time) => !Number.isFinite(time) || time > now) || now - Math.min(...times) > 8 * 86400000;
}
export function mapSavedStock(symbol: string, input: SavedDocument, saved: SavedDocument, now = Date.now(), universe: SavedDocument = {}): FilterStock {
  const company = record(input.company);
  const source = record(input.sourceObservations);
  const quote = record(source.quote);
  const profile = record(source.profile);
  const data = record(saved.data);
  // A prepared-only stock still has useful saved metrics. A scorecard's metric
  // snapshot takes precedence as a whole, including intentional null values.
  const hasSavedMetrics = data.metrics !== null && typeof data.metrics === 'object' && !Array.isArray(data.metrics);
  const metrics = record(hasSavedMetrics ? data.metrics : input.metrics);
  const quality = record(metrics.dataQuality);
  const rawScores = record(data.scores);
  // Apply the SAME evidence policy as the existing scorecard endpoint, not new calculations.
  const safeScores = Object.fromEntries(SCORE_KEYS.map((key) => {
    const sourceScore = record(rawScores[key]);
    const components = Object.fromEntries(Object.entries(record(sourceScore.components)).filter(([, value]) => value !== null && typeof value === 'object'));
    return [
      key,
      {
        ...sourceScore,
        score: number(sourceScore.score),
        coverage: number(sourceScore.coverage) ?? 0,
        components
      }
    ];
  }));
  const card = enforceScorecardEvidence({scores: safeScores, metrics} as unknown as StockIntelligence);
  const scores = Object.fromEntries(SCORE_KEYS.map((key) => {
    const value = number(card.scores[key]?.score);
    return [key, value !== null && value >= 0 && value <= 10 ? value : null];
  })) as FilterStock['scores'];
  const calculatedAt = date(saved.calculatedAt) ?? date(data.generatedAt);
  const quoteAsOf = date(quality.priceAsOf) ?? date(source.observedAt) ?? date(saved.inputPreparedAt) ?? date(input.preparedAt);
  return {
    symbol: symbol.trim().toUpperCase(),
    companyName: text(company.companyName) ?? text(record(input.risk).companyName) ?? text(profile.companyName) ?? text(universe.companyName) ?? symbol,
    logoUrl: text(record(input.risk).logoUrl) ?? text(profile.image),
    exchange: text(company.exchange) ?? text(profile.exchangeShortName) ?? text(profile.exchange) ?? text(universe.exchange),
    sector: text(company.sector) ?? text(profile.sector) ?? text(universe.sector),
    industry: text(company.industry) ?? text(profile.industry) ?? text(universe.industry),
    currency: (text(quality.quoteCurrency) ?? text(company.currency) ?? text(profile.currency) ?? text(universe.currency))?.toUpperCase() ?? null,
    price: number(metrics.price) ?? number(company.price) ?? number(universe.price),
    marketCap: number(metrics.marketCap) ?? number(company.marketCap) ?? number(universe.marketCap),
    changePercentage: number(quote.changePercentage) ?? number(quote.changesPercentage),
    calculatedAt,
    quoteAsOf,
    stale: savedDataIsStale(calculatedAt, quoteAsOf, now),
    score: scores.overall,
    coverage: scores.overall === null ? null : number(card.scores.overall.coverage),
    riskScore: scores.risk,
    riskLevel: scores.risk === null ? null : scores.risk < 4 ? 'low' : scores.risk < 7 ? 'medium' : 'high',
    volatilityScore: scores.volatility,
    scores,
    metrics: Object.fromEntries(FILTER_METRIC_KEYS.map((key) => [key, number(metrics[key])])),
    secMetricsIncluded: hasSavedMetrics && record(metrics.secSupplement).status === 'used',
  };
}
export function buildCatalog(stocks: FilterStock[]): FilterCatalog {
  const sections: FilterSection[] = [];
  const clauses = new Map<string, Clause>();
  const option = (group: string, value: string, label: string, test: Predicate): FilterNode => {
    const id = `${group}:${encodeURIComponent(value)}`;
    clauses.set(id, {group, test});
    return {
      id,
      label,
      count: stocks.filter(test).length
    };
  };
  const categorical = (key: 'exchange' | 'sector', title: string) => {
    const values = [...new Set(stocks.map((stock) => stock[key]).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b));
    if (values.length)
      sections.push({
        id: key,
        title,
        mode: 'multiple',
        options: values.map((value) => option(key, value, value, (stock) => stock[key] === value))
      });
  };
  categorical('exchange', 'Exchange');
  categorical('sector', 'Sector');
  const industryGroups = new Map<string, Set<string>>();
  for (const stock of stocks) {
    if (!stock.industry)
      continue;
    const sector = stock.sector ?? 'Unclassified sector';
    if (!industryGroups.has(sector))
      industryGroups.set(sector, new Set());
    industryGroups.get(sector)!.add(stock.industry);
  }
  if (industryGroups.size)
    sections.push({
      id: 'industry',
      title: 'Industry',
      mode: 'multiple',
      description: 'Tap a sector arrow to see its industries. The numbers count stocks, not industries.',
      options: [...industryGroups].sort(([a], [b]) => a.localeCompare(b)).map(([sector, industries]) => ({
        id: `industry-group:${encodeURIComponent(sector)}`,
        label: sector,
        count: stocks.filter((stock) => (stock.sector ?? 'Unclassified sector') === sector && stock.industry !== null).length,
        children: [...industries].sort((a, b) => a.localeCompare(b)).map((industry) => option('industry', JSON.stringify([sector, industry]), industry, (stock) => (stock.sector ?? 'Unclassified sector') === sector && stock.industry === industry)),
      })),
    });
  const scoreTitles = {
    overall: 'Overall score',
    quality: 'Quality',
    growth: 'Growth',
    valuation: 'Value',
    financialHealth: 'Financial strength',
    momentum: 'Momentum',
    conviction: 'Conviction',
    earningsQuality: 'Earnings quality',
    capitalEfficiency: 'Capital efficiency',
    reratingPotential: 'Rerating potential',
    execution: 'Execution',
    cashPower: 'Cash power',
    fundingPressure: 'Funding pressure',
    dilutionRisk: 'Dilution risk',
    balanceSheetResilience: 'Balance sheet resilience',
    growthDurability: 'Growth durability',
    marginPower: 'Margin power',
    capitalDiscipline: 'Capital discipline',
    earningsReliability: 'Earnings reliability',
    businessEfficiency: 'Business efficiency',
    valuationCompressionRisk: 'Valuation compression risk',
    recovery: 'Recovery',
    breakoutReadiness: 'Breakout readiness',
    fundamentalMomentum: 'Fundamental momentum',
    survival: 'Survival',
    shareholderFriendliness: 'Shareholder friendliness',
    selfFunding: 'Self-funding',
    operatingLeverage: 'Operating leverage',
    dilution: 'Dilution safety',
  } satisfies Record<Exclude<ScoreKey, 'risk' | 'volatility'>, string>;
  const lowerIsBetter = new Set<ScoreKey>(['fundingPressure', 'dilutionRisk', 'valuationCompressionRisk']);
  for (const key of Object.keys(scoreTitles) as Array<keyof typeof scoreTitles>) {
    if (!stocks.some((stock) => stock.scores[key] !== null))
      continue;
    const lower = lowerIsBetter.has(key);
    sections.push({
      id: key,
      title: scoreTitles[key],
      mode: 'single',
      description: lower ? 'Maximum saved score, out of 10. Lower is better. Choose one.' : 'Minimum saved score, out of 10. Choose one.',
      options: (lower ? [3, 5, 7] : [5, 6, 7, 8, 9]).map((threshold) => option(
        key,
        String(threshold),
        lower ? `${threshold} or lower / 10` : `${threshold}+ / 10`,
        (stock) => stock.scores[key] !== null && (lower ? stock.scores[key]! <= threshold : stock.scores[key]! >= threshold),
      )),
    });
  }
  if (stocks.some((stock) => stock.riskLevel !== null))
    sections.push({
      id: 'risk',
      title: 'Risk level',
      mode: 'multiple',
      options: (['low', 'medium', 'high'] as const).map((level) => option('risk', level, `${level[0].toUpperCase()}${level.slice(1)} risk`, (stock) => stock.riskLevel === level))
    });
  if (stocks.some((stock) => stock.volatilityScore !== null))
    sections.push({
      id: 'volatility',
      title: 'Volatility',
      mode: 'multiple',
      description: 'Saved score bands: low <4, medium 4–<7, high 7–10.',
      options: (['low', 'medium', 'high'] as const).map((level) => option('volatility', level, `${level[0].toUpperCase()}${level.slice(1)}`, (stock) => {
        const score = stock.volatilityScore;
        return score !== null && (level === 'low' ? score < 4 : level === 'medium' ? score >= 4 && score < 7 : score >= 7);
      }))
    });
  const sizes = [
    {
      id: 'micro',
      label: 'Micro · under $300M',
      min: 0,
      max: 3e8
    },
    {
      id: 'small',
      label: 'Small · $300M–$2B',
      min: 3e8,
      max: 2e9
    },
    {
      id: 'mid',
      label: 'Mid · $2B–$10B',
      min: 2e9,
      max: 1e10
    },
    {
      id: 'large',
      label: 'Large · $10B–$200B',
      min: 1e10,
      max: 2e11
    },
    {
      id: 'mega',
      label: 'Mega · $200B+',
      min: 2e11,
      max: Infinity
    }
  ];
  if (stocks.some((stock) => stock.currency === 'USD' && stock.marketCap !== null && stock.marketCap > 0))
    sections.push({
      id: 'marketCap',
      title: 'Company size',
      mode: 'multiple',
      description: 'USD market caps only; no currency conversion is assumed.',
      options: sizes.map((size) => option('marketCap', size.id, size.label, (stock) => stock.currency === 'USD' && stock.marketCap !== null && stock.marketCap > 0 && stock.marketCap >= size.min && stock.marketCap < size.max))
    });
  const metricSection = (key: string, title: string, thresholds: number[], comparison: 'above' | 'below', suffix = '', positiveOnly = false) => {
    if (!stocks.some((stock) => typeof stock.metrics[key] === 'number'))
      return;
    sections.push({
      id: key,
      title,
      mode: 'single',
      options: thresholds.map((value) => option(key, String(value), `${comparison === 'above' ? 'Above' : 'Below'} ${value}${suffix}`, (stock) => {
        const actual = stock.metrics[key];
        return typeof actual === 'number' && Number.isFinite(actual) && (!positiveOnly || actual > 0) && (key !== 'debtToEquity' || actual >= 0) && (comparison === 'above' ? actual > value : actual < value);
      }))
    });
  };
  for (const [key, title, label] of [
    ['netIncomeTtm', 'Profitability', 'Profitable · positive trailing net income'],
    ['freeCashFlow', 'Cash flow', 'Positive trailing free cash flow']
  ] as const) {
    if (stocks.some((stock) => typeof stock.metrics[key] === 'number'))
      sections.push({
        id: key,
        title,
        mode: 'single',
        options: [option(key, 'positive', label, (stock) => typeof stock.metrics[key] === 'number' && stock.metrics[key]! > 0)]
      });
  }
  metricSection('revenueGrowthYoY', 'Revenue growth', [0, 10, 20, 30], 'above', '%');
  metricSection('epsGrowthYoY', 'EPS growth', [0, 10, 20, 30], 'above', '%');
  metricSection('pe', 'P/E', [10, 20, 30], 'below', '×', true);
  metricSection('forwardPe', 'Forward P/E', [10, 20, 30], 'below', '×', true);
  metricSection('fcfYield', 'Free cash flow yield', [3, 5, 8], 'above', '%');
  metricSection('debtToEquity', 'Debt / equity', [0.5, 1, 2], 'below', '×');
  metricSection('currentRatio', 'Current ratio', [1, 1.5, 2], 'above', '×');
  metricSection('roic', 'Return on invested capital (ROIC)', [5, 10, 15, 20], 'above', '%');
  metricSection('operatingMargin', 'Operating margin', [0, 10, 20, 30], 'above', '%');
  metricSection('interestCoverage', 'Interest coverage', [3, 5, 10], 'above', '×');
  metricSection('netDebtToEbitda', 'Net debt / EBITDA', [1, 2, 3], 'below', '×');
  if (stocks.some((stock) => stock.secMetricsIncluded))
    sections.push({
      id: 'sec',
      title: 'Research evidence',
      mode: 'single',
      description: 'Means SEC metrics were incorporated into the saved scorecard, not merely that filings exist.',
      options: [option('sec', 'used', 'SEC metrics included', (stock) => stock.secMetricsIncluded)]
    });
  return {
    stocks,
    sections,
    clauses
  };
}
export function queryCatalog(catalog: FilterCatalog, selectedIds: string[], sort: FilterSort): FilterStock[] {
  const groups = new Map<string, Clause[]>();
  for (const id of new Set(selectedIds)) {
    const clause = catalog.clauses.get(id);
    if (!clause)
      throw new Error('One or more filters are no longer available. Reopen the filters and clear those selections.');
    const group = groups.get(clause.group) ?? [];
    group.push(clause);
    groups.set(clause.group, group);
  }
  for (const section of catalog.sections) if (section.mode === 'single' && (groups.get(section.id)?.length ?? 0) > 1)
    throw new Error(`Choose only one option for ${section.title}.`);
  const result = catalog.stocks.filter((stock) => [...groups.values()].every((options) => options.some((clause) => clause.test(stock))));
  return result.sort((a, b) => {
    if (sort !== 'symbol') {
      const first = sort === 'risk' ? a.riskScore : a.score;
      const second = sort === 'risk' ? b.riskScore : b.score;
      if (first === null && second !== null)
        return 1;
      if (first !== null && second === null)
        return -1;
      if (first !== null && second !== null && first !== second)
        return sort === 'risk' ? first - second : second - first;
    }
    return a.symbol.localeCompare(b.symbol);
  });
}