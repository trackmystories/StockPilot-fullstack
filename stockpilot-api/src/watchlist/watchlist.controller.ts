import {Body, Controller, Delete, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards} from '@nestjs/common';
import type {Request} from 'express';

import type {AuthenticatedUser} from '../auth/auth-user.type';
import {FirebaseAuthGuard} from '../auth/firebase-auth.guard';
import {WatchlistService} from './watchlist.service';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

type AddTickerBody = {
  ticker?: string;
};

@Controller('api/watchlist')
@UseGuards(FirebaseAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  getWatchlist(@Req() request: AuthenticatedRequest) {
    return this.watchlistService.getTickers(this.getUserId(request));
  }

  @Get('stocks')
  getWatchlistStocks(
    @Req() request: AuthenticatedRequest,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.watchlistService.getStocks(this.getUserId(request), Number(offset ?? 0), Number(limit ?? 5));
  }

  @Post()
  addToWatchlist(@Req() request: AuthenticatedRequest, @Body() body: AddTickerBody) {
    return this.watchlistService.addTicker(this.getUserId(request), body.ticker ?? '');
  }

  @Delete(':ticker')
  removeFromWatchlist(@Req() request: AuthenticatedRequest, @Param('ticker') ticker: string) {
    return this.watchlistService.removeTicker(this.getUserId(request), ticker);
  }

  private getUserId(request: AuthenticatedRequest) {
    const userId = request.user?.uid;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return userId;
  }
}
