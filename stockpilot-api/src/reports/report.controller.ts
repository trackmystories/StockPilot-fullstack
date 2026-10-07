import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {timingSafeEqual} from 'node:crypto';
import {FirebaseAuthGuard} from '../auth/firebase-auth.guard';
import {ReportService} from './report.service';

@Controller('api/stocks')
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  @Post('reports/refresh')
  @HttpCode(202)
  refresh(@Headers('x-research-key') key?: string) {
    const expected = process.env.SEC_RESEARCH_KEY;
    if (
      !expected ||
      !key ||
      Buffer.byteLength(expected) !== Buffer.byteLength(key) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(key))
    ) {
      throw new UnauthorizedException('A valid research job key is required.');
    }
    return this.reports.start();
  }

  @Get('reports/status')
  status() {
    return this.reports.status();
  }

  @Get(':symbol/report')
  @UseGuards(FirebaseAuthGuard)
  report(@Param('symbol') symbol: string) {
    return this.reports.get(symbol);
  }
}