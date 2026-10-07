import {Controller, Get, Headers, Param, Post, UnauthorizedException} from '@nestjs/common';
import {timingSafeEqual} from 'node:crypto';
import {SecResearchService} from './sec-research.service';

@Controller('api/stocks')
export class SecResearchController {
  constructor(private readonly research: SecResearchService) {}

  @Post('sec-research/refresh')
  refresh(@Headers('x-research-key') key?: string) {
    this.authorize(key);
    return this.research.refresh();
  }

  @Post('sec-research/salvage')
  salvage(@Headers('x-research-key') key?: string) {
    this.authorize(key);
    return this.research.salvage();
  }

  private authorize(key?: string): void {
    const expected = process.env.SEC_RESEARCH_KEY;
    if (
      !expected ||
      !key ||
      Buffer.byteLength(expected) !== Buffer.byteLength(key) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(key))
    ) {
      throw new UnauthorizedException('A valid research job key is required.');
    }
  }

  @Get('sec-research/status')
  status() {
    return this.research.status();
  }

  @Get(':symbol/research')
  getResearch(@Param('symbol') symbol: string) {
    return this.research.research(symbol);
  }
}
