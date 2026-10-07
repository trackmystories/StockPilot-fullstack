import {confidenceFromCoverage} from '../scoring';
import type {
  IntelligenceCalculator,
  IntelligenceCalculatorInput,
  IntelligenceCalculatorResult,
} from './calculator.type';
import {calculateEstimatesRising} from './estimates-rising.calculator';
import {calculateFinanciallyStrong} from './financially-strong.calculator';
import {calculateHighGrowth} from './high-growth.calculator';
import {calculateHighQuality} from './high-quality.calculator';
import {calculateOversold} from './oversold.calculator';
import {calculatePricePosition} from './price-position.calculator';
import {calculateStrongBalanceSheet} from './strong-balance-sheet.calculator';
import {calculateStrongMomentum} from './strong-momentum.calculator';
import {calculateTheme, type StockTheme} from './theme.calculator';
import {calculateUndervalued} from './undervalued.calculator';
type Input = IntelligenceCalculatorInput;
type Result = IntelligenceCalculatorResult;
const baseResults = new WeakMap<Input, Map<string, unknown>>();
function once<T>(input: Input, key: string, calculate: () => T): T {
  let results = baseResults.get(input);
  if (!results) {
    results = new Map<string, unknown>();
    baseResults.set(input, results);
  }
  if (!results.has(key)) {
    results.set(key, calculate());
  }
  return results.get(key) as T;
}
const quality = (input: Input): Result =>
  once(input, 'quality', () => calculateHighQuality(input.financials, input.metrics));
const growth = (input: Input): Result =>
  once(input, 'growth', () => calculateHighGrowth(input.financials, input.metrics));
const valuation = (input: Input): Result =>
  once(input, 'valuation', () => calculateUndervalued(input.financials, input.company.marketCap, input.metrics));
const financialHealth = (input: Input): Result =>
  once(input, 'financialHealth', () => calculateFinanciallyStrong(input.financials, input.metrics));
const momentum = (input: Input): Result =>
  once(input, 'momentum', () => calculateStrongMomentum(input.momentum, input.metrics));
const position = (input: Input) => once(input, 'position', () => calculatePricePosition(input.momentum));
const oversold = (input: Input) => once(input, 'oversold', () => calculateOversold(input.momentum));
const theme = (input: Input, name: StockTheme): Result =>
  once(input, `theme:${name}`, () => {
    const result = calculateTheme(input.company, name);
    return {score: result.score, coverage: result.coverage};
  });
const combine = (...results: Result[]): Result => ({
  score: Math.min(...results.map((result) => result.score)),
  coverage: Math.min(...results.map((result) => result.coverage)),
  eligible: results.every((result) => result.eligible !== false && result.coverage >= 100 && result.score >= 60),
  reasons: results.flatMap((result) => result.reasons ?? []),
});
const near = (input: Input, side: 'low' | 'high'): Result => {
  const result = position(input);
  return {score: side === 'low' ? result.nearLowScore : result.nearHighScore, coverage: result.coverage};
};
const smallCap = (input: Input, calculate: () => Result, minimum = 300_000_000): Result => {
  if (input.company.currency !== 'USD')
    return {score: 0, coverage: 0, eligible: false, reasons: ['usd_market_cap_required']};
  const cap = input.company.marketCap;
  if (cap === null || cap < minimum || cap > 2_000_000_000) {
    return {score: 0, coverage: cap === null ? 0 : 100};
  }
  return calculate();
};
const calculators: IntelligenceCalculator[] = [
  {id: 'financially-strong', calculate: financialHealth},
  {
    id: 'strong-balance-sheet',
    calculate(input) {
      const result = calculateStrongBalanceSheet(input.financials, input.metrics);
      const total = result.metrics.reduce((sum, metric) => sum + metric.weight, 0);
      const available = result.metrics.reduce((sum, metric) => sum + (metric.score === null ? 0 : metric.weight), 0);
      return {score: result.score ?? 0, coverage: total > 0 ? Math.round((available / total) * 100) : 0};
    },
  },
  {id: 'high-quality', calculate: quality},
  {id: 'high-growth', calculate: growth},
  {id: 'undervalued', calculate: valuation},
  {id: 'strong-momentum', calculate: momentum},
  {id: 'estimates-rising', calculate: (input) => calculateEstimatesRising(input.estimates)},
  {id: 'quality-near-lows', calculate: (input) => combine(quality(input), near(input, 'low'))},
  {id: 'quality-near-highs', calculate: (input) => combine(quality(input), near(input, 'high'))},
  {id: 'growth-near-lows', calculate: (input) => combine(growth(input), near(input, 'low'))},
  {id: 'oversold-quality', calculate: (input) => combine(quality(input), oversold(input))},
  {id: 'undervalued-momentum', calculate: (input) => combine(valuation(input), momentum(input))},
  {id: 'small-cap-quality', calculate: (input) => smallCap(input, () => quality(input))},
  {id: 'small-cap-growth', calculate: (input) => smallCap(input, () => growth(input))},
  {id: 'low-cap-ai', calculate: (input) => smallCap(input, () => theme(input, 'ai'), 1)},
  {id: 'low-cap-ai-growth', calculate: (input) => smallCap(input, () => combine(theme(input, 'ai'), growth(input)), 1)},
  {id: 'theme-ai', calculate: (input) => theme(input, 'ai')},
  {id: 'theme-semiconductors', calculate: (input) => theme(input, 'semiconductors')},
  {id: 'theme-data-centers', calculate: (input) => theme(input, 'data-centers')},
  {id: 'theme-energy', calculate: (input) => theme(input, 'energy')},
  {id: 'theme-cybersecurity', calculate: (input) => theme(input, 'cybersecurity')},
  {id: 'theme-robotics', calculate: (input) => theme(input, 'robotics')},
];
export const intelligenceCalculators: IntelligenceCalculator[] = calculators.map((calculator) => ({
  id: calculator.id,
  calculate(input) {
    const result = calculator.calculate(input);
    const reasons = [...(result.reasons ?? [])];
    if (result.eligible === false && !reasons.length) reasons.push('component_gate_failed');
    if (!Number.isFinite(result.coverage) || result.coverage < 100) reasons.push('incomplete_component_evidence');
    if (!Number.isFinite(result.score)) reasons.push('invalid_score');
    const marketOnly =
      calculator.id.startsWith('theme-') || calculator.id === 'low-cap-ai' || calculator.id === 'strong-momentum';
    const quality = input.metrics.dataQuality;
    if (!marketOnly && (quality?.statementAgeDays == null || quality.statementAgeDays > 200))
      reasons.push('stale_or_missing_statements');
    if (quality?.priceAgeDays == null || quality.priceAgeDays > 10) reasons.push('stale_or_missing_prices');
    if (input.company.marketCap === null || input.company.marketCap <= 0) reasons.push('invalid_market_cap');
    if (input.metrics.price === null || input.metrics.price <= 0) reasons.push('invalid_price');
    // These industrial-company models are not calibrated for banks, insurers or REITs.
    if (!marketOnly && /financial|real estate/i.test(input.company.sector ?? ''))
      reasons.push('sector_model_not_supported');
    if (['financially-strong', 'strong-balance-sheet'].includes(calculator.id)) {
      if (input.metrics.freeCashFlow === null || input.metrics.freeCashFlow <= 0)
        reasons.push('positive_cash_flow_required');
      if (input.metrics.operatingMargin === null || input.metrics.operatingMargin <= 0)
        reasons.push('positive_operating_margin_required');
    }
    if (calculator.id === 'strong-balance-sheet' && input.metrics.debtToEquity === null)
      reasons.push('positive_equity_required');
    const coverage = Number.isFinite(result.coverage) ? Math.min(100, Math.max(0, result.coverage)) : 0;
    return {
      ...result,
      score: coverage === 100 && Number.isFinite(result.score) ? Math.min(100, Math.max(0, result.score)) : 0,
      coverage,
      confidence: reasons.length ? 'low' : (result.confidence ?? confidenceFromCoverage(coverage / 100)),
      eligible: reasons.length === 0,
      reasons: [...new Set(reasons)],
    };
  },
}));