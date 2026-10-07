import {createHash} from 'node:crypto';
import {object, number, type Row} from './normalizers';
export class BusinessQuantError extends Error {
  constructor(message: string, readonly status = 502, readonly upstreamStatus?: number) { super(message); this.name = 'BusinessQuantError'; }
}
export type ClientDependencies = {
  apiKey: () => string | undefined;
  cache: <T>(endpoint: string, params: Record<string,string>, ttl: number, load: () => Promise<T>, persistent: boolean) => Promise<T>;
  run: (request: () => Promise<Response>) => Promise<Response>;
};
const PATHS = new Set(['universe', 'stocks/profile', 'statements', 'quotes', 'estimates', 'historic', 'screener', 'corporate_actions']);
export class BusinessQuantClient {
  constructor(private readonly dependencies: ClientDependencies) {}
  async request(path: string, params: Record<string,string>, ttl: number, body?: Row): Promise<unknown> {
    if (!PATHS.has(path)) throw new BusinessQuantError(`Unsupported Business Quant endpoint: ${path}.`, 400);
    const key = this.dependencies.apiKey()?.trim();
    if (!key) throw new BusinessQuantError('BUSINESS_QUANT_API_KEY is not configured.', 503);
    const account = createHash('sha256').update(key).digest('hex').slice(0,24);
    const cacheParams = {...params, ...(body ? {body: JSON.stringify(body)} : {})};
    return this.dependencies.cache(`business-quant:v1:${account}:${path}`, cacheParams, ttl, async () => {
      const query = new URLSearchParams(params);
      query.set('api_key', key);
      let response: Response;
      try {
        response = await this.dependencies.run(() => fetch(`https://data.businessquant.com/${path}?${query}`, {
          method: body ? 'POST' : 'GET',
          headers: {Accept:'application/json', ...(body ? {'Content-Type':'application/json'} : {})},
          ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(20_000), redirect:'error',
        }));
      } catch { throw new BusinessQuantError(`Business Quant ${path} is temporarily unavailable.`); }
      if (!response.ok) {
        const status = [401,402,403].includes(response.status) ? 503 : response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
        throw new BusinessQuantError(`Business Quant ${path} failed (HTTP ${response.status}).`, status, response.status);
      }
      let payload: unknown;
      try { payload = await response.json(); } catch { throw new BusinessQuantError(`Invalid JSON from Business Quant ${path}.`); }
      if (payload === null || typeof payload !== 'object' || object(payload).error) throw new BusinessQuantError(`Invalid Business Quant ${path} response.`);
      const envelope = object(payload);
      const flatArray = path === 'historic' || (path === 'quotes' && params.mode === 'snapshot');
      const flatProfile = path === 'stocks/profile';
      if (flatArray ? !Array.isArray(payload) : flatProfile ? typeof envelope.ticker !== 'string' :
        path === 'statements' ? !envelope.metadata || !envelope.data || Array.isArray(envelope.data) : !Array.isArray(envelope.data)) {
        throw new BusinessQuantError(`Unexpected Business Quant ${path} response shape.`);
      }
      return payload;
    }, ttl >= 300_000);
  }
  async optional(path: string, params: Record<string,string>, ttl: number): Promise<unknown | null> {
    try { return await this.request(path,params,ttl); }
    catch (error) { if (error instanceof BusinessQuantError && error.upstreamStatus === 404) return null; throw error; }
  }
  async pages(path: string, params: Record<string,string>, ttl: number, body?: Row): Promise<Row[]> {
    const rows: Row[] = [];
    let expectedPages: number | null = null;
    for (let page = 1; page <= 1000; page += 1) {
      const payload = object(await this.request(path,{...params,page:String(page),limit:'1000'},ttl,body));
      // Single-ticker prices normally use the envelope; multi-ticker responses are not used here.
      if (!Array.isArray(payload.data)) throw new BusinessQuantError(`Invalid Business Quant ${path} page.`);
      const metadata = object(payload.metadata);
      const pagination = Object.keys(object(metadata.pagination)).length ? object(metadata.pagination) : metadata;
      const count = number(pagination.total_pages);
      if (count === null || !Number.isSafeInteger(count) || count < 0) throw new BusinessQuantError(`Missing pagination from Business Quant ${path}.`);
      if (expectedPages !== null && count !== expectedPages) throw new BusinessQuantError(`Business Quant ${path} pagination changed; retry the request.`);
      expectedPages = count;
      const current = number(pagination.current_page ?? pagination.page);
      if (current !== null && current !== page) throw new BusinessQuantError(`Business Quant ${path} returned the wrong page.`);
      if (!payload.data.length && page < count) throw new BusinessQuantError(`Incomplete Business Quant ${path} response.`);
      rows.push(...payload.data.map(object));
      if (page >= count) return rows;
    }
    throw new BusinessQuantError(`Business Quant ${path} exceeded the pagination safety limit.`);
  }
}
