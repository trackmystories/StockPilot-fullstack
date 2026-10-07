import {Injectable} from '@nestjs/common';
import {FmpHttpService} from '../fmp/clients/fmp-http.service';

type Definition = {
  id: string;
  symbol: string;
  label: string;
  valueUnit: 'points' | 'percent';
  changeUnit: 'percent' | 'basis_points';
  colorMode: 'directional' | 'neutral';
};

export type MarketIndicator = Definition & {
  value: number | null;
  change: number | null;
  direction: 'up' | 'down' | 'flat' | null;
  asOf: string | null;
  previousAsOf: string | null;
  asOfPrecision: 'timestamp' | 'date';
  changeBasis: 'previous_close' | 'previous_observation';
  status: 'available' | 'unavailable';
  reason: 'no_data' | 'invalid_data' | 'access_restricted' | 'upstream_error' | null;
  source: 'FMP';
};

export type MarketIndicatorsResponse = {
  items: MarketIndicator[];
  generatedAt: string;
  refreshAfterSeconds: number;
  availableCount: number;
};

const DEFINITIONS: Definition[] = [
  {
    id: 'sp500',
    symbol: '^GSPC',
    label: 'S&P 500',
    valueUnit: 'points',
    changeUnit: 'percent',
    colorMode: 'directional',
  },
  {
    id: 'nasdaq',
    symbol: '^IXIC',
    label: 'NASDAQ',
    valueUnit: 'points',
    changeUnit: 'percent',
    colorMode: 'directional',
  },
  {id: 'dow', symbol: '^DJI', label: 'DOW JONES', valueUnit: 'points', changeUnit: 'percent', colorMode: 'directional'},
  {
    id: 'russell2000',
    symbol: '^RUT',
    label: 'RUSSELL 2000',
    valueUnit: 'points',
    changeUnit: 'percent',
    colorMode: 'directional',
  },
  {id: 'vix', symbol: '^VIX', label: 'VIX', valueUnit: 'points', changeUnit: 'percent', colorMode: 'neutral'},
  {
    id: 'us10y',
    symbol: 'US10Y',
    label: 'US 10Y',
    valueUnit: 'percent',
    changeUnit: 'basis_points',
    colorMode: 'neutral',
  },
];

const CACHE_MS = 60_000;

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function round(value: number): number | null {
  return Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : null;
}

function direction(change: number | null): MarketIndicator['direction'] {
  return change === null ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
}

function dateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function empty(definition: Definition, reason: MarketIndicator['reason']): MarketIndicator {
  const treasury = definition.id === 'us10y';
  return {
    ...definition,
    value: null,
    change: null,
    direction: null,
    asOf: null,
    previousAsOf: null,
    asOfPrecision: treasury ? 'date' : 'timestamp',
    changeBasis: treasury ? 'previous_observation' : 'previous_close',
    status: 'unavailable',
    reason,
    source: 'FMP',
  };
}

export function parseIndex(definition: Definition, payload: unknown, now: number): MarketIndicator {
  if (!Array.isArray(payload)) return empty(definition, 'invalid_data');
  const matches = payload.map(record).filter((row) => row?.symbol === definition.symbol);
  if (matches.length === 0) return empty(definition, 'no_data');
  if (matches.length !== 1) return empty(definition, 'invalid_data');
  const row = matches[0]!;
  const value = number(row.price);
  if (value === null || value <= 0) return empty(definition, 'invalid_data');
  const seconds = number(row.timestamp);
  const milliseconds = seconds === null ? null : seconds * 1000;
  if (milliseconds !== null && (milliseconds <= 0 || milliseconds > now + 300_000)) {
    return empty(definition, 'invalid_data');
  }
  const previous = number(row.previousClose);
  const supplied = number(row.changePercentage);
  const change = supplied ?? (previous !== null && previous > 0 ? round(((value - previous) / previous) * 100) : null);
  return {
    ...empty(definition, null),
    value,
    change,
    direction: direction(change),
    asOf: milliseconds === null ? null : new Date(milliseconds).toISOString(),
    status: 'available',
  };
}

export function parseTreasury(payload: unknown, now: number): MarketIndicator {
  const definition = DEFINITIONS[5];
  if (!Array.isArray(payload)) return empty(definition, 'invalid_data');
  const today = new Date(now).toISOString().slice(0, 10);
  const observations = new Map<string, number | null>();
  for (const item of payload) {
    const row = record(item);
    const date = dateOnly(row?.date);
    if (!date || date > today) continue;
    const value = number(row?.year10);
    if (observations.has(date) && observations.get(date) !== value) return empty(definition, 'invalid_data');
    observations.set(date, value);
  }
  const rows = [...observations].sort(([a], [b]) => b.localeCompare(a));
  const latest = rows[0];
  if (!latest) return empty(definition, 'no_data');
  if (latest[1] === null) return empty(definition, 'invalid_data');
  const previous = rows[1];
  const change = previous && previous[1] !== null ? round((latest[1] - previous[1]) * 100) : null;
  return {
    ...empty(definition, null),
    value: latest[1],
    change,
    direction: direction(change),
    asOf: latest[0],
    previousAsOf: change === null ? null : previous[0],
    status: 'available',
  };
}

@Injectable()
export class MarketIndicatorsService {
  private cached: {expiresAt: number; response: MarketIndicatorsResponse} | null = null;
  private pending: Promise<MarketIndicatorsResponse> | null = null;
  constructor(private readonly http: FmpHttpService) {}
  async getIndicators(): Promise<MarketIndicatorsResponse> {
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached.response;
    if (this.pending) return this.pending;
    this.pending = this.load();
    try {
      const response = await this.pending;
      this.cached = {expiresAt: Date.now() + CACHE_MS, response};
      return response;
    } finally {
      this.pending = null;
    }
  }
  private async load(): Promise<MarketIndicatorsResponse> {
    const now = Date.now();
    const from = new Date(now - 45 * 86_400_000).toISOString().slice(0, 10);
    const to = new Date(now).toISOString().slice(0, 10);
    const items = await Promise.all(
      DEFINITIONS.map(async (definition) => {
        try {
          if (definition.id === 'us10y') {
            return parseTreasury(await this.http.get<unknown>('treasury-rates', {from, to}), Date.now());
          }
          return parseIndex(definition, await this.http.get<unknown>('quote', {symbol: definition.symbol}), Date.now());
        } catch (error) {
          const upstreamStatus = record(error)?.upstreamStatus;
          return empty(
            definition,
            upstreamStatus === 402 || upstreamStatus === 403 ? 'access_restricted' : 'upstream_error',
          );
        }
      }),
    );
    return {
      items,
      generatedAt: new Date().toISOString(),
      refreshAfterSeconds: CACHE_MS / 1000,
      availableCount: items.filter((item) => item.status === 'available').length,
    };
  }
}
