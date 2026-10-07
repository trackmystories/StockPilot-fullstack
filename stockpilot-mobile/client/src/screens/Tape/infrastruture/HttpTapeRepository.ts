import type {TapeRepository} from '../data/tapeRepository';
import type {StockTape} from '../types/tape';
import {requestJson} from '../../Auth/infrastructure/http';

export class HttpTapeRepository implements TapeRepository {
  getTape(symbol: string): Promise<StockTape> {
    const normalizedSymbol = symbol.trim().toUpperCase();

    return requestJson<StockTape>(`/api/stocks/${encodeURIComponent(normalizedSymbol)}/tape`);
  }
}
