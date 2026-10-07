import {BadRequestException, Controller, Get, Param} from '@nestjs/common';
import {FmpTapeService} from '../fmp/services/fmp-tape.service';

@Controller('api/stocks')
export class TapeController {
  constructor(private readonly tapes: FmpTapeService) {}

  @Get(':symbol/tape')
  getTape(@Param('symbol') value: string) {
    const symbol = value.trim().toUpperCase();

    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) {
      throw new BadRequestException('Invalid stock symbol.');
    }

    return this.tapes.getStockTape(symbol);
  }
}
