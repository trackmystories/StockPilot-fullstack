import {HttpException, Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {FmpRateLimiterService} from './fmp-rate-limiter.service';
import {FmpResponseCacheService} from './fmp-response-cache.service';

import {FmpAccessService} from './fmp-access.service';

const HOUR = 60 * 60 * 1000;

const PERSISTENT_TTLS: Record<string, number> = {
  'income-statement': 24 * HOUR,
  'balance-sheet-statement': 24 * HOUR,
  'cash-flow-statement': 24 * HOUR,
  ratios: 24 * HOUR,
  profile: 24 * HOUR,
  'analyst-estimates': 6 * HOUR,
  'historical-price-eod/full': HOUR,
};

export class FmpHttpError extends HttpException {
  constructor(
    message: string,
    status = 502,
    readonly upstreamStatus?: number,
  ) {
    super(
      {
        statusCode: status,
        message,
        code: upstreamStatus === 402 ? 'FMP_ACCESS_RESTRICTED' : 'FMP_REQUEST_FAILED',
        ...(upstreamStatus !== undefined ? {upstreamStatus} : {}),
      },
      status,
    );
  }
}

@Injectable()
export class FmpHttpService {
  constructor(
    private readonly config: ConfigService,
    private readonly limiter: FmpRateLimiterService,
    private readonly cache: FmpResponseCacheService,
    private readonly access: FmpAccessService,
  ) {}

  get<T = unknown[]>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const persistentTtl = PERSISTENT_TTLS[endpoint];

    const ttl =
      persistentTtl ??
      (/price-target|ratings/.test(endpoint) ? HOUR : endpoint.startsWith('search-') ? 300_000 : 60_000);

    return this.cache.get(
      endpoint,
      params,
      ttl,
      async () => {
        const key = this.config.get<string>('FMP_API_KEY')?.trim();

        if (!key) {
          throw new FmpHttpError('FMP_API_KEY is not configured.', 503);
        }

        const query = new URLSearchParams(params);
        query.set('apikey', key);

        const url = `https://financialmodelingprep.com/stable/${endpoint}?${query}`;

        try {
          const response = await this.limiter.run(() =>
            fetch(url, {
              headers: {
                Accept: 'application/json',
              },
              signal: AbortSignal.timeout(10_000),
            }),
          );

          if (response.status === 402) {
            if (params.symbol) {
              await this.access.record(params.symbol, endpoint);
            }
            throw new FmpHttpError(
              'This market data is unavailable under the current data-provider subscription.',
              503,
              402,
            );
          }

          if (!response.ok) {
            throw new FmpHttpError(
              `FMP ${endpoint} failed (HTTP ${response.status}).`,
              response.status === 429 ? 429 : response.status === 404 ? 404 : 502,
              response.status,
            );
          }

          const payload: unknown = await response.json();

          if (persistentTtl !== undefined && !Array.isArray(payload)) {
            throw new FmpHttpError(`Invalid FMP ${endpoint} response.`);
          }

          return payload as T;
        } catch (error) {
          if (error instanceof FmpHttpError) {
            throw error;
          }

          throw new FmpHttpError(`FMP ${endpoint} is temporarily unavailable.`);
        }
      },
      persistentTtl !== undefined,
    );
  }
}
