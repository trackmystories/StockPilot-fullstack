import {Injectable, Logger} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {gzip, gunzip} from 'node:zlib';
import {promisify} from 'node:util';
import {FirebaseService} from '../../firebase/firebase.service';

const compress = promisify(gzip);
const decompress = promisify(gunzip);
const MAX_MEMORY_BYTES = 32 * 1024 * 1024;

type CacheEntry = {
  value: unknown;
  expiresAt: number;
  bytes: number;
};

@Injectable()
export class FmpResponseCacheService {
  private readonly logger = new Logger(FmpResponseCacheService.name);
  private readonly memory = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private memoryBytes = 0;

  constructor(private readonly firebase: FirebaseService) {}

  async get<T>(
    endpoint: string,
    params: Record<string, string>,
    ttlMs: number,
    load: () => Promise<T>,
    persistent = true,
  ): Promise<T> {
    const query = new URLSearchParams(params);
    query.sort();

    const id = createHash('sha256').update(`v1:${endpoint}?${query}`).digest('hex');

    const cached = this.memory.get(id);

    if (cached && cached.expiresAt > Date.now()) {
      this.memory.delete(id);
      this.memory.set(id, cached);

      return cached.value as T;
    }

    const pending = this.pending.get(id);

    if (pending) {
      return pending as Promise<T>;
    }

    const task = this.load(id, endpoint, params, ttlMs, load, persistent);

    this.pending.set(id, task);

    try {
      return await task;
    } finally {
      this.pending.delete(id);
    }
  }

  private async load<T>(
    id: string,
    endpoint: string,
    params: Record<string, string>,
    ttlMs: number,
    loader: () => Promise<T>,
    persistent: boolean,
  ): Promise<T> {
    const ref = this.firebase.db.collection('fmpResponseCache').doc(id);

    if (persistent) {
      const document = await ref.get();
      const stored = document.data();

      if (
        stored?.schemaVersion === 1 &&
        typeof stored.expiresAt === 'number' &&
        stored.expiresAt > Date.now() &&
        Buffer.isBuffer(stored.payload)
      ) {
        try {
          const json = await decompress(stored.payload, {
            maxOutputLength: 20 * 1024 * 1024,
          });

          const value = JSON.parse(json.toString('utf8')) as T;

          this.remember(id, value, stored.expiresAt, json.length);

          return value;
        } catch {
          this.logger.warn(`Discarding unreadable cached ${endpoint} response.`);
        }
      }
    }

    const value = await loader();
    const json = Buffer.from(JSON.stringify(value), 'utf8');
    const fetchedAt = Date.now();
    const expiresAt = fetchedAt + ttlMs;

    if (persistent) {
      const payload = await compress(json);

      if (json.length > 20 * 1024 * 1024 || payload.length > 800_000) {
        throw new Error(`FMP ${endpoint} response is too large to cache.`);
      }

      // Persist successfully before returning data to the calculators.
      await ref.set({
        schemaVersion: 1,
        endpoint,
        params,
        fetchedAt,
        expiresAt,
        payload,
      });
    }

    this.remember(id, value, expiresAt, json.length);

    return value;
  }

  private remember(id: string, value: unknown, expiresAt: number, bytes: number): void {
    const previous = this.memory.get(id);

    if (previous) {
      this.memoryBytes -= previous.bytes;
      this.memory.delete(id);
    }

    if (bytes > MAX_MEMORY_BYTES) {
      return;
    }

    while (this.memory.size >= 100 || this.memoryBytes + bytes > MAX_MEMORY_BYTES) {
      const oldest = this.memory.keys().next().value;

      if (oldest === undefined) {
        break;
      }

      this.memoryBytes -= this.memory.get(oldest)!.bytes;
      this.memory.delete(oldest);
    }

    this.memory.set(id, {
      value,
      expiresAt,
      bytes,
    });

    this.memoryBytes += bytes;
  }
}
