import {Body, Controller, Get, Header, HttpCode, Post, UseGuards} from '@nestjs/common';
import {FirebaseAuthGuard} from '../auth/firebase-auth.guard';
import {StockFilterQueryDto} from './stock-filter.dto';
import {StockFilterService} from './stock-filter.service';
@Controller('api/stock-filter')
@UseGuards(FirebaseAuthGuard)
export class StockFilterController {
  constructor(private readonly service: StockFilterService) {
  }
  @Get('options')
  @Header('Cache-Control', 'private, no-store')
  options() {
    return this.service.options();
  }
  @Post('query')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  query(@Body() query: StockFilterQueryDto) {
    return this.service.query(query);
  }
}