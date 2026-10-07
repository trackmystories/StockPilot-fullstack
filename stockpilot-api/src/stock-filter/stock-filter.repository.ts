import {Injectable, Logger, ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {FieldPath, type Query, type QueryDocumentSnapshot, type QuerySnapshot} from 'firebase-admin/firestore';
import {createHash} from 'node:crypto';
import {FirebaseService} from '../firebase/firebase.service';
import {FILTER_METRIC_KEYS, mapSavedStock} from './stock-filter.logic';
import {SCORE_KEYS, type FilterStock} from './stock-filter.types';
const PAGE_SIZE = 500;
const REQUIRED_ENDPOINTS = new Set(['quote', 'income-statement', 'balance-sheet-statement', 'cash-flow-statement', 'ratios']);
@Injectable()
export class StockFilterRepository {
  private readonly logger = new Logger(StockFilterRepository.name);
  private state: {
    runId: string;
    until: number;
  } | null = null;
  private stateRequest: Promise<string> | null = null;
  private restrictions: {
    ids: Set<string>;
    expiresAt: number;
    revision: string;
  } | null = null;
  private restrictionRequest: Promise<{
    ids: Set<string>;
    expiresAt: number;
    revision: string;
  }> | null = null;
  constructor(private readonly firebase: FirebaseService, private readonly config: ConfigService) {
  }
  async activeRun(): Promise<string> {
    if (this.state && this.state.until > Date.now())
      return this.state.runId;
    if (this.stateRequest)
      return this.stateRequest;
    this.stateRequest = (async () => {
      const snapshot = await this.firebase.db.collection('screenerState').doc('current').get();
      const runId: unknown = snapshot.data()?.activeRun;
      if (typeof runId !== 'string' || !runId || runId.includes('/'))
        throw new ServiceUnavailableException('No published Firestore stock data is available. The filter does not start a refresh or ingestion job.');
      this.state = {runId, until: Date.now() + 60000};
      return runId;
    })();
    try {
      return await this.stateRequest;
    } finally {
      this.stateRequest = null;
    }
  }
  private async readPages(query: Query): Promise<Map<string, Record<string, unknown>>> {
    const rows = new Map<string, Record<string, unknown>>();
    const ordered = query.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    let last: QueryDocumentSnapshot | null = null;
    for (; ;) {
      const page: QuerySnapshot = await (last ? ordered.startAfter(last) : ordered).get();
      for (const doc of page.docs) rows.set(doc.id, doc.data());
      if (page.size < PAGE_SIZE)
        break;
      last = page.docs[page.docs.length - 1];
    }
    return rows;
  }
  async load(runId: string): Promise<FilterStock[]> {
    const run = this.firebase.db.collection('screenerRuns').doc(runId);
    // Only read the published run. Do not mix historical or in-progress runs.
    // Projections omit statements, historical prices and SEC filing text.
    const metricFields = FILTER_METRIC_KEYS.map((key) => `metrics.${key}`);
    const [universe, inputs, scorecards] = await Promise.all([
      this.readPages(run.collection('universe').select('symbol', 'companyName', 'exchange', 'sector', 'industry', 'price', 'marketCap', 'currency')),
      this.readPages(run.collection('preparedInputs').select(
        'symbol', 'company', 'risk.companyName', 'risk.logoUrl', 'preparedAt',
        ...metricFields, 'metrics.dataQuality.quoteCurrency', 'metrics.dataQuality.priceAsOf', 'metrics.secSupplement.status',
        'sourceObservations.observedAt', 'sourceObservations.quote.changePercentage', 'sourceObservations.quote.changesPercentage',
        'sourceObservations.profile.companyName', 'sourceObservations.profile.sector', 'sourceObservations.profile.industry',
        'sourceObservations.profile.exchangeShortName', 'sourceObservations.profile.exchange', 'sourceObservations.profile.currency', 'sourceObservations.profile.image',
      )),
      this.readPages(run.collection('scorecards').select(
        'symbol', 'calculatedAt', 'inputPreparedAt', 'data.generatedAt',
        ...SCORE_KEYS.map((key) => `data.scores.${key}`),
        ...metricFields.map((field) => `data.${field}`),
        'data.metrics.dataQuality.quoteCurrency', 'data.metrics.dataQuality.priceAsOf', 'data.metrics.secSupplement.status',
      )),
    ]);
    // Market/industry filtering does NOT require a completed scorecard.
    // Missing scores remain null and do not satisfy score thresholds.
    const valid = (id: string, row: Record<string, unknown>) =>
      /^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(id) &&
      (row.symbol == null || (typeof row.symbol === 'string' && row.symbol.trim().toUpperCase() === id));
    const sources = [universe, inputs, scorecards];
    let invalidDocuments = 0;
    for (const rows of sources) {
      for (const [id, row] of rows) {
        if (!valid(id, row)) {
          rows.delete(id);
          invalidDocuments += 1;
        }
      }
    }
    const symbols = new Set(sources.flatMap((rows) => [...rows.keys()]));
    const now = Date.now();
    const stocks = [...symbols].sort().map((symbol) => mapSavedStock(symbol, inputs.get(symbol) ?? {}, scorecards.get(symbol) ?? {}, now, universe.get(symbol) ?? {}));
    this.logger.log(`Saved filter sources ${JSON.stringify({
      runId,
      universeDocuments: universe.size,
      preparedInputDocuments: inputs.size,
      scorecardDocuments: scorecards.size,
      mergedStocks: stocks.length,
      invalidDocuments,
    })}`);
    return stocks;
  }

  async blockedSymbols(): Promise<{
    ids: Set<string>;
    revision: string;
  }> {
    if (this.restrictions && this.restrictions.expiresAt > Date.now())
      return this.restrictions;
    if (this.restrictionRequest)
      return this.restrictionRequest;
    this.restrictionRequest = (async () => {
      const key = this.config.get<string>('FMP_API_KEY')?.trim() ?? '';
      const now = Date.now();
      const ids = new Set<string>();
      let expiresAt = now + 60000;
      const docs = await this.readPages(this.firebase.db.collection('fmpAccessRestrictions').select('symbol', 'endpoints'));
      for (const [id, row] of docs) {
        if (typeof row.symbol !== 'string' || !row.endpoints || typeof row.endpoints !== 'object')
          continue;
        const symbol = row.symbol.trim().toUpperCase();
        const expected = createHash('sha256').update(JSON.stringify([key, symbol])).digest('hex');
        if (id !== expected)
          continue;
        for (const [endpoint, expiry] of Object.entries(row.endpoints)) {
          if (REQUIRED_ENDPOINTS.has(endpoint) && typeof expiry === 'number' && expiry > now) {
            ids.add(symbol);
            expiresAt = Math.min(expiresAt, expiry);
          }
        }
      }
      this.restrictions = {
        ids,
        expiresAt,
        revision: createHash('sha256').update([...ids].sort().join('\n')).digest('hex')
      };
      return this.restrictions;
    })();
    try {
      return await this.restrictionRequest;
    } finally {
      this.restrictionRequest = null;
    }
  }
}