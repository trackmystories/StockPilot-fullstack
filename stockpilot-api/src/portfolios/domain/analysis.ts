import type { Allocation, Characteristic, CurrencyLedgerTotals, FxQuote, PortfolioCurrency, PortfolioAnalysis, PortfolioHolding, PortfolioLedger, PortfolioMarketStock, PortfolioMeta } from '../portfolio.types';
import { convertCurrency, conversionRate, validateFxQuote } from './fx';
import { nativeTotals } from './ledger';
import { fromMarketNumber, multiply, percent, print, read, sum, sumKnown } from './money';

export function analysePortfolio(portfolio: PortfolioMeta, ledger: PortfolioLedger, stocks: PortfolioMarketStock[], runId: string | null, now = new Date().toISOString(), fxQuote: FxQuote | null = null, ledgerCurrency: PortfolioCurrency = portfolio.ledgerCurrency ?? portfolio.currency): PortfolioAnalysis {
  const fx = validateFxQuote(fxQuote, Date.parse(now));
  const market = new Map(stocks.map((stock) => [stock.instrument.id, stock]));
  const holdings: PortfolioHolding[] = ledger.positions.map((position) => {
    const stock = market.get(position.instrument.id);
    const comparable = stock?.instrument.currency === position.instrument.currency;
    const oldForSplit = !!position.lastSplitDate && (!stock?.priceAsOf || stock.priceAsOf.slice(0, 10) < position.lastSplitDate);
    const quoted = comparable && !oldForSplit ? fromMarketNumber(stock?.price) : null;
    const units = quoted !== null && quoted > 0n ? quoted : null;
    const value = units === null ? null : multiply(read(position.quantity), units);
    const gain = value === null || position.costBasis === null ? null : value - read(position.costBasis);
    const reportingValue = convertCurrency(value === null ? null : print(value), position.instrument.currency, portfolio.currency, fx);
    const reportingCost = convertCurrency(position.costBasis, position.instrument.currency, portfolio.currency, fx);
    const reportingGain = reportingValue === null || reportingCost === null ? null : print(read(reportingValue) - read(reportingCost));
    return {
      ...position,
      reportingCurrency: portfolio.currency,
      reportingValue,
      reportingCost,
      reportingGain,
      fxRate: conversionRate(position.instrument.currency, portfolio.currency, fx),
      price: units === null ? null : print(units),
      priceAsOf: stock?.priceAsOf ?? null,
      marketValue: value === null ? null : print(value),
      weight: null,
      unrealisedGain: gain === null ? null : print(gain),
      unrealisedGainPercent: gain === null || position.costBasis === null ? null : percent(gain, read(position.costBasis)),
      sector: stock?.sector ?? null,
      industry: stock?.industry ?? null,
      marketCap: stock?.marketCap ?? null,
      momentum: stock?.momentum ?? null,
      stale: stock?.stale ?? true,
      unavailableReason: !stock ? 'No supported saved market record.' : !comparable ? 'Quote currency does not match this holding.' : oldForSplit ? 'Saved quote predates a recorded split.' : units === null ? 'Saved price is unavailable.' : reportingValue === null ? 'USD/EUR conversion is unavailable.' : null,
    };
  });
  const unpricedSymbols = holdings.filter((holding) => holding.reportingValue === null).map((holding) => holding.instrument.symbol);
  const buckets = nativeTotals(ledger, ledgerCurrency);
  const convertedTotals = (field: keyof CurrencyLedgerTotals) => Object.entries(buckets).map(([code, totals]) => convertCurrency(totals[field], code as PortfolioCurrency, portfolio.currency, fx));
  const cashTotal = sumKnown(convertedTotals('cash'));
  const cash = sum(convertedTotals('cash').filter((value): value is string => value !== null));
  const pricedEquity = sum(holdings.flatMap((holding) => holding.reportingValue == null ? [] : [holding.reportingValue]));
  const subtotal = pricedEquity + cash;
  const complete = unpricedSymbols.length === 0 && cashTotal !== null;
  const needsFx = holdings.some((holding) => holding.instrument.currency !== portfolio.currency) || Object.entries(buckets).some(([code, totals]) => code !== portfolio.currency && Object.values(totals).some((value) => value !== null && read(value) !== 0n));
  for (const holding of holdings) holding.weight = complete && holding.reportingValue != null ? percent(read(holding.reportingValue), subtotal) : null;
  const allocation = (key: (holding: PortfolioHolding) => string): Allocation[] => {
    const buckets = new Map<string, bigint>();
    for (const holding of holdings) if (holding.reportingValue != null) {
      const label = key(holding);
      buckets.set(label, (buckets.get(label) ?? 0n) + read(holding.reportingValue!));
    }
    if (cash > 0n) buckets.set('Cash', (buckets.get('Cash') ?? 0n) + cash);
    return [...buckets].map(([label, value]) => ({
      label,
      value: print(value),
      weight: percent(value, subtotal) ?? 0
    })).sort((a, b) => b.weight - a.weight);
  };
  const characteristic = (id: string, label: string, get: (stock: PortfolioMarketStock) => number | null, predicate: (value: number) => boolean): Characteristic => {
    let covered = 0n, matching = 0n;
    for (const holding of holdings) {
      const stock = market.get(holding.instrument.id);
      const value = stock ? get(stock) : null;
      if (holding.reportingValue == null || value === null || !Number.isFinite(value)) continue;
      covered += read(holding.reportingValue!);
      if (predicate(value)) matching += read(holding.reportingValue!);
    }
    return {
      id,
      label,
      matchingWeight: covered > 0n ? percent(matching, pricedEquity) : null,
      coverageWeight: percent(covered, pricedEquity)
    };
  };
  const unrealised = sumKnown(holdings.map((holding) => holding.reportingGain ?? null));
  const realised = sumKnown(convertedTotals('realisedGain'));
  const dividends = sumKnown(convertedTotals('dividends'));
  const standaloneFees = sumKnown(convertedTotals('standaloneFees'));
  const investmentGain = unrealised === null || realised === null || dividends === null || standaloneFees === null ? null : print(read(unrealised) + read(realised) + read(dividends) - read(standaloneFees));
  const staleSymbols = holdings.filter((holding) => holding.stale).map((holding) => holding.instrument.symbol);
  const unknownCostSymbols = holdings.filter((holding) => holding.costBasis === null).map((holding) => holding.instrument.symbol);
  const largest = [...holdings].sort((a, b) => (b.weight ?? -1) - (a.weight ?? -1))[0];
  const insights: PortfolioAnalysis['insights'] = [];
  if (needsFx && !fx) insights.push({id: 'missing-fx', tone: 'warning', title: 'Currency conversion is unavailable', text: 'Foreign-currency amounts are excluded from the priced subtotal, not treated as zero. A complete converted total is unavailable.'});
  if (needsFx && fx?.stale) insights.push({id: 'stale-fx', tone: 'warning', title: 'Older exchange rate', text: `Valuation uses the ECB reference rate dated ${fx.asOf}.`});
  if (needsFx) insights.push({id: 'fx-gain', tone: 'info', title: 'Price gain excludes currency movements', text: 'Current values and recorded costs are translated at the same latest reference rate. This is not historical-currency-adjusted investment performance.'});
  if (unpricedSymbols.length) insights.push({
    id: 'unpriced',
    tone: 'warning',
    title: 'Portfolio value is incomplete',
    text: `${unpricedSymbols.join(', ')} cannot be priced. The subtotal excludes these holdings; they are not valued at zero.`
  });
  if (staleSymbols.length) insights.push({
    id: 'stale',
    tone: 'warning',
    title: 'Some saved data is old',
    text: `${staleSymbols.length} holding(s) have old or undated market data. These are saved valuations, not live quotes.`
  });
  if (largest?.weight != null) insights.push({
    id: 'concentration',
    tone: 'info',
    title: 'Largest holding',
    text: `${largest.instrument.symbol} represents ${largest.weight.toFixed(1)}% of total portfolio value, including cash.`
  });
  if (unknownCostSymbols.length) insights.push({
    id: 'basis',
    tone: 'warning',
    title: 'Cost basis is incomplete',
    text: `Purchase cost is unknown for ${unknownCostSymbols.join(', ')}. Their gain/loss and the complete investment gain remain unavailable.`
  });
  if (cash > 0n && complete) insights.push({
    id: 'cash',
    tone: 'info',
    title: 'Cash allocation',
    text: `${(percent(cash, subtotal) ?? 0).toFixed(1)}% of this portfolio is cash.`
  });
  if (realised === null) insights.push({
    id: 'realised-basis',
    tone: 'warning',
    title: 'Some sale costs are unknown',
    text: 'At least one sale has an unknown acquisition cost. Complete realised and investment gains cannot be established.'
  });
  const pricesAsOf = holdings.map((holding) => holding.priceAsOf).filter((date): date is string => !!date).sort()[0] ?? null;
  return {
    reportingVersion: 2,
    gainBasis: 'native_price_change_at_current_fx',
    fx: {required: needsFx, asOf: needsFx ? fx?.asOf ?? null : null, source: needsFx ? fx?.source ?? null : null, eurUsd: needsFx ? fx?.eurUsd ?? null : null, stale: needsFx && !!fx?.stale, unavailable: needsFx && !fx},
    portfolioId: portfolio.id,
    currency: portfolio.currency,
    revision: portfolio.revision,
    runId,
    calculatedAt: now,
    pricesAsOf,
    totalValue: complete ? print(subtotal) : null,
    pricedSubtotal: print(subtotal),
    cash: cashTotal,
    holdingsValue: unpricedSymbols.length === 0 ? print(pricedEquity) : null,
    unrealisedGain: unrealised,
    realisedGain: realised,
    investmentGain,
    dividends,
    fees: sumKnown(convertedTotals('totalFees')),
    netCashDeposits: sumKnown(convertedTotals('netCashDeposits')),
    holdings,
    sectors: allocation((holding) => holding.sector ?? 'Unknown sector'),
    industries: allocation((holding) => holding.industry ?? 'Unknown industry'),
    companySizes: allocation((holding) => {
      if (holding.instrument.currency !== 'USD' || holding.marketCap === null || holding.marketCap <= 0) return 'Size unavailable';
      return holding.marketCap < 3e8 ? 'Micro cap' : holding.marketCap < 2e9 ? 'Small cap' : holding.marketCap < 1e10 ? 'Mid cap' : holding.marketCap < 2e11 ? 'Large cap' : 'Mega cap';
    }),
    characteristics: [
      characteristic('fcf', 'Positive free cash flow', (stock) => stock.freeCashFlow, (value) => value > 0),
      characteristic('strength', 'Financial strength score ≥ 7', (stock) => stock.financialHealth, (value) => value >= 7),
      characteristic('quality', 'Quality score ≥ 7', (stock) => stock.quality, (value) => value >= 7),
      characteristic('growth', 'Positive revenue growth', (stock) => stock.revenueGrowth, (value) => value > 0),
      characteristic('momentum', 'Momentum score ≥ 7', (stock) => stock.momentum, (value) => value >= 7),
    ],
    insights,
    coverage: {
      priced: holdings.length - unpricedSymbols.length,
      total: holdings.length,
      unpricedSymbols,
      staleSymbols,
      unknownCostSymbols
    },
  };
}
