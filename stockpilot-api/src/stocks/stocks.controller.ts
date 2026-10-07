import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {timingSafeEqual} from 'node:crypto';
import {FirebaseAuthGuard} from '../auth/firebase-auth.guard';
import {WeeklyIntelligenceJob} from '../intelligence/jobs/weekly-intelligence.job';
import {ScreenerResultsRepository} from '../intelligence/repositories/screener-results.repository';
import {MarketService} from '../mobile/market.service';

@Controller('api/stocks')
export class StocksController {
  constructor(
    private readonly market: MarketService,
    private readonly weeklyIntelligenceJob: WeeklyIntelligenceJob,
    private readonly intelligenceRepository: ScreenerResultsRepository,
  ) {}

  @Get()
  @UseGuards(FirebaseAuthGuard)
  getCatalog() {
    return this.market.getCatalog();
  }

  @Get('featured')
  @UseGuards(FirebaseAuthGuard)
  getFeatured() {
    return this.market.getFeatured();
  }

  @Get('financially-strong')
  getFinanciallyStrong(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.market.getFinanciallyStrong(Number(page ?? 0), Number(limit ?? 5));
  }

  @Get('market/:screenerId')
  getMarketStocks(
    @Param('screenerId') screenerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.market.getMarketStocks(screenerId, Number(page ?? 0), Number(limit ?? 5));
  }

  /*
   * EXPENSIVE.
   *
   * Manual FMP refreshes require a server-side key so an accidental curl,
   * client bug or unauthenticated request cannot start a full-universe job.
   * The monthly cron calls the job directly and does not use this endpoint.
   */
  @Post('intelligence/refresh')
  async refreshIntelligence(@Headers('x-intelligence-key') key?: string) {
    this.authorizeIntelligenceJob(key);
    const result = await this.weeklyIntelligenceJob.refresh();

    return {
      success: true,
      ...result,
    };
  }

  /*
   * NO FMP CALLS.
   *
   * Salvage can publish a generation, so protect it with the same job key.
   */
  @Post('intelligence/salvage')
  async salvageIntelligence(@Headers('x-intelligence-key') key?: string) {
    this.authorizeIntelligenceJob(key);
    return this.weeklyIntelligenceJob.salvage();
  }

  @Get('intelligence/status')
  async intelligenceStatus() {
    return (await this.intelligenceRepository.getActiveState()) ?? {activeRun: null};
  }

  @Get('quotes')
  @UseGuards(FirebaseAuthGuard)
  getQuotes(@Query('symbols') symbols = '') {
    return this.market.getQuotes(
      symbols
        .split(',')
        .map((symbol) => symbol.trim())
        .filter(Boolean),
    );
  }

  @Get(':symbol/intelligence')
  getIntelligence(@Param('symbol') symbol: string) {
    return this.market.getIntelligence(symbol);
  }

  @Get(':symbol/quote')
  @UseGuards(FirebaseAuthGuard)
  getQuote(@Param('symbol') symbol: string) {
    return this.market.getQuote(symbol);
  }

  @Get(':symbol/risk')
  @UseGuards(FirebaseAuthGuard)
  getRisk(@Param('symbol') symbol: string) {
    return this.market.getRisk(symbol);
  }

  private authorizeIntelligenceJob(key?: string): void {
    const expected = process.env.INTELLIGENCE_REFRESH_KEY;

    if (
      !expected ||
      !key ||
      Buffer.byteLength(expected) !== Buffer.byteLength(key) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(key))
    ) {
      throw new UnauthorizedException('A valid intelligence job key is required.');
    }
  }
}