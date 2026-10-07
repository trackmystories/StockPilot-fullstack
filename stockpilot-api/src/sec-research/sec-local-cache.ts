import {mkdir, readFile, readdir, rename, stat, unlink, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {hash} from './sec-research.types';

// A bounded working cache; Cloud Storage remains the durable source of truth.
export class SecLocalCache {
  private writes = 0;
  private pruning: Promise<void> | null = null;
  private directory(): string {
    return join(
      resolve(process.env.SEC_LOCAL_CACHE_DIR ?? '.cache/stockpilot-sec'),
      hash(process.env.FIREBASE_STORAGE_BUCKET ?? ''),
    );
  }
  async read(key: string): Promise<Buffer | null> {
    try {
      const bytes = await readFile(join(this.directory(), hash(key)));
      if (bytes.length < 64 || hash(bytes.subarray(64)) !== bytes.subarray(0, 64).toString())
        return null;
      return bytes.subarray(64);
    } catch {
      return null;
    }
  }
  async write(key: string, bytes: Buffer): Promise<void> {
    const directory = this.directory();
    const target = join(directory, hash(key));
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await mkdir(directory, {recursive: true});
      await writeFile(temporary, Buffer.concat([Buffer.from(hash(bytes)), bytes]));
      await rename(temporary, target);
      if (++this.writes % 20 === 0) {
        this.pruning ??= this.prune(directory).finally(() => {
          this.pruning = null;
        });
        await this.pruning;
      }
    } catch {
      // An unwritable local cache must not prevent durable publication.
      await unlink(temporary).catch(() => undefined);
    }
  }
  private async prune(directory: string): Promise<void> {
    const limit = 1024 * 1024 * 1024;
    const files = await Promise.all(
      (await readdir(directory))
        .filter((name) => /^[a-f0-9]{64}$/.test(name))
        .map(async (name) => {
          const path = join(directory, name);
          const info = await stat(path).catch(() => null);
          return {path, size: info?.size ?? 0, time: info?.mtimeMs ?? 0};
        }),
    );
    let size = files.reduce((sum, file) => sum + file.size, 0);
    for (const file of files.sort((a, b) => a.time - b.time)) {
      if (size <= limit) break;
      await unlink(file.path).catch(() => undefined);
      size -= file.size;
    }
  }
}