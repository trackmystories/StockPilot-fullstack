import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {IntelligenceModule} from '../intelligence/intelligence.module';
import {MobileModule} from '../mobile/mobile.module';
import {StocksController} from './stocks.controller';

@Module({
  imports: [AuthModule, IntelligenceModule, MobileModule],
  controllers: [StocksController],
})
export class StocksModule {}
