import {BadRequestException, ConflictException, Injectable, Logger, ServiceUnavailableException} from '@nestjs/common';
import {StockFilterRepository} from './stock-filter.repository';
import {buildCatalog, queryCatalog, savedDataIsStale, type FilterCatalog} from './stock-filter.logic';
import type {FilterLoading, FilterOptions, FilterQuery, FilterResults, FilterStock} from './stock-filter.types';
type Snapshot = {
  runId: string;
  loadedAt: string;
  stocks: FilterStock[];
};
@Injectable()
export class StockFilterService {
  private readonly logger = new Logger(StockFilterService.name);
  private snapshot: Snapshot | null = null;
  private loading: {
    runId: string;
    promise: Promise<void>;
  } | null = null;
  private failure: {
    runId: string;
    retryAt: number;
  } | null = null;
  private catalog: {
    runId: string;
    revision: string;
    value: FilterCatalog;
  } | null = null;
  constructor(private readonly repository: StockFilterRepository) {
  }
  private async ready(): Promise<Snapshot | null> {
    const runId = await this.repository.activeRun();
    if (this.snapshot?.runId === runId)
      return this.snapshot;
    if (this.failure?.runId === runId && this.failure.retryAt > Date.now())
      throw new ServiceUnavailableException('Could not read the saved Firestore filter data. Please retry in a few seconds.');
    if (!this.loading) {
      const promise = this.repository.load(runId).then((stocks) => {
        this.snapshot = {
          runId,
          stocks,
          loadedAt: new Date().toISOString()
        };
        this.catalog = null;
        this.failure = null;
      }).catch((error: unknown) => {
        this.failure = {runId, retryAt: Date.now() + 10000};
        this.logger.error('Firestore filter cache could not be loaded.', error instanceof Error ? error.stack : String(error));
      }).finally(() => {
        this.loading = null;
      });
      this.loading = {runId, promise};
    }
    return null;
  }
  private async getCatalog(snapshot: Snapshot): Promise<FilterCatalog> {
    const blocked = await this.repository.blockedSymbols();
    if (this.catalog?.runId === snapshot.runId && this.catalog.revision === blocked.revision)
      return this.catalog.value;
    const value = buildCatalog(snapshot.stocks.filter((stock) => !blocked.ids.has(stock.symbol)));
    const industry = value.sections.find((section) => section.id === 'industry');
    const industries = new Set(industry?.options.flatMap((group) => group.children?.map((child) => child.label) ?? []) ?? []);
    this.logger.log(`Saved filter coverage ${JSON.stringify({
      runId: snapshot.runId,
      savedStocks: snapshot.stocks.length,
      restrictedExcluded: snapshot.stocks.length - value.stocks.length,
      availableStocks: value.stocks.length,
      withIndustry: value.stocks.filter((stock) => stock.industry !== null).length,
      withoutIndustry: value.stocks.filter((stock) => stock.industry === null).length,
      sectors: new Set(value.stocks.map((stock) => stock.sector).filter(Boolean)).size,
      industries: industries.size,
      filterSections: value.sections.length,
      withoutUsableScores: value.stocks.filter((stock) => !Object.values(stock.scores).some((score) => score !== null)).length,
    })}`);
    this.catalog = {
      runId: snapshot.runId,
      revision: blocked.revision,
      value
    };
    return value;
  }
  // Shared read-only source for Portfolio Intelligence. No FMP or SEC calls.
  async savedStocks(): Promise<{status: 'ready'; runId: string; stocks: FilterStock[]} | FilterLoading> {
    const snapshot = await this.ready();
    if (!snapshot) return {status: 'loading', message: 'Loading the saved stock snapshot. Please retry shortly.'};
    const catalog = await this.getCatalog(snapshot);
    return {
      status: 'ready',
      runId: snapshot.runId,
      stocks: catalog.stocks.map((stock) => ({...stock, stale: savedDataIsStale(stock.calculatedAt, stock.quoteAsOf)})),
    };
  }
  async options(): Promise<FilterOptions | FilterLoading> {
    const snapshot = await this.ready();
    if (!snapshot)
      return {
        status: 'loading',
        message: 'Loading saved Firestore stocks. No external market-data requests are being made.'
      };
    const catalog = await this.getCatalog(snapshot);
    return {
      status: 'ready',
      runId: snapshot.runId,
      loadedAt: snapshot.loadedAt,
      total: catalog.stocks.length,
      sections: catalog.sections
    };
  }
  async query(query: FilterQuery): Promise<FilterResults | FilterLoading> {
    const snapshot = await this.ready();
    if (!snapshot)
      return {status: 'loading', message: 'Loading the published Firestore stock snapshot.'};
    if (query.runId !== snapshot.runId)
      throw new ConflictException('A newer stock snapshot was published. Reopen the filters to use the latest data.');
    const catalog = await this.getCatalog(snapshot);
    let matches: FilterStock[];
    try {
      matches = queryCatalog(catalog, query.selectedIds, query.sort);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid filter selection.');
    }
    const items = matches.slice(query.offset, query.offset + query.limit).map((stock) => ({...stock, stale: savedDataIsStale(stock.calculatedAt, stock.quoteAsOf)}));
    return {
      status: 'ready',
      runId: snapshot.runId,
      loadedAt: snapshot.loadedAt,
      total: matches.length,
      items,
      nextOffset: query.offset + items.length < matches.length ? query.offset + items.length : null
    };
  }
}
