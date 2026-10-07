import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {FmpModule} from '../fmp/fmp.module';
import {IntelligenceModule} from '../intelligence/intelligence.module';

import {MobileController} from './mobile.controller';
import {TapeController} from './tape.controller';
import {MarketService} from './market.service';
import {NewsService} from './news.service';
import {NotificationsService} from './notifications.service';
import {WatchlistService} from './watchlist.service';
import {MarketIndicatorsController} from './market-indicators.controller';
import {MarketIndicatorsService} from './market-indicators.service';

@Module({
  imports: [AuthModule, FmpModule, IntelligenceModule],
  controllers: [MobileController, TapeController, MarketIndicatorsController],
  providers: [MarketService, NewsService, NotificationsService, WatchlistService, MarketIndicatorsService],
  exports: [MarketService],
})
export class MobileModule {}
