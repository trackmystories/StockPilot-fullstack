import { ConflictException, Injectable } from '@nestjs/common';
import { analysePortfolio } from './domain/analysis';
import { combineLedgers, emptyLedger, nativeTotals, PortfolioInputError } from './domain/ledger';
import { previewScenario } from './domain/scenario';
import { PortfolioFxService } from './portfolio-fx.service';
import type { FxQuote } from './portfolio.types';
import { PortfolioMarketService } from './portfolio-market.service';
import { fingerprint, PortfolioRepository } from './portfolio.repository';
import type { CreatePortfolioInput, PortfolioAnalysis, PortfolioCurrency, PortfolioDetail, PortfolioInstrument, PortfolioListResponse, PortfolioMarketStock, PortfolioMeta, PortfolioRecord, ScenarioInput, TransactionInput, UpdatePortfolioInput } from './portfolio.types';

type MarketSnapshot = {
  runId: string | null;
  stocks: PortfolioMarketStock[];
};

export function publicPortfolio(record: PortfolioRecord): PortfolioMeta {
  const { id, name, kind, currency, archived, createdAt, updatedAt, revision, transactionCount, scenarioCount, historyEpoch, historyNote } = record;
  return {
    id,
    ledgerCurrency: record.ledgerCurrency ?? record.ledger.currency ?? record.currency,
    deleting: record.deleting ?? false,
    name,
    kind,
    currency,
    archived,
    createdAt,
    updatedAt,
    revision,
    transactionCount,
    scenarioCount,
    historyEpoch,
    historyNote
  };
}

@Injectable()
export class PortfolioService {
  constructor(private readonly repository: PortfolioRepository, private readonly market: PortfolioMarketService, private readonly fx: PortfolioFxService) { }

  private async snapshot(records: PortfolioRecord[]): Promise<MarketSnapshot> {
    return records.some((record) => !record.deleting && record.ledger.positions.length > 0) ? this.market.snapshot() : {
      runId: null,
      stocks: []
    };
  }

  private async analysis(uid: string, record: PortfolioRecord, snapshot: MarketSnapshot, fx: FxQuote | null, force = false): Promise<PortfolioAnalysis> {
    if (record.deleting) return analysePortfolio(record, emptyLedger(), [], null);
    const fxKey = fx ? `${fx.asOf}:${fx.eurUsd}:${fx.stale}` : 'unavailable';
    const cached = force ? null : await this.repository.cachedAnalysis(uid, record.id);
    const now = Date.now();
    if (cached && cached.analysis.reportingVersion === 2 && cached.analysis.fxCacheKey === fxKey && cached.analysis.currency === record.currency && cached.epoch === record.historyEpoch && cached.analysis.revision === record.revision && cached.analysis.runId === snapshot.runId && cached.analysis.calculatedAt.slice(0, 10) === new Date(now).toISOString().slice(0, 10) && now - Date.parse(cached.analysis.calculatedAt) < 300_000) return cached.analysis;
    const result = analysePortfolio(record, record.ledger, snapshot.stocks, snapshot.runId, new Date().toISOString(), fx, record.ledgerCurrency ?? record.ledger.currency ?? record.currency);
    result.fxCacheKey = fxKey;
    if (!(await this.repository.persistAnalysis(uid, record, result))) throw new ConflictException('Portfolio changed while loading. Please refresh.');
    return result;
  }

  async list(uid: string, includeArchived = false): Promise<PortfolioListResponse> {
    const records = (await this.repository.list(uid)).filter((record) => includeArchived || !record.archived);
    const snapshot = await this.snapshot(records);
    const fx = await this.exchangeRates(records);
    const items: PortfolioListResponse['items'] = [];
    // Bound Firestore concurrency rather than launching 25 parallel transactions.
    for (let i = 0; i < records.length; i += 4) items.push(...await Promise.all(records.slice(i, i + 4).map(async (record) => ({
      portfolio: publicPortfolio(record),
      analysis: await this.analysis(uid, record, snapshot, fx)
    }))));
    const real = records.filter((record) => record.kind === 'real' && !record.archived && !record.deleting);
    const combined = [...new Set(real.map((record) => record.currency))].map((currency) => {
      const group = real.filter((record) => record.currency === currency);
      const result = analysePortfolio({
        ...group[0],
        id: 'combined'
      }, combineLedgers(group.map((record) => ({...record.ledger, currency: record.ledgerCurrency ?? record.ledger.currency ?? record.currency}))), snapshot.stocks, snapshot.runId, new Date().toISOString(), fx);
      return {
        currency,
        portfolioCount: group.length,
        totalValue: result.totalValue,
        pricedSubtotal: result.pricedSubtotal
      };
    });
    return {
      items,
      combined
    };
  }

