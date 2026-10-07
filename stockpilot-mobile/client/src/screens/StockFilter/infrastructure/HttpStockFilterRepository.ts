import {authenticatedRequest} from '../../Auth/infrastructure/authenticatedRequest';
import type {FilterLoading, FilterOptions, FilterQuery, FilterResults} from '../domain/stockFilter';
function delay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new Error('Request cancelled.'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 1500);
    if (signal.aborted)
      abort(); else signal.addEventListener('abort', abort, {once: true});
  });
}
export class HttpStockFilterRepository {
  private async waitForReady<T extends {status: 'ready';}>(request: () => Promise<T | FilterLoading>, signal: AbortSignal): Promise<T> {
    const deadline = Date.now() + 120000;
    while (!signal.aborted) {
      const response = await request();
      if (response.status === 'ready')
        return response;
      if (Date.now() >= deadline)
        throw new Error('The saved stock index is still loading. Please retry shortly; no FMP refresh is required.');
      await delay(signal);
    }
    throw new Error('Request cancelled.');
  }
  options(signal: AbortSignal): Promise<FilterOptions> {
    return this.waitForReady(() => authenticatedRequest<FilterOptions | FilterLoading>('/api/stock-filter/options', {signal}), signal);
  }
  query(query: FilterQuery, signal: AbortSignal): Promise<FilterResults> {
    return this.waitForReady(() => authenticatedRequest<FilterResults | FilterLoading>('/api/stock-filter/query', {
      method: 'POST',
      body: JSON.stringify(query),
      signal
    }), signal);
  }
}
export const stockFilterRepository = new HttpStockFilterRepository();