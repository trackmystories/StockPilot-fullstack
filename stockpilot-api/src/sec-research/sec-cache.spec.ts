import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {SecCacheService} from './sec-cache.service';

test('immutable source reuse makes one request and preserves its content hash', async () => {
  process.env.SEC_USER_AGENT = 'StockPilot research research@example.com';
  const cache = new SecCacheService();
  const objects = new Map<string, Buffer>();
  cache.readBytes = async (key) => objects.get(key) ?? null;
  cache.writeBytes = async (key, data) => {
    objects.set(key, data);
  };
  let requests = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    requests++;
    return new Response('<p>Company disclosure</p>');
  };
  try {
    const first = await cache.get('https://www.sec.gov/Archives/example.htm', 0, true);
    const second = await cache.get('https://www.sec.gov/Archives/example.htm', 0, true);
    assert.equal(requests, 1);
    assert.equal(first.sha256, second.sha256);
    assert.deepEqual(first.bytes, second.bytes);
  } finally {
    globalThis.fetch = original;
  }
});

test('malformed JSON cannot become a successful cached response', async () => {
  process.env.SEC_USER_AGENT = 'StockPilot research research@example.com';
  const cache = new SecCacheService();
  const objects = new Map<string, Buffer>();
  cache.readBytes = async (key) => objects.get(key) ?? null;
  cache.writeBytes = async (key, data) => {
    objects.set(key, data);
  };
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>Access denied</html>');
  try {
    await assert.rejects(cache.get('https://data.sec.gov/submissions/CIK0000000001.json', 0));
    assert.equal(objects.size, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('external URLs are rejected before a network request', async () => {
  const cache = new SecCacheService();
  await assert.rejects(cache.get('https://example.com/filing', 0), /SEC URL/);
});

test('a corrupt stored body cannot be revalidated using its old ETag', async () => {
  process.env.SEC_USER_AGENT = 'StockPilot research research@example.com';
  const cache = new SecCacheService();
  const objects = new Map<string, Buffer>();
  cache.readBytes = async (key) => objects.get(key) ?? null;
  cache.writeBytes = async (key, data) => {
    objects.set(key, data);
  };
  const original = globalThis.fetch;
  let conditional: string | null = null;
  globalThis.fetch = async (_url, init) => {
    conditional = new Headers(init?.headers).get('if-none-match');
    return new Response('<p>Verified source</p>', {headers: {etag: 'original'}});
  };
  try {
    const first = await cache.get('https://www.sec.gov/Archives/test.htm', 0, true);
    objects.set(first.rawPath, Buffer.from('corrupted'));
    const second = await cache.get('https://www.sec.gov/Archives/test.htm', 0, true);
    assert.equal(conditional, null);
    assert.equal(second.bytes.toString(), '<p>Verified source</p>');
  } finally {
    globalThis.fetch = original;
  }
});