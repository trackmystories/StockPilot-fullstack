import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {createHash} from 'node:crypto';
import {FirebaseService} from '../../firebase/firebase.service';

const RESTRICTION_TTL = 6 * 60 * 60 * 1000;
const LOOKUP_TTL = 30_000;
const MAX_ENTRIES = 1000;
const REQUIRED_ENDPOINTS = new Set([
  'quote',
  'income-statement',
  'balance-sheet-statement',
  'cash-flow-statement',
  'ratios',
]);

type Entry = {
  endpoints: Record<string, number>;
  until: number;
};

@Injectable()
export class FmpAccessService {
  private readonly logger = new Logger(FmpAccessService.name);
  private readonly memory = new Map<string, Entry>();

  constructor(
    private readonly firebase: FirebaseService,
    private readonly config: ConfigService,
  ) {}

  // Called only after a confirmed HTTP 402, never after a timeout or empty array.
  async record(rawSymbol: string, endpoint: string): Promise<void> {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!symbol || !REQUIRED_ENDPOINTS.has(endpoint)) return;

    const id = this.id(symbol);
    const now = Date.now();
    const previous = this.memory.get(id);
    if ((previous?.endpoints[endpoint] ?? 0) > now) return;

    const expiresAt = now + RESTRICTION_TTL;
    this.remember(id, {
      endpoints: {...previous?.endpoints, [endpoint]: expiresAt},
      until: now + LOOKUP_TTL,
    });

    try {
      await this.firebase.db
        .collection('fmpAccessRestrictions')
        .doc(id)
        .set(
          {
            symbol,
            endpoints: {[endpoint]: expiresAt},
            updatedAt: now,
          },
          {merge: true},
        );
    } catch {
      // Preserve the original FMP failure even if restriction storage is down.
      this.logger.warn(`Could not persist FMP access restriction for ${symbol}.`);
    }
  }

  async filter<T extends {symbol: string}>(stocks: T[]): Promise<T[]> {
    const now = Date.now();
    const ids = [...new Set(stocks.map((stock) => this.id(stock.symbol)))];
    const missing = ids.filter((id) => (this.memory.get(id)?.until ?? 0) <= now);

    // Search has at most 30 candidates; chunk defensively for other callers.
    for (let offset = 0; offset < missing.length; offset += 100) {
      const batch = missing.slice(offset, offset + 100);
      try {
        const refs = batch.map((id) => this.firebase.db.collection('fmpAccessRestrictions').doc(id));
        const docs = await this.firebase.db.getAll(...refs);
        docs.forEach((doc, index) => {
          const id = batch[index];
          // A concurrent 402 may already have updated this local entry.
          if ((this.memory.get(id)?.until ?? 0) > now) return;
          const endpoints: Record<string, number> = {};
          const stored: unknown = doc.data()?.endpoints;
          if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
            for (const [endpoint, expiry] of Object.entries(stored)) {
              if (typeof expiry === 'number' && Number.isFinite(expiry)) {
                endpoints[endpoint] = expiry;
              }
            }
          }
          this.remember(id, {endpoints, until: Date.now() + LOOKUP_TTL});
        });
      } catch {
        // A storage outage must not turn all search results into an empty list.
        this.logger.warn('Could not read FMP access restrictions; using local records.');
      }
    }

    const checkedAt = Date.now();
    return stocks.filter((stock) => {
      const entry = this.memory.get(this.id(stock.symbol));
      return (
        !entry ||
        !Object.entries(entry.endpoints).some(
          ([endpoint, expiresAt]) => REQUIRED_ENDPOINTS.has(endpoint) && expiresAt > checkedAt,
        )
      );
    });
  }

  private id(symbol: string): string {
    const key = this.config.get<string>('FMP_API_KEY')?.trim() ?? '';
    // Store neither credentials nor a reusable raw API-key identifier.
    return createHash('sha256')
      .update(JSON.stringify([key, symbol.trim().toUpperCase()]))
      .digest('hex');
  }

  private remember(id: string, entry: Entry): void {
    this.memory.delete(id);
    if (this.memory.size >= MAX_ENTRIES) {
      const oldest = this.memory.keys().next().value;
      if (oldest !== undefined) this.memory.delete(oldest);
    }
    this.memory.set(id, entry);
  }
}
