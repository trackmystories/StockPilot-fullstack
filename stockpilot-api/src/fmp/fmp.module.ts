import {Module} from '@nestjs/common';
import {FmpAccessService} from './clients/fmp-access.service';

import {FirebaseModule} from '../firebase/firebase.module';

import {FmpResponseCacheService} from './clients/fmp-response-cache.service';
import {FmpHttpService} from './clients/fmp-http.service';
import {FmpRateLimiterService} from './clients/fmp-rate-limiter.service';

import {FmpCompanyProfileService} from './services/fmp-company-profile.service';
import {FmpFinancialService} from './services/fmp-financial.service';
import {FmpQuoteService} from './services/fmp-quote.service';
import {FmpRiskDataService} from './services/fmp-risk-data.service';
import {FmpStockScreenerService} from './services/fmp-stock-screener.service';
import {FmpStockSearchService} from './services/fmp-stock-search.service';
import {FmpTapeService} from './services/fmp-tape.service';
import {FmpThesisDataService} from './services/fmp-thesis-data.service';
import {FmpIntelligenceDataService} from './services/fmp-intelligence-data.service';

@Module({
  imports: [FirebaseModule],

  providers: [
    FmpAccessService,
    FmpResponseCacheService,
    FmpRateLimiterService,
    FmpHttpService,
    FmpCompanyProfileService,
    FmpFinancialService,
    FmpQuoteService,
    FmpRiskDataService,
    FmpStockScreenerService,
    FmpStockSearchService,
    FmpTapeService,
    FmpThesisDataService,
    FmpIntelligenceDataService,
  ],

  exports: [
    FmpHttpService,
    FmpCompanyProfileService,
    FmpFinancialService,
    FmpQuoteService,
    FmpRiskDataService,
    FmpStockScreenerService,
    FmpStockSearchService,
    FmpTapeService,
    FmpThesisDataService,
    FmpIntelligenceDataService,
  ],
})
export class FmpModule {}
