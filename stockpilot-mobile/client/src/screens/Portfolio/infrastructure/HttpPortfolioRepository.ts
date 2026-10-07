import { authenticatedRequest } from '../../Auth/infrastructure/authenticatedRequest';
import { ApiError } from '../../Auth/infrastructure/http';
import type { CreatePortfolioInput, PortfolioCurrency, PortfolioDetail, PortfolioListResponse, PortfolioLedger, PortfolioMarketStock, PortfolioMeta, PortfolioTransaction, TransactionInput, UpdatePortfolioInput } from '../domain/portfolio';

const ROOT = '/api/portfolios';
const pathId = (id: string) => encodeURIComponent(id);

function pause(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new Error('Request cancelled.'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, 1500);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

async function readReady<T>(path: string, signal?: AbortSignal): Promise<T> {
  const deadline = Date.now() + 180_000;
  for (; ;) {
    if (signal?.aborted) throw new Error('Request cancelled.');
    try {
      return await authenticatedRequest<T>(path, { signal });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 503 || signal?.aborted || Date.now() >= deadline) throw error;
      await pause(signal);
    }
  }
}

const write = <T>(path: string, method: 'POST' | 'PATCH', body: unknown) =>
  authenticatedRequest<T>(path, { method, body: JSON.stringify(body) });

export class HttpPortfolioRepository {
  list(includeArchived = false, signal?: AbortSignal) {
    return readReady<PortfolioListResponse>(`${ROOT}?includeArchived=${includeArchived}`, signal);
  }

  detail(id: string, signal?: AbortSignal) {
    return readReady<PortfolioDetail>(`${ROOT}/${pathId(id)}`, signal);
  }

  ledger(id: string, signal?: AbortSignal) {
    return readReady<{ portfolio: PortfolioMeta; ledger: PortfolioLedger; }>(`${ROOT}/${pathId(id)}/ledger`, signal);
  }

  settings(id: string, signal?: AbortSignal) {
    return readReady<PortfolioMeta>(`${ROOT}/${pathId(id)}/settings`, signal);
  }

  create(input: CreatePortfolioInput) {
    // Existing API requires kind. It is not a frontend choice; no stored portfolio is converted.
    return write<PortfolioMeta>(ROOT, 'POST', { ...input, kind: 'real' });
  }

  update(id: string, input: UpdatePortfolioInput) {
    return write<PortfolioMeta>(`${ROOT}/${pathId(id)}`, 'PATCH', input);
  }

  delete(id: string) {
    return authenticatedRequest<{ success: true; id: string; }>(`${ROOT}/${pathId(id)}`, { method: 'DELETE' });
  }

  async resolveInstrument(symbol: string, currency: PortfolioCurrency | null, signal?: AbortSignal, exchange?: string | null) {
    const result = await readReady<{ runId: string | null; items: PortfolioMarketStock[]; }>(
      `${ROOT}/instruments?q=${encodeURIComponent(symbol)}${currency ? `&currency=${currency}` : ''}`,
      signal,
    );
    const candidates = result.items.filter((item) => item.instrument.symbol.toUpperCase() === symbol.trim().toUpperCase() && (!currency || item.instrument.currency === currency));
    const matchingExchange = exchange ? candidates.filter((item) => item.instrument.exchange?.toUpperCase() === exchange.toUpperCase()) : [];
    const matches = matchingExchange.length ? matchingExchange : candidates;
    if (matches.length !== 1) throw new Error(matches.length ? 'Choose the exact stock listing from search.' : `${symbol} has no supported saved USD/EUR listing available for portfolios.`);
    return matches[0].instrument;
  }

  transaction(id: string, input: TransactionInput) {
    return write<{ success: boolean; portfolio: PortfolioMeta; }>(
      `${ROOT}/${pathId(id)}/transactions`, 'POST', input,
    );
  }

  voidTransaction(id: string, transactionId: string) {
    return write<{ success: boolean; portfolio: PortfolioMeta; }>(
      `${ROOT}/${pathId(id)}/transactions/${pathId(transactionId)}/void`, 'POST', {},
    );
  }

  activity(id: string, before: number | null, signal?: AbortSignal) {
    return readReady<{ items: PortfolioTransaction[]; nextCursor: number | null; }>(
      `${ROOT}/${pathId(id)}/activity${before === null ? '' : `?before=${before}`}`, signal,
    );
  }
}

export const portfolioRepository = new HttpPortfolioRepository();
