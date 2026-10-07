import type { FxQuote, PortfolioCurrency } from '../portfolio.types';
import { multiply, print, read, roundDivide, SCALE } from './money';

const DAY = 86_400_000;
export const MAX_FX_AGE_DAYS = 7;

export function validateFxQuote(value: unknown, now = Date.now()): FxQuote | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.source !== 'ECB' || typeof data.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)) return null;
  const asOf = Date.parse(`${data.asOf}T00:00:00Z`);
  const fetchedAt = typeof data.fetchedAt === 'string' ? Date.parse(data.fetchedAt) : NaN;
  if (!Number.isFinite(asOf) || new Date(asOf).toISOString().slice(0, 10) !== data.asOf || !Number.isFinite(fetchedAt)) return null;
  const age = Math.floor((now - asOf) / DAY);
  if (age < 0 || age > MAX_FX_AGE_DAYS || fetchedAt > now + 60_000) return null;
  try {
    const rate = read(data.eurUsd);
    if (rate <= 0n || rate > read('1000')) return null;
    return {eurUsd: print(rate), asOf: data.asOf, fetchedAt: data.fetchedAt as string, source: 'ECB', stale: age > 4};
  } catch {
    return null;
  }
}

export function parseEcbDaily(xml: string, now = Date.now()): FxQuote {
  // Parse only ECB's tiny, fixed-format daily Cube response. No XML entities are evaluated.
  if (xml.length > 100_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Invalid ECB response.');
  const dated = /<Cube\b[^>]*\btime\s*=\s*['"](\d{4}-\d{2}-\d{2})['"][^>]*>([\s\S]*?)<\/Cube>/i.exec(xml);
  if (!dated) throw new Error('ECB reference date is missing.');
  const cubes = dated[2].match(/<Cube\b[^>]*\/\s*>/gi) ?? [];
  const usd = cubes.filter((tag) => /\bcurrency\s*=\s*['"]USD['"]/i.test(tag));
  if (usd.length !== 1) throw new Error('ECB USD reference rate is missing or ambiguous.');
  const rate = /\brate\s*=\s*['"](\d+(?:\.\d{1,8})?)['"]/i.exec(usd[0]);
  const quote = validateFxQuote({source: 'ECB', asOf: dated[1], eurUsd: rate?.[1], fetchedAt: new Date(now).toISOString()}, now);
  if (!quote) throw new Error('ECB exchange rate is invalid or too old.');
  return quote;
}

export function convertCurrency(
  amount: string | null,
  from: PortfolioCurrency,
  to: PortfolioCurrency,
  quote: FxQuote | null,
): string | null {
  if (amount === null) return null;
  const units = read(amount);
  if (from === to || units === 0n) return print(units);
  if (!quote) return null;
  const rate = read(quote.eurUsd);
  if (rate <= 0n) return null;
  return print(from === 'EUR' ? multiply(units, rate) : roundDivide(units * SCALE, rate));
}

export function conversionRate(from: PortfolioCurrency, to: PortfolioCurrency, quote: FxQuote | null): string | null {
  return convertCurrency('1', from, to, quote);
}
