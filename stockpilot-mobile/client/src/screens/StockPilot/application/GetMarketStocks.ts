import type {HttpMarketStocksRepository} from '../infrastructure/HttpMarketStocksRepository';

export class GetMarketStocks {
  constructor(private readonly repository: HttpMarketStocksRepository) {}

  execute(listId: string, page = 0, limit = 5) {
    return this.repository.getStocks(listId, page, limit);
  }
}
