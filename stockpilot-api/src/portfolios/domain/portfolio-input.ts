import { PORTFOLIO_CURRENCIES, type CreatePortfolioInput, type PortfolioCurrency, type ScenarioInput, type TransactionInput, type UpdatePortfolioInput } from '../portfolio.types';
import { PortfolioInputError } from './ledger';
import { print, read } from './money';

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PortfolioInputError('Invalid request body.');
  const result = value as Record<string, unknown>;
  const unknown = Object.keys(result).filter((key) => !keys.includes(key));
  if (unknown.length) throw new PortfolioInputError(`Unexpected fields: ${unknown.join(', ')}.`);
  return result;
}
function text(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new PortfolioInputError(`${name} is required (maximum ${max} characters).`);
  return value.trim();
}
export function requestId(value: unknown): string {
  const id = text(value, 'Request ID', 80);
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(id)) throw new PortfolioInputError('Invalid request ID.');
  return id;
}
export function documentId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{12,80}$/.test(value)) throw new PortfolioInputError('Invalid portfolio or record ID.');
  return value;
}
export function currency(value: unknown): PortfolioCurrency {
  if (!(PORTFOLIO_CURRENCIES as readonly unknown[]).includes(value)) throw new PortfolioInputError('Only USD and EUR are supported.');
  return value as PortfolioCurrency;
}
function choice<T extends string>(value: unknown, allowed: readonly T[], name: string): T {
  if (!allowed.includes(value as T)) throw new PortfolioInputError(`Invalid ${name}.`);
  return value as T;
}
export function symbol(value: unknown): string {
  const result = text(value, 'Symbol', 20).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(result)) throw new PortfolioInputError('Invalid symbol.');
  return result;
}
function decimal(value: unknown, name: string, zero = false): string {
  let parsed: bigint;
  try {
    parsed = read(value);
  } catch {
    throw new PortfolioInputError(`${name} must be a decimal string with up to eight decimal places.`);
  }
  if (parsed < 0n || (!zero && parsed === 0n) || parsed > read('1000000000000')) throw new PortfolioInputError(`${name} is out of range.`);
  return print(parsed);
}
export function parseCreate(value: unknown): CreatePortfolioInput {
  const body = object(value, ['requestId', 'name', 'kind', 'currency']);
  return {
    requestId: requestId(body.requestId),
    name: text(body.name, 'Portfolio name', 60),
    kind: choice(body.kind, ['real', 'model'], 'portfolio type'),
    currency: currency(body.currency)
  };
}
export function parseUpdate(value: unknown): UpdatePortfolioInput {
  const body = object(value, ['name', 'archived', 'currency']);
  if (!Object.keys(body).length) throw new PortfolioInputError('No changes supplied.');
  if (body.archived !== undefined && typeof body.archived !== 'boolean') throw new PortfolioInputError('Archived must be a boolean.');
  return {
    ...(body.currency !== undefined ? { currency: currency(body.currency) } : {}),
    ...(body.name !== undefined ? { name: text(body.name, 'Portfolio name', 60) } : {}),
    ...(body.archived !== undefined ? { archived: body.archived as boolean } : {})
  };
}
export function parseTransaction(value: unknown, today = new Date().toISOString().slice(0, 10)): TransactionInput {
  const body = object(value, ['requestId', 'kind', 'date', 'symbol', 'quantity', 'unitPrice', 'amount', 'fees', 'splitRatio', 'note', 'currency', 'instrumentId']);
  const kind = choice(body.kind, ['opening', 'buy', 'sell', 'deposit', 'withdrawal', 'dividend', 'fee', 'split'], 'transaction type');
  const date = typeof body.date === 'string' ? body.date : '';
  const parsedDate = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > today) throw new PortfolioInputError('Enter a real transaction date (YYYY-MM-DD), not a future date.');
  const stockEvent = ['opening', 'buy', 'sell', 'split'].includes(kind);
  const needsQuantity = ['opening', 'buy', 'sell'].includes(kind);
  const needsAmount = ['deposit', 'withdrawal', 'dividend', 'fee'].includes(kind);
  const hasPrice = ['opening', 'buy', 'sell'].includes(kind);
  const optional = (key: string) => body[key] === null || body[key] === undefined || body[key] === '';
  if (!needsQuantity && !optional('quantity')) throw new PortfolioInputError('Quantity is not used by this transaction.');
  if (!needsAmount && !optional('amount')) throw new PortfolioInputError('Amount is not used by this transaction.');
  if (!hasPrice && !optional('unitPrice')) throw new PortfolioInputError('Unit price is not used by this transaction.');
  if (kind !== 'split' && !optional('splitRatio')) throw new PortfolioInputError('Split ratio is only used by a split.');
  if (!stockEvent && kind !== 'dividend' && !optional('symbol')) throw new PortfolioInputError('Do not attach a stock to this cash event.');
  if (!stockEvent && kind !== 'dividend' && !optional('instrumentId')) throw new PortfolioInputError('Instrument ID is not used for this cash event.');
  const fees = optional('fees') ? '0' : decimal(body.fees, 'Fees', true);
  if (!needsQuantity && fees !== '0') throw new PortfolioInputError('Enter a separate fee transaction.');
  if (body.note != null && typeof body.note !== 'string') throw new PortfolioInputError('Note must be text.');
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > 300) throw new PortfolioInputError('Note is too long.');
  return {
    requestId: requestId(body.requestId),
    kind,
    date,
    ...(body.currency !== undefined ? { currency: currency(body.currency) } : {}),
    ...(body.instrumentId !== undefined ? { instrumentId: documentId(body.instrumentId) } : {}),
    symbol: stockEvent || (kind === 'dividend' && !optional('symbol')) ? symbol(body.symbol) : null,
    quantity: needsQuantity ? decimal(body.quantity, 'Quantity') : null,
    unitPrice: hasPrice && !(kind === 'opening' && optional('unitPrice')) ? decimal(body.unitPrice, 'Unit price', kind !== 'buy') : null,
    amount: needsAmount ? decimal(body.amount, 'Amount') : null,
    fees,
    splitRatio: kind === 'split' ? decimal(body.splitRatio, 'Split ratio') : null,
    note,
  };
}
export function parseScenario(value: unknown): ScenarioInput {
  const body = object(value, ['name', 'action', 'symbol', 'amount', 'fees', 'funding']);
  const action = choice(body.action, ['buy', 'sell'], 'scenario action');
  const funding = choice(body.funding, ['cash', 'contribution'], 'funding source');
  if (action === 'sell' && funding !== 'cash') throw new PortfolioInputError('Sale proceeds return to cash.');
  return {
    name: text(body.name, 'Scenario name', 60),
    action,
    symbol: symbol(body.symbol),
    amount: decimal(body.amount, 'Trade value'),
    fees: body.fees == null ? '0' : decimal(body.fees, 'Fees', true),
    funding
  };
}
export function parseSaveScenario(value: unknown): {
  requestId: string;
  previewToken: string;
  input: ScenarioInput;
} {
  const body = object(value, ['requestId', 'previewToken', 'input']);
  if (typeof body.previewToken !== 'string' || !/^[a-f0-9]{64}$/.test(body.previewToken)) throw new PortfolioInputError('Preview the scenario before saving.');
  return {
    requestId: requestId(body.requestId),
    previewToken: body.previewToken,
    input: parseScenario(body.input)
  };
}
