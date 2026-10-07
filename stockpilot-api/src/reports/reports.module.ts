import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {PreparedStockRepository} from '../intelligence/repositories/prepared-stock.repository';
import {SecResearchModule} from '../sec-research/sec-research.module';
import {ReportController} from './report.controller';
import {ReportRepository} from './report.repository';
import {ReportService} from './report.service';

@Module({
  imports: [AuthModule, SecResearchModule],
  controllers: [ReportController],
  providers: [PreparedStockRepository, ReportRepository, ReportService],
})
export class ReportsModule {}