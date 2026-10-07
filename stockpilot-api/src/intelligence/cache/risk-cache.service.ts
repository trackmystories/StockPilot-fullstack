import {Injectable, Logger} from '@nestjs/common';
import {FmpRiskDataService} from '../../fmp/services/fmp-risk-data.service';

type StockRiskMetrics = Awaited<ReturnType<FmpRiskDataService['getStockRiskMetrics']>>;

type CachedRiskMetrics = {
  expiresAt: number;
  value: StockRiskMetrics;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class RiskCacheService {
  private readonly logger = new Logger(RiskCacheService.name);

  private readonly cache = new Map<string, CachedRiskMetrics>();

  private readonly pending = new Map<string, Promise<StockRiskMetrics>>();

  constructor(private readonly riskDataService: FmpRiskDataService) {}

  async get(symbol: string): Promise<StockRiskMetrics> {
    const normalizedSymbol = symbol.trim().toUpperCase();

    const cached = this.cache.get(normalizedSymbol);

    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Risk cache hit: ${normalizedSymbol}`);

      return cached.value;
    }

    const pending = this.pending.get(normalizedSymbol);

    if (pending) {
      return pending;
    }

    this.logger.debug(`Risk cache miss: ${normalizedSymbol}`);

    const request = this.riskDataService
      .getStockRiskMetrics(normalizedSymbol)
      .then((value) => {
        this.cache.set(normalizedSymbol, {
          value,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return value;
      })
      .finally(() => {
        this.pending.delete(normalizedSymbol);
      });

    this.pending.set(normalizedSymbol, request);

    return request;
  }

  clear(symbol?: string): void {
    if (symbol) {
      const normalizedSymbol = symbol.trim().toUpperCase();

      this.cache.delete(normalizedSymbol);
      this.pending.delete(normalizedSymbol);

      return;
    }

    this.cache.clear();
    this.pending.clear();
  }
}
