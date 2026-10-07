import type { CurrencyLedgerTotals, LedgerPosition, PortfolioCurrency, PortfolioLedger, PortfolioTransaction } from '../portfolio.types';
import { multiply, print, read, roundDivide, sum, sumKnown } from './money';

export class PortfolioInputError extends Error {
}
export const MAX_POSITIONS = 250;
export const MAX_TRANSACTIONS = 2000;
const MAX_VALUE = read('1000000000000000');

export function emptyLedger(): PortfolioLedger {
  return {
    cash: '0',
    positions: [],
    realisedGain: '0',
    dividends: '0',
    standaloneFees: '0',
    totalFees: '0',
    netCashDeposits: '0'
  };
}

function replayCurrencyLedger(events: PortfolioTransaction[], currency: PortfolioCurrency): PortfolioLedger {

  if (events.length > MAX_TRANSACTIONS) throw new PortfolioInputError(`Maximum ${MAX_TRANSACTIONS} transactions per portfolio.`);

  const positions = new Map<string, LedgerPosition>();

  let cash = 0n, realised = 0n, dividends = 0n, standaloneFees = 0n, fees = 0n, netDeposits = 0n;
  let realisedKnown = true;

  const sorted = events.filter((event) => !event.voidedAt).sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence);
  
  for (const event of sorted) {
    const fee = read(event.fees);
    if (fee < 0n) throw new PortfolioInputError('Fees cannot be negative.');
    const instrument = event.instrument;
    if (instrument && instrument.currency !== currency) throw new PortfolioInputError('Instrument currency does not match its native currency bucket.');
    const existing = instrument ? positions.get(instrument.id) : undefined;
    const quantity = event.quantity === null ? 0n : read(event.quantity);
    const price = event.unitPrice === null ? null : read(event.unitPrice);
    const amount = event.amount === null ? 0n : read(event.amount);
    if (['opening', 'buy', 'sell', 'split'].includes(event.kind) && !instrument) throw new PortfolioInputError('Select an instrument for this transaction.');
    if (['opening', 'buy', 'sell'].includes(event.kind) && quantity <= 0n) throw new PortfolioInputError('Quantity must be positive.');
    if (price !== null && price < 0n) throw new PortfolioInputError('Price cannot be negative.');
    if (['buy', 'sell'].includes(event.kind) && price === null) throw new PortfolioInputError('Enter the actual execution price.');
    const notional = price === null ? null : multiply(quantity, price);
    if (notional !== null && notional > MAX_VALUE) throw new PortfolioInputError('Transaction value is too large.');
    switch (event.kind) {
      case 'opening':
      case 'buy': {
        if (event.kind === 'buy' && (price === null || price <= 0n)) throw new PortfolioInputError('Purchase price must be positive.');
        if (price === null && fee !== 0n) throw new PortfolioInputError('Enter a cost basis before adding opening-position fees.');
        const previousQuantity = existing ? read(existing.quantity) : 0n;
        const previousCost = existing ? existing.costBasis : '0';
        positions.set(instrument!.id, {
          instrument: existing?.instrument ?? instrument!,
          quantity: print(previousQuantity + quantity),
          costBasis: previousCost === null || notional === null ? null : print(read(previousCost) + notional + fee),
          lastSplitDate: existing?.lastSplitDate ?? null,
        });
        if (event.kind === 'buy') cash -= notional! + fee;
        fees += fee;
        break;
      }
      case 'sell': {
        if (!existing || read(existing.quantity) < quantity) throw new PortfolioInputError(`Not enough shares to sell ${instrument!.symbol} on ${event.date}.`);
        const held = read(existing.quantity);
        const allocated = existing.costBasis === null ? null : roundDivide(read(existing.costBasis) * quantity, held);
        if (allocated === null) realisedKnown = false;
        else realised += notional! - fee - allocated;
        cash += notional! - fee;
        fees += fee;
        if (held === quantity) positions.delete(instrument!.id);
        else positions.set(instrument!.id, {
          ...existing,
          quantity: print(held - quantity),
          costBasis: allocated === null ? null : print(read(existing.costBasis!) - allocated)
        });
        break;
      }
      case 'split': {
        if (!existing || event.splitRatio === null) throw new PortfolioInputError('A split needs an existing position and a positive ratio.');
        const ratio = read(event.splitRatio);
        if (ratio <= 0n || ratio > read('10000')) throw new PortfolioInputError('Split ratio is out of range.');
        const next = multiply(read(existing.quantity), ratio);
        if (next <= 0n) throw new PortfolioInputError('Split produces a quantity below the supported precision.');
        positions.set(instrument!.id, {
          ...existing,
          quantity: print(next),
          lastSplitDate: event.date
        });
        break;
      }
      case 'deposit':
      case 'withdrawal':
      case 'dividend':
      case 'fee': {
        if (amount <= 0n || amount > MAX_VALUE) throw new PortfolioInputError('Cash amount must be positive and within the supported range.');
        if (fee !== 0n) throw new PortfolioInputError('Record fees separately for cash and dividend entries.');
        if (event.kind === 'deposit') {
          cash += amount;
          netDeposits += amount;
        }
        if (event.kind === 'withdrawal') {
          cash -= amount;
          netDeposits -= amount;
        }
        if (event.kind === 'dividend') {
          cash += amount;
          dividends += amount;
        }
        if (event.kind === 'fee') {
          cash -= amount;
          standaloneFees += amount;
          fees += amount;
        }
        break;
      }
      default: throw new PortfolioInputError('Unsupported transaction type.');
    }
    if (cash < 0n) throw new PortfolioInputError(`Insufficient cash on ${event.date}. Add a deposit on or before that date, or use an opening holding for an existing position.`);
    if (cash > MAX_VALUE) throw new PortfolioInputError('Cash exceeds the supported portfolio value.');
    if (positions.size > MAX_POSITIONS) throw new PortfolioInputError(`Maximum ${MAX_POSITIONS} positions per portfolio.`);
  }
  return {
    cash: print(cash),
    positions: [...positions.values()].sort((a, b) => a.instrument.symbol.localeCompare(b.instrument.symbol)),
    realisedGain: realisedKnown ? print(realised) : null,
    dividends: print(dividends),
    standaloneFees: print(standaloneFees),
    totalFees: print(fees),
    netCashDeposits: print(netDeposits)
  };
}

// Transactions and costs stay in their native currencies. Conversion happens only in analysis.
export function replayLedger(events: PortfolioTransaction[], currency: PortfolioCurrency): PortfolioLedger {
  if (events.length > MAX_TRANSACTIONS) throw new PortfolioInputError(`Maximum ${MAX_TRANSACTIONS} transactions per portfolio.`);
  const groups: Record<PortfolioCurrency, PortfolioTransaction[]> = {USD: [], EUR: []};
  for (const event of events) {
    const code = event.instrument?.currency ?? event.currency ?? currency;
    if (code !== 'USD' && code !== 'EUR') throw new PortfolioInputError('Unsupported transaction currency.');
    if (event.currency && event.instrument && event.currency !== event.instrument.currency) {
      throw new PortfolioInputError('Transaction currency must match the selected stock.');
    }
    groups[code].push(event);
  }
  const usd = replayCurrencyLedger(groups.USD, 'USD');
  const eur = replayCurrencyLedger(groups.EUR, 'EUR');
  const positions = [...usd.positions, ...eur.positions].sort((a, b) => a.instrument.symbol.localeCompare(b.instrument.symbol));
  if (positions.length > MAX_POSITIONS) throw new PortfolioInputError(`Maximum ${MAX_POSITIONS} positions per portfolio.`);
  return {...(currency === 'USD' ? usd : eur), currency, positions, byCurrency: {USD: totals(usd), EUR: totals(eur)}};
}

function totals(ledger: PortfolioLedger): CurrencyLedgerTotals {
  const {cash, realisedGain, dividends, standaloneFees, totalFees, netCashDeposits} = ledger;
  return {cash, realisedGain, dividends, standaloneFees, totalFees, netCashDeposits};
}

export function nativeTotals(ledger: PortfolioLedger, legacyCurrency: PortfolioCurrency): Partial<Record<PortfolioCurrency, CurrencyLedgerTotals>> {
  return ledger.byCurrency ?? {[ledger.currency ?? legacyCurrency]: totals(ledger)};
}

export function combineLedgers(ledgers: PortfolioLedger[]): PortfolioLedger {
  const positions = new Map<string, LedgerPosition>();
  for (const ledger of ledgers) for (const position of ledger.positions) {
    const previous = positions.get(position.instrument.id);
    positions.set(position.instrument.id, previous ? {
      ...position,
      quantity: print(read(previous.quantity) + read(position.quantity)),
      costBasis: sumKnown([previous.costBasis, position.costBasis]),
      lastSplitDate: [previous.lastSplitDate, position.lastSplitDate].filter((date): date is string => !!date).sort().at(-1) ?? null,
    } : { ...position });
  }
  const byCurrency: Partial<Record<PortfolioCurrency, CurrencyLedgerTotals>> = {};
  for (const code of ['USD', 'EUR'] as const) {
    const values = ledgers.flatMap((ledger) => {
      const value = nativeTotals(ledger, ledger.currency ?? 'USD')[code];
      return value ? [value] : [];
    });
    byCurrency[code] = {
      cash: print(sum(values.map((value) => value.cash))),
      realisedGain: sumKnown(values.map((value) => value.realisedGain)),
      dividends: print(sum(values.map((value) => value.dividends))),
      standaloneFees: print(sum(values.map((value) => value.standaloneFees))),
      totalFees: print(sum(values.map((value) => value.totalFees))),
      netCashDeposits: print(sum(values.map((value) => value.netCashDeposits))),
    };
  }
  const currency = ledgers[0]?.currency ?? 'USD';
  return {...byCurrency[currency]!, currency, byCurrency, positions: [...positions.values()]};
}
