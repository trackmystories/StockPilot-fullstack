import type {StockTape} from '../types/tape';

export interface TapeRepository {
  getTape(symbol: string): Promise<StockTape>;
}
