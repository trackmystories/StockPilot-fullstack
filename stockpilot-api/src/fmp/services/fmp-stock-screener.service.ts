import {Injectable, Logger} from '@nestjs/common';

import {FmpHttpService} from '../clients/fmp-http.service';

export type FmpScreenedCompany = {
  symbol: string;
  companyName: string;
  marketCap: number | null;
  price: number | null;
  volume: number | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
};

const PAGE_SIZE = 1000;
const ELIGIBLE_UNIVERSE_TTL = 6 * 60 * 60 * 1000;

type EligibleUniverseCache = {
  symbols: Set<string>;
  expiresAt: number;
};

@Injectable()
export class FmpStockScreenerService {
  private readonly logger = new Logger(FmpStockScreenerService.name);

  private eligibleUniverseCache: EligibleUniverseCache | null = null;
  private eligibleUniversePromise: Promise<Set<string>> | null = null;

  constructor(private readonly http: FmpHttpService) {}

  async getCandidates(): Promise<FmpScreenedCompany[]> {
    const companies: FmpScreenedCompany[] = [];
    const seenSymbols = new Set<string>();

    let page = 0;

    this.logger.log('Loading complete eligible company universe from FMP.');

    while (true) {
      this.logger.log(`Loading FMP company screener page ${page}.`);

      const payload = await this.http.get<unknown>('company-screener', {
        isEtf: 'false',
        isFund: 'false',
        isActivelyTrading: 'true',
        limit: String(PAGE_SIZE),
        page: String(page),
      });

      if (!Array.isArray(payload)) {
        throw new Error('Invalid FMP company screener response.');
      }

      if (payload.length === 0) {
        this.logger.log(`FMP page ${page} returned no companies.`);
        break;
      }

      const pageCompanies = payload
        .map((raw): FmpScreenedCompany => {
          const company = raw as Record<string, unknown>;

          const symbol = String(company.symbol ?? '')
            .trim()
            .toUpperCase();

          const companyName = String(company.companyName ?? company.name ?? symbol).trim();

          return {
            symbol,
            companyName: companyName || symbol,
            marketCap: this.toNumber(company.marketCap),
            price: this.toNumber(company.price),
            volume: this.toNumber(company.volume),
            sector: this.toStringOrNull(company.sector),
            industry: this.toStringOrNull(company.industry),
            exchange: this.toStringOrNull(company.exchange),
            country: this.toStringOrNull(company.country),
          };
        })
        .filter((company) => company.symbol.length > 0);

      let newCompanies = 0;

      for (const company of pageCompanies) {
        if (seenSymbols.has(company.symbol)) {
          continue;
        }

        seenSymbols.add(company.symbol);
        companies.push(company);
        newCompanies += 1;
      }

      this.logger.log(
        `Page ${page}: ${payload.length} returned, ${newCompanies} new, ${companies.length} total unique companies.`,
      );

      if (payload.length < PAGE_SIZE) {
        break;
      }

      if (newCompanies === 0) {
        this.logger.warn(`Stopping pagination because page ${page} returned no new symbols.`);

        break;
      }

      page += 1;
    }

    this.logger.log(`Finished loading complete FMP eligible equity universe: ${companies.length} unique companies.`);

    this.rememberEligibleUniverse(companies);

    return companies;
  }

  async getEligibleSymbols(): Promise<ReadonlySet<string>> {
    const now = Date.now();

    if (this.eligibleUniverseCache && this.eligibleUniverseCache.expiresAt > now) {
      return this.eligibleUniverseCache.symbols;
    }

    if (this.eligibleUniversePromise) {
      return this.eligibleUniversePromise;
    }

    const task = this.loadEligibleSymbols();

    this.eligibleUniversePromise = task;

    try {
      return await task;
    } finally {
      this.eligibleUniversePromise = null;
    }
  }

  private async loadEligibleSymbols(): Promise<Set<string>> {
    const companies = await this.getCandidates();

    const symbols = new Set(companies.map((company) => company.symbol.trim().toUpperCase()));

    this.eligibleUniverseCache = {
      symbols,
      expiresAt: Date.now() + ELIGIBLE_UNIVERSE_TTL,
    };

    return symbols;
  }

  private rememberEligibleUniverse(companies: FmpScreenedCompany[]): void {
    const symbols = new Set<string>();

    for (const company of companies) {
      const symbol = company.symbol.trim().toUpperCase();

      if (!symbol) {
        continue;
      }

      symbols.add(symbol);
    }

    this.eligibleUniverseCache = {
      symbols,
      expiresAt: Date.now() + ELIGIBLE_UNIVERSE_TTL,
    };
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private toStringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    return value.trim() || null;
  }
}