  async create(uid: string, input: CreatePortfolioInput) {
    return publicPortfolio(await this.repository.create(uid, input));
  }
  
  async ledger(uid: string, id: string) {
    const record = await this.repository.get(uid, id);
    return {
      portfolio: publicPortfolio(record),
      ledger: record.ledger
    };
  }
  async settings(uid: string, id: string) {
    return publicPortfolio(await this.repository.settings(uid, id));
  }
  async update(uid: string, id: string, input: UpdatePortfolioInput) {
    return publicPortfolio(await this.repository.update(uid, id, input));
  }
  async detail(uid: string, id: string): Promise<PortfolioDetail> {
    const record = await this.repository.get(uid, id);
    const snapshot = await this.snapshot([record]);
    const fx = await this.exchangeRates([record]);
    const analysis = await this.analysis(uid, record, snapshot, fx);
    const [observations, events, scenarios] = await Promise.all([
      this.repository.history(uid, id, record.historyEpoch),
      this.repository.transactions(uid, id),
      this.repository.scenarios(uid, id)
    ]);
    const activity = events.sort((a, b) => b.sequence - a.sequence).slice(0, 50);
    return {
      portfolio: publicPortfolio(record),
      analysis,
      observations,
      activity,
      nextActivityCursor: events.length > activity.length ? activity.at(-1)!.sequence : null,
      scenarios,
      combined: false
    };
  }
  async combined(uid: string, currency: PortfolioCurrency): Promise<PortfolioDetail> {
    const records = (await this.repository.list(uid)).filter((record) => record.kind === 'real' && !record.archived && !record.deleting);
    if (!records.length) throw new PortfolioInputError('No real portfolios in this currency.');
    const snapshot = await this.snapshot(records);
    const fx = await this.exchangeRates(records.map((record) => ({...record, currency})));
    const portfolio: PortfolioMeta = {
      ...publicPortfolio(records[0]),
      id: 'combined',
      currency,
      name: `All real portfolios · ${currency}`,
      revision: 0,
      transactionCount: records.reduce((count, record) => count + record.transactionCount, 0),
      scenarioCount: 0,
      historyEpoch: 0,
      historyNote: 'Current combined view. Model and archived portfolios are excluded. USD/EUR values are converted at the displayed reference rate.'
    };
    return {
      portfolio,
      analysis: analysePortfolio(portfolio, combineLedgers(records.map((record) => ({...record.ledger, currency: record.ledgerCurrency ?? record.ledger.currency ?? record.currency}))), snapshot.stocks, snapshot.runId, new Date().toISOString(), fx),
      observations: [],
      activity: [],
      nextActivityCursor: null,
      scenarios: [],
      combined: true
    };
  }
  async instruments(query: string, currency?: PortfolioCurrency) {
    const snapshot = await this.market.snapshot();
    const needle = query.trim().toLowerCase();
    return {
      runId: snapshot.runId,
      items: snapshot.stocks.filter((stock) => (!currency || stock.instrument.currency === currency) && (!needle || stock.instrument.symbol.toLowerCase().includes(needle) || stock.instrument.companyName.toLowerCase().includes(needle))).sort((a, b) => Number(b.instrument.symbol.toLowerCase() === needle) - Number(a.instrument.symbol.toLowerCase() === needle) || a.instrument.symbol.localeCompare(b.instrument.symbol)).slice(0, 30)
    };
  }
  async addTransaction(uid: string, id: string, input: TransactionInput) {
    const record = await this.repository.get(uid, id);
    if (await this.repository.existingTransaction(uid, id, input)) return {
      success: true,
      portfolio: publicPortfolio(record)
    };
    let instrument: PortfolioInstrument | null = null;
    if (input.symbol) {
      const matches = (candidate: PortfolioInstrument) => candidate.symbol === input.symbol
        && (!input.currency || candidate.currency === input.currency)
        && (!input.instrumentId || candidate.id === input.instrumentId);
      const held = record.ledger.positions.filter((position) => matches(position.instrument));
      if (held.length === 1) instrument = held[0].instrument;
      else {
        const snapshot = await this.market.snapshot();
        const candidates = snapshot.stocks.filter((stock) => matches(stock.instrument));
        if (candidates.length > 1) throw new PortfolioInputError('Select the exact stock listing and currency.');
        instrument = candidates[0]?.instrument ?? null;
      }
      if (!instrument) throw new PortfolioInputError('This USD/EUR stock listing is not available in saved data.');
    }
    const updated = await this.repository.append(uid, id, input, instrument);
    return {
      success: true,
      portfolio: publicPortfolio(updated)
    };
  }
  async voidTransaction(uid: string, id: string, transactionId: string) {
    return {
      success: true,
      portfolio: publicPortfolio(await this.repository.voidTransaction(uid, id, transactionId))
    };
  }
  async activity(uid: string, id: string, before: number | null) {
    const events = (await this.repository.transactions(uid, id)).filter((event) => before === null || event.sequence < before).sort((a, b) => b.sequence - a.sequence);
    const items = events.slice(0, 50);
    return {
      items,
      nextCursor: events.length > items.length ? items.at(-1)!.sequence : null
    };
  }
  async preview(uid: string, id: string, input: ScenarioInput) {
    const record = await this.repository.get(uid, id);
    if (record.currency !== (record.ledgerCurrency ?? record.currency) || record.ledger.positions.some((position) => position.instrument.currency !== record.currency)) throw new PortfolioInputError('Legacy What-if calculations are not available for mixed-currency portfolios.');
    const [events, snapshot] = await Promise.all([this.repository.transactions(uid, id), this.market.snapshot()]);
    const latest = await this.repository.get(uid, id);
    if (latest.revision !== record.revision) throw new ConflictException('Portfolio changed. Please preview again.');
    return previewScenario(record, events, snapshot.stocks, snapshot.runId, input);
  }
  async saveScenario(uid: string, id: string, requestId: string, previewToken: string, input: ScenarioInput) {
    const digest = fingerprint([input, previewToken]);
    const existing = await this.repository.existingScenario(uid, id, requestId, digest);
    if (existing) return existing;
    const preview = await this.preview(uid, id, input);
    if (preview.previewToken !== previewToken) throw new ConflictException('Portfolio or saved price changed. Preview again before saving.');
    return this.repository.saveScenario(uid, id, requestId, preview, digest);
  }
  async scenario(uid: string, id: string, scenarioId: string) {
    return this.repository.scenario(uid, id, scenarioId);
  }
  async refreshObservation(uid: string, id: string) {
    const record = await this.repository.get(uid, id);
    if (record.archived || record.deleting) return;
    return this.analysis(uid, record, await this.snapshot([record]), await this.exchangeRates([record]), true);
  }

  async delete(uid: string, id: string): Promise<{success: true; id: string}> {
    return this.repository.delete(uid, id);
  }

  private async exchangeRates(records: PortfolioRecord[]): Promise<FxQuote | null> {
    const needed = records.some((record) => {
      if (record.deleting) return false;
      if (record.ledger.positions.some((position) => position.instrument.currency !== record.currency)) return true;
      return Object.entries(nativeTotals(record.ledger, record.ledgerCurrency ?? record.currency)).some(([code, totals]) => code !== record.currency && Object.values(totals).some((value) => value !== null && Number(value) !== 0));
    });
    return needed ? this.fx.snapshot() : null;
  }
}
