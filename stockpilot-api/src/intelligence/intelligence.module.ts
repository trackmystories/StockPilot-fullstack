import {Module} from '@nestjs/common';
import {SecResearchModule} from '../sec-research/sec-research.module';

import {FmpModule} from '../fmp/fmp.module';

import {WeeklyIntelligenceJob} from './jobs/weekly-intelligence.job';

import {ScreenerRankingService} from './pipeline/screener-ranking.service';

import {StockIntelligenceRunnerService} from './pipeline/stock-intelligence-runner.service';

import {PreparedStockRepository} from './repositories/prepared-stock.repository';

import {ScreenerResultsRepository} from './repositories/screener-results.repository';

import {FinanciallyStrongService} from './services/financially-strong.service';

@Module({
  imports: [FmpModule, SecResearchModule],

  providers: [
    ScreenerResultsRepository,

    PreparedStockRepository,

    ScreenerRankingService,

    StockIntelligenceRunnerService,

    WeeklyIntelligenceJob,

    FinanciallyStrongService,
  ],

  exports: [
    ScreenerResultsRepository,
    PreparedStockRepository,
    WeeklyIntelligenceJob,
    FinanciallyStrongService,
  ],
})
export class IntelligenceModule {}