import {Module} from '@nestjs/common';
import {PreparedStockRepository} from '../intelligence/repositories/prepared-stock.repository';
import {SecCacheService} from './sec-cache.service';
import {SecIngestionService} from './sec-ingestion.service';
import {SecResearchController} from './sec-research.controller';
import {SecResearchRepository} from './sec-research.repository';
import {SecResearchService} from './sec-research.service';

@Module({
  controllers: [SecResearchController],
  providers: [
    PreparedStockRepository,
    SecCacheService,
    SecIngestionService,
    SecResearchRepository,
    SecResearchService,
  ],
  exports: [SecResearchService, SecResearchRepository],
})
export class SecResearchModule {}