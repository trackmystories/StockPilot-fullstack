import {Module} from '@nestjs/common';

import {FirebaseAuthGuard} from '../auth/firebase-auth.guard';
import {FmpModule} from '../fmp/fmp.module';
import {IntelligenceModule} from '../intelligence/intelligence.module';

import {WatchlistController} from './watchlist.controller';
import {WatchlistService} from './watchlist.service';

@Module({
  imports: [FmpModule, IntelligenceModule],

  controllers: [WatchlistController],

  providers: [WatchlistService, FirebaseAuthGuard],

  exports: [WatchlistService],
})
export class WatchlistModule {}
