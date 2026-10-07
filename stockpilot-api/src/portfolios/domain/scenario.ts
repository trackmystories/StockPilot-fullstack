import { createHash } from 'node:crypto';
import type { PortfolioMarketStock, PortfolioRecord, PortfolioTransaction, ScenarioInput, ScenarioPreview } from '../portfolio.types';
import { analysePortfolio } from './analysis';
import { PortfolioInputError, replayLedger } from './ledger';
import { fromMarketNumber, multiply, print, read, SCALE } from './money';

export function previewScenario(record: PortfolioRecord, events: PortfolioTransaction[], stocks: PortfolioMarketStock[], runId: string | null, input: ScenarioInput, now = new Date().toISOString()): ScenarioPreview {
  if (record.archived) throw new PortfolioInputError('Restore this portfolio before testing changes.');
  const stock = stocks.find((item) => item.instrument.symbol === input.symbol && item.instrument.currency === record.currency);
  if (!stock) throw new PortfolioInputError('This stock is not available in the portfolio currency in the saved dataset.');
  const price = fromMarketNumber(stock.price);
  if (price === null || price <= 0n) throw new PortfolioInputError('A supported saved price is required to preview this change.');
  const amount = read(input.amount);
  const fees = read(input.fees);
  const quantity = amount * SCALE / price; // Round shares DOWN so the requested budget is not exceeded.
  if (quantity <= 0n) throw new PortfolioInputError('Trade value is too small for the supported share precision.');
  const actualTradeValue = multiply(quantity, price);
  const position = record.ledger.positions.find((item) => item.instrument.id === stock.instrument.id);
  if (input.action === 'sell' && (!position || amount > multiply(read(position.quantity), price))) throw new PortfolioInputError('The proposed sale exceeds the position value.');
  if (position?.lastSplitDate && (!stock.priceAsOf || stock.priceAsOf.slice(0, 10) < position.lastSplitDate)) throw new PortfolioInputError('The saved price predates a recorded split. A newer saved quote is required.');
  let sequence = record.transactionCount;
  const make = (kind: 'buy' | 'sell' | 'deposit', values: Partial<PortfolioTransaction>): PortfolioTransaction => ({
    requestId: `scenario-event-${++sequence}`,
    id: `scenario-event-${sequence}`,
    kind,
    date: now.slice(0, 10),
    symbol: null,
    instrument: null,
    quantity: null,
    unitPrice: null,
    amount: null,
    fees: '0',
    splitRatio: null,
    note: 'Hypothetical; never written to the transaction ledger.',
    sequence,
    createdAt: now,
    voidedAt: null,
    fingerprint: 'simulation',
    ...values,
  });
  const changes: PortfolioTransaction[] = [];
  const contribution = input.action === 'buy' && input.funding === 'contribution' ? amount + fees : 0n;
  if (contribution > 0n) changes.push(make('deposit', { amount: print(contribution) }));
  changes.push(make(input.action, {
    instrument: stock.instrument,
    symbol: input.symbol,
    quantity: print(quantity),
    unitPrice: print(price),
    fees: input.fees
  }));
  const nextLedger = replayLedger([...events, ...changes], record.currency);
  const before = analysePortfolio(record, record.ledger, stocks, runId, now);
  const after = analysePortfolio(record, nextLedger, stocks, runId, now);
  const relevantIds = new Set([...record.ledger.positions.map((position) => position.instrument.id), stock.instrument.id]);
  const evidence = stocks.filter((item) => relevantIds.has(item.instrument.id)).sort((a, b) => a.instrument.id.localeCompare(b.instrument.id));
  const previewToken = createHash('sha256').update(JSON.stringify([record.id, record.revision, runId, evidence, input])).digest('hex');
  return {
    input,
    previewToken,
    portfolioRevision: record.revision,
    runId,
    createdAt: now,
    instrument: stock.instrument,
    quantity: print(quantity),
    assumedPrice: print(price),
    actualTradeValue: print(actualTradeValue),
    contribution: print(contribution),
    before,
    after,
    warnings: [
      'Hypothetical only. No trade is executed and no transaction is recorded.',
      'Uses a saved price with no slippage, market impact, taxes or return forecast.',
      ...(stock.stale ? ['The assumed price is old or undated.'] : []),
      ...(before.totalValue === null ? ['Other positions are unpriced; before/after totals and position weights are incomplete.'] : []),
    ],
  };
}
