import {Controller, Get, Header, UseGuards} from '@nestjs/common';
import {FirebaseAuthGuard} from '../auth/firebase-auth.guard';
import {MarketIndicatorsService} from './market-indicators.service';
@Controller('api/market')
@UseGuards(FirebaseAuthGuard)
export class MarketIndicatorsController {
  constructor(private readonly indicators: MarketIndicatorsService) {}
  @Get('indicators')
  @Header('Cache-Control', 'no-store')
  getIndicators() {
    return this.indicators.getIndicators();
  }
}
