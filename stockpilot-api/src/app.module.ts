import {Module} from '@nestjs/common';
import {PortfolioModule} from './portfolios/portfolio.module';
import {StockFilterModule} from './stock-filter/stock-filter.module';
import {ReportsModule} from './reports/reports.module';
import {ConfigModule} from '@nestjs/config';
import {ScheduleModule} from '@nestjs/schedule';
import {AuthModule} from './auth/auth.module';
import {FirebaseModule} from './firebase/firebase.module';
import {FmpModule} from './fmp/fmp.module';
import {IntelligenceModule} from './intelligence/intelligence.module';
import {StocksModule} from './stocks/stocks.module';
import {MobileModule} from './mobile/mobile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    AuthModule,
    FmpModule,
    IntelligenceModule,
    StocksModule,
    MobileModule,
    ReportsModule,
    StockFilterModule,
    PortfolioModule,
  ],
})
export class AppModule {}
