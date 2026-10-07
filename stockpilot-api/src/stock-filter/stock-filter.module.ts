import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {FirebaseModule} from '../firebase/firebase.module';
import {StockFilterController} from './stock-filter.controller';
import {StockFilterRepository} from './stock-filter.repository';
import {StockFilterService} from './stock-filter.service';
@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [StockFilterController],
  providers: [StockFilterRepository, StockFilterService],
  exports: [StockFilterService]
})
export class StockFilterModule {}
