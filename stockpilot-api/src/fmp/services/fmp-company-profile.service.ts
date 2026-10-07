import {Injectable} from '@nestjs/common';
import {FmpHttpService} from '../clients/fmp-http.service';

export type FmpCompanyProfile = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  exchangeFullName: string | null;
  country: string | null;
  city: string | null;
  ceo: string | null;
  fullTimeEmployees: number | null;
  website: string | null;
  description: string | null;
  ipoDate: string | null;
  beta: number | null;
  image: string | null;
};

export class CompanyProfileError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);

    this.name = 'CompanyProfileError';
    this.status = status;
  }
}

type CachedProfile = {
  profile: FmpCompanyProfile;
  expiresAt: number;
};

@Injectable()
export class FmpCompanyProfileService {
  private readonly cache = new Map<string, CachedProfile>();
  private readonly pending = new Map<string, Promise<FmpCompanyProfile>>();

  private readonly cacheTtlMs = 6 * 60 * 60 * 1000;
  private readonly maxCacheSize = 500;

  constructor(private readonly http: FmpHttpService) {}

  async getCompanyProfile(rawSymbol: string): Promise<FmpCompanyProfile> {
    const symbol = this.validateSymbol(rawSymbol);

    const cached = this.cache.get(symbol);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.profile;
    }

    const existingRequest = this.pending.get(symbol);

    if (existingRequest) {
      return existingRequest;
    }

    const request = this.loadCompanyProfile(symbol);

    this.pending.set(symbol, request);

    try {
      return await request;
    } finally {
      this.pending.delete(symbol);
    }
  }

  private async loadCompanyProfile(symbol: string): Promise<FmpCompanyProfile> {
    try {
      const payload = await this.http.get<unknown>('profile', {
        symbol,
      });

      const profile = this.parseCompanyProfile(payload, symbol);

      this.storeInCache(symbol, profile);

      return profile;
    } catch (error) {
      if (error instanceof CompanyProfileError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new CompanyProfileError(error.message);
      }

      throw new CompanyProfileError('Company profile could not be reached.');
    }
  }

  private storeInCache(symbol: string, profile: FmpCompanyProfile): void {
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(symbol, {
      profile,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private validateSymbol(rawSymbol: string): string {
    const symbol = rawSymbol.trim().toUpperCase();

    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) {
      throw new CompanyProfileError('Invalid stock symbol.', 400);
    }

    return symbol;
  }

  private parseCompanyProfile(payload: unknown, symbol: string): FmpCompanyProfile {
    if (!Array.isArray(payload)) {
      throw new CompanyProfileError('Invalid company profile response.');
    }

    const row =
      payload.find((item) => item && typeof item.symbol === 'string' && item.symbol.toUpperCase() === symbol) ??
      payload[0];

    if (!row) {
      throw new CompanyProfileError('No company profile is available for this stock.', 404);
    }

    return {
      symbol,
      companyName: this.stringOrNull(row.companyName),
      sector: this.stringOrNull(row.sector),
      industry: this.stringOrNull(row.industry),
      exchange: this.stringOrNull(row.exchange),
      exchangeFullName: this.stringOrNull(row.exchangeFullName),
      country: this.stringOrNull(row.country),
      city: this.stringOrNull(row.city),
      ceo: this.stringOrNull(row.ceo),
      fullTimeEmployees: this.numberOrNull(row.fullTimeEmployees),
      website: this.stringOrNull(row.website),
      description: this.stringOrNull(row.description),
      ipoDate: this.stringOrNull(row.ipoDate),
      beta: this.numberOrNull(row.beta),
      image: this.stringOrNull(row.image),
    };
  }

  private stringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed || null;
  }

  private numberOrNull(value: unknown): number | null {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return null;
    }

    if (typeof value === 'string' && !value.trim()) {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }
}
