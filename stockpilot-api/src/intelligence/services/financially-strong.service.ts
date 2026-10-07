import {Injectable} from '@nestjs/common';

import {ScreenerResultsRepository} from '../repositories/screener-results.repository';

@Injectable()
export class FinanciallyStrongService {
  constructor(private readonly repository: ScreenerResultsRepository) {}

  async getFinanciallyStrong(page = 0, limit = 5) {
    return this.repository.getResults('financially-strong', page, limit);
  }
}
