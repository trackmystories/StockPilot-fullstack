import type {TapeRepository} from '../data/tapeRepository';

export async function getStockTape(repository: TapeRepository, symbol: string) {
  if (!symbol.trim()) {
    throw new Error('Stock symbol is required');
  }

  return repository.getTape(symbol.toUpperCase());
}
