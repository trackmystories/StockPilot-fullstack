import {Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, Req, UseGuards} from '@nestjs/common';
import {IsString} from 'class-validator';

import {FirebaseAuthGuard} from '../auth/firebase-auth.guard';
import type {AuthenticatedRequest} from '../auth/firebase-auth.guard';
import {MarketService} from './market.service';
import {NewsService} from './news.service';
import {NotificationsService} from './notifications.service';
import {WatchlistService} from './watchlist.service';

class StockDto {
  @IsString()
  ticker!: string;
}

class DeviceDto {
  @IsString()
  token!: string;
}

@Controller('api')
export class MobileController {
  constructor(
    private readonly news: NewsService,
    private readonly watchlist: WatchlistService,
    private readonly notifications: NotificationsService,
    private readonly market: MarketService,
  ) {}

  @Get('news')
  newsList(@Query('cursor') cursor?: string) {
    return this.news.list(cursor);
  }

  @Get('news/:id')
  article(@Param('id') id: string) {
    return this.news.get(id);
  }

  @Get('watchlist')
  @UseGuards(FirebaseAuthGuard)
  watchlistList(@Req() req: AuthenticatedRequest) {
    return this.watchlist.list(req.user.uid);
  }

  @Post('watchlist')
  @UseGuards(FirebaseAuthGuard)
  watchlistAdd(@Req() req: AuthenticatedRequest, @Body() dto: StockDto) {
    return this.watchlist.add(req.user.uid, dto.ticker);
  }

  @Delete('watchlist/:ticker')
  @UseGuards(FirebaseAuthGuard)
  watchlistRemove(@Req() req: AuthenticatedRequest, @Param('ticker') ticker: string) {
    return this.watchlist.remove(req.user.uid, ticker);
  }

  @Get('notifications')
  @UseGuards(FirebaseAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  inbox(@Req() req: AuthenticatedRequest, @Query('cursor') cursor?: string) {
    return this.notifications.list(req.user.uid, cursor);
  }

  @Patch('notifications/read-all')
  @UseGuards(FirebaseAuthGuard)
  readAll(@Req() req: AuthenticatedRequest) {
    return this.notifications.readAll(req.user.uid);
  }

  @Patch('notifications/:id/read')
  @UseGuards(FirebaseAuthGuard)
  read(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notifications.read(req.user.uid, id);
  }

  @Put('notifications/devices/current')
  @UseGuards(FirebaseAuthGuard)
  register(@Req() req: AuthenticatedRequest, @Body() dto: DeviceDto) {
    return this.notifications.device(req.user.uid, dto.token, true);
  }

  @Delete('notifications/devices/current')
  @UseGuards(FirebaseAuthGuard)
  unregister(@Req() req: AuthenticatedRequest, @Body() dto: DeviceDto) {
    return this.notifications.device(req.user.uid, dto.token, false);
  }

  @Get('stock-search')
  search(@Query('q') query = '') {
    return this.market.search(query);
  }

  @Get('company-profile/:symbol')
  profile(@Param('symbol') symbol: string) {
    return this.market.profile(symbol);
  }

  @Get('financials/:symbol')
  financials(@Param('symbol') symbol: string) {
    return this.market.financials(symbol);
  }

  @Get('stocks/:symbol/earnings')
  @UseGuards(FirebaseAuthGuard)
  earnings(@Param('symbol') symbol: string) {
    return this.market.earnings(symbol);
  }

  @Get('stocks/:symbol/chart')
  @UseGuards(FirebaseAuthGuard)
  chart(@Param('symbol') symbol: string, @Query('range') range = '1D') {
    return this.market.chart(symbol, range);
  }
}
