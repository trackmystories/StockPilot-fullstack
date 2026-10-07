import {AsyncLocalStorage} from 'node:async_hooks';
import {Injectable} from '@nestjs/common';
import {getStorage} from 'firebase-admin/storage';
import {setTimeout as delay} from 'node:timers/promises';
import {SecLocalCache} from './sec-local-cache';
import {hash} from './sec-research.types';

type CachedSource = {
  rawPath: string;
  sha256: string;
  checkedAt: number;
  etag: string | null;
  lastModified: string | null;
};
export class SecAccessError extends Error {}

@Injectable()
export class SecCacheService {
  private readonly cacheOnly = new AsyncLocalStorage<boolean>();

  useCachedSources<T>(task: () => Promise<T>): Promise<T> {
    return this.cacheOnly.run(true, task);
  }

  private nextRequestAt = 0;
  private readonly local = new SecLocalCache();
  private readonly pending = new Map<string, Promise<CachedSource & {bytes: Buffer}>>();
  readonly metrics = {secRequests: 0, secBytes: 0, cacheHits: 0, storageReads: 0, retries: 0};

  async reserveRequest(): Promise<void> {
    const start = Math.max(Date.now(), this.nextRequestAt);
    this.nextRequestAt = start + 500;
    await delay(Math.max(0, start - Date.now()));
  }

  assertConfigured(): void {
    if (!process.env.SEC_USER_AGENT?.includes('@')) {
      throw new Error('Set SEC_USER_AGENT to your application name and contact email.');
    }
    if (!process.env.FIREBASE_STORAGE_BUCKET) {
      throw new Error('Set FIREBASE_STORAGE_BUCKET for cached SEC source documents.');
    }
  }

  async readBytes(path: string): Promise<Buffer | null> {
    // HTTP metadata must be checked remotely across processes; immutable sources
    // and versioned extraction objects can be reused from the working cache.
    const local = path.startsWith('sec/http/') ? null : await this.local.read(path);
    if (local) {
      this.metrics.cacheHits++;
      return local;
    }
    try {
      this.metrics.storageReads++;
      const [bytes] = await getStorage()
        .bucket(process.env.FIREBASE_STORAGE_BUCKET)
        .file(path)
        .download();
      if (!path.startsWith('sec/http/')) await this.local.write(path, bytes);
      return bytes;
    } catch (error) {
      if (Number((error as {code?: number}).code) === 404) return null;
      throw error;
    }
  }

  async writeBytes(path: string, bytes: Buffer): Promise<void> {
    await getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET).file(path).save(bytes, {
      resumable: false,
      gzip: true,
      contentType: 'application/octet-stream',
    });
    if (!path.startsWith('sec/http/')) await this.local.write(path, bytes);
  }

  async readJson<T>(path: string): Promise<T | null> {
    const bytes = await this.readBytes(path);
    return bytes ? (JSON.parse(bytes.toString('utf8')) as T) : null;
  }

  async writeJson(path: string, value: unknown): Promise<void> {
    await this.writeBytes(path, Buffer.from(JSON.stringify(value)));
  }

  get(url: string, ttlMs: number, immutable = false): Promise<CachedSource & {bytes: Buffer}> {
    const key = `${url}:${ttlMs}:${immutable}:${!!this.cacheOnly.getStore()}`;
    const existing = this.pending.get(key);
    if (existing) return existing;
    const request = this.fetchSource(url, ttlMs, immutable).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  private async fetchSource(
    url: string,
    ttlMs: number,
    immutable = false,
  ): Promise<CachedSource & {bytes: Buffer}> {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      parsed.port ||
      parsed.username ||
      parsed.password ||
      !['www.sec.gov', 'data.sec.gov'].includes(parsed.hostname)
    ) {
      throw new Error('Invalid SEC URL.');
    }
    const key = `sec/http/${hash(url)}.json`;
    const stored = await this.readJson<CachedSource>(key);
    const loadedBytes = stored ? await this.readBytes(stored.rawPath) : null;
    const cachedBytes =
      stored && loadedBytes && hash(loadedBytes) === stored.sha256 ? loadedBytes : null;
    if (
      stored &&
      cachedBytes &&
      hash(cachedBytes) === stored.sha256 &&
      (this.cacheOnly.getStore() || immutable || Date.now() - stored.checkedAt < ttlMs)
    ) {
      this.metrics.cacheHits++;
      return {...stored, bytes: cachedBytes};
    }
    if (this.cacheOnly.getStore()) throw new Error(`Source not cached; salvage skipped: ${url}`);
    for (let attempt = 0; attempt < 4; attempt++) {
      await this.reserveRequest();
      try {
        const headers: Record<string, string> = {
          'User-Agent': process.env.SEC_USER_AGENT ?? '',
          Accept: 'application/json,text/html,text/plain,*/*',
        };
        if (stored && cachedBytes) {
          if (stored.etag) headers['If-None-Match'] = stored.etag;
          if (stored.lastModified) headers['If-Modified-Since'] = stored.lastModified;
        }
        this.metrics.secRequests++;
        const response = await fetch(url, {
          headers,
          redirect: 'error',
          signal: AbortSignal.timeout(45000),
        });
        if (response.status === 304 && stored && cachedBytes) {
          const updated = {...stored, checkedAt: Date.now()};
          await this.writeJson(key, updated);
          return {...updated, bytes: cachedBytes};
        }
        if (response.status === 403) {
          await response.body?.cancel();
          throw new SecAccessError('SEC denied access (403); check User-Agent and retry later.');
        }
        if (response.status === 429 || response.status >= 500) {
          const retry = Number(response.headers.get('retry-after'));
          await response.body?.cancel();
          if (attempt === 3)
            throw new SecAccessError(`SEC is unavailable (${response.status}); retry later.`);
          this.metrics.retries++;
          await delay(
            Math.min(
              60000,
              Math.max(1000 * 2 ** attempt, Number.isFinite(retry) ? retry * 1000 : 0),
            ),
          );
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`SEC HTTP ${response.status}: ${url}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Empty SEC response.');
        const chunks: Buffer[] = [];
        let size = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 32 * 1024 * 1024) {
            await reader.cancel();
            throw new Error(`SEC source exceeds 32 MiB: ${url}`);
          }
          chunks.push(Buffer.from(chunk.value));
        }
        const bytes = Buffer.concat(chunks);
        this.metrics.secBytes += bytes.length;
        if (!bytes.length) throw new Error(`Empty SEC document: ${url}`);
        if (parsed.pathname.endsWith('.json')) JSON.parse(bytes.toString('utf8'));
        if (
          /Your Request Originates from an Undeclared|Request Rate Threshold Exceeded/i.test(
            bytes.toString('utf8', 0, 8000),
          )
        ) {
          throw new SecAccessError('SEC returned an access-control page.');
        }
        const sha256 = hash(bytes);
        const entry: CachedSource = {
          rawPath: `sec/raw/${sha256}.bin`,
          sha256,
          checkedAt: Date.now(),
          etag: response.headers.get('etag'),
          lastModified: response.headers.get('last-modified'),
        };
        await this.writeBytes(entry.rawPath, bytes);
        await this.writeJson(key, entry);
        return {...entry, bytes};
      } catch (error) {
        const name = error instanceof Error ? error.name : '';
        const transient =
          name === 'TimeoutError' ||
          name === 'AbortError' ||
          (error instanceof TypeError && /fetch failed|terminated/i.test(error.message));
        if (!transient || attempt === 3) {
          if (transient)
            throw new Error(`SEC request failed after ${attempt + 1} attempts: ${url}`, {
              cause: error,
            });
          throw error;
        }
        this.metrics.retries++;
        await delay(1000 * 2 ** attempt);
      }
    }
    throw new Error('SEC request failed.');
  }
}