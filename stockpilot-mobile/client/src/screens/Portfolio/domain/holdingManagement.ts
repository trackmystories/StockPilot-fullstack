import type { InvestmentDraft } from './investments';
import type { LedgerPosition, PortfolioInstrument, PortfolioTransaction, TransactionInput } from './portfolio';

export type HoldingAction = 'buy' | 'sell' | 'remove';
export type SaleDraft = {
  quantity: string;
  unitPrice: string;
  fees: string;
  date: string;
};

const SCALE = BigInt(100000000);
const ZERO = BigInt(0);
const MAX_INPUT = BigInt('1000000000000') * SCALE;
const MAX_TOTAL = BigInt('1000000000000000') * SCALE;

function parseDecimal(value: string, label: string, allowZero = false, maximum: bigint | null = MAX_INPUT): bigint {
  const normalized = value.trim().replace(',', '.').replace(/^\./, '0.');
  if (!/^\d+(?:\.\d{1,8})?$/.test(normalized) || normalized.length > 32) {
    throw new Error(`${label} must be a number with up to eight decimal places.`);
  }
  const [whole, fraction = ''] = normalized.split('.');
  const result = BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, '0'));
  if ((maximum !== null && result > maximum) || (!allowZero && result === ZERO)) {
    throw new Error(`${label} must be ${allowZero ? 'zero or greater' : 'greater than zero'} and within the supported range.`);
  }
  return result;
}

function decimal(value: bigint): string {
  const negative = value < ZERO;
  const absolute = negative ? -value : value;
  const fraction = String(absolute % SCALE).padStart(8, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${absolute / SCALE}${fraction ? `.${fraction}` : ''}`;
}

function amounts(draft: Pick<SaleDraft, 'quantity' | 'unitPrice' | 'fees'>) {
  const quantity = parseDecimal(draft.quantity, 'Shares sold');
  const price = parseDecimal(draft.unitPrice, 'Sale price', true);
  const fees = parseDecimal(draft.fees.trim() || '0', 'Fees', true);
  const gross = (quantity * price + SCALE / BigInt(2)) / SCALE;
  if (gross > MAX_TOTAL) throw new Error('Sale amount is too large.');
  return { quantity, price, fees, gross };
}

export function salePreview(draft: Pick<SaleDraft, 'quantity' | 'unitPrice' | 'fees'>) {
  try {
    const { gross, fees } = amounts(draft);
    return { gross: decimal(gross), fees: decimal(fees), net: decimal(gross - fees) };
  } catch {
    return null;
  }
}

export function saleInput(
  draft: SaleDraft,
  position: LedgerPosition,
  requestId: string,
  today = new Date().toISOString().slice(0, 10),
): TransactionInput {
  const { quantity, price, fees } = amounts(draft);
  if (quantity > parseDecimal(position.quantity, 'Shares held', false, null)) {
    throw new Error(`You currently hold ${position.quantity} shares. Enter that amount or fewer.`);
  }
  const date = draft.date.trim();
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > today
  ) {
    throw new Error('Enter a valid sale date (YYYY-MM-DD), not a future date.');
  }
  const { instrument } = position;
  if (!instrument.id || !instrument.symbol || !['USD', 'EUR'].includes(instrument.currency)) {
    throw new Error('The saved holding has no supported stock identity or currency.');
  }
  return {
    requestId,
    kind: 'sell',
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    currency: instrument.currency,
    date,
    quantity: decimal(quantity),
    unitPrice: decimal(price),
    fees: decimal(fees),
    amount: null,
    splitRatio: null,
    note: '',
  };
}

export function buyMoreDraft(
  instrument: PortfolioInstrument,
  date = new Date().toISOString().slice(0, 10),
): InvestmentDraft {
  return {
    stock: {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      companyName: instrument.companyName,
      currency: instrument.currency,
      exchange: instrument.exchange,
      logoUrl: instrument.logoUrl,
    },
    quantity: '',
    unitPrice: '',
    date,
  };
}

export function matchingHoldingEntries(items: PortfolioTransaction[], instrumentId: string) {
  // Match the exact listing, not just the ticker: two listings may share a symbol.
  return items
    .filter((item) => item.instrument?.id === instrumentId && !item.voidedAt)
    .sort((a, b) => b.sequence - a.sequence);
}
