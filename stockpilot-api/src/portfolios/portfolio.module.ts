import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { StockFilterModule } from '../stock-filter/stock-filter.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioMarketService } from './portfolio-market.service';
import { PortfolioFxService } from './portfolio-fx.service';
import { PortfolioRepository } from './portfolio.repository';
import { PortfolioService } from './portfolio.service';
import { PortfolioSnapshotsJob } from './portfolio-snapshots.job';

@Module({
  imports: [AuthModule, FirebaseModule, StockFilterModule],
  controllers: [PortfolioController],
  providers: [PortfolioFxService, PortfolioRepository, PortfolioMarketService, PortfolioService, PortfolioSnapshotsJob],
})
export class PortfolioModule {
}
