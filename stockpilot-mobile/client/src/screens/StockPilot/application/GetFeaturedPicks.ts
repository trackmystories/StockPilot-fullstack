import type {SelectStock} from '../types/stockPilot';

import type {HttpFeaturedPicksRepository} from '../infrastructure/HttpFeaturedPicksRepository';

export class GetFeaturedPicks {
  constructor(private readonly repository: HttpFeaturedPicksRepository) {}

  async execute(token: string): Promise<SelectStock[]> {
    return this.repository.getStocks(token);
  }
}
