import {BadGatewayException, Injectable, NotFoundException} from '@nestjs/common';
import {FmpHttpService} from '../clients/fmp-http.service';

export type FmpIntradayBar = {
  date: string;
  open: number;
  low: number;
  high: number;
  close: number;
  volume: number;
};

export type TapeDirection = 'UP' | 'DOWN' | 'NEUTRAL';

export type TapeActivityItem = {
  time: string;
  price: number;
  volume: number;
  direction: TapeDirection;
};

export type TapePressureBar = {
  time: string;
  volume: number;
  direction: TapeDirection;
};

export type StockTape = {
  symbol: string;
  interval: string;

  pressure: {
    buy: number;
    sell: number;
    message: string;
  };

  pressureBars: TapePressureBar[];
  activity: TapeActivityItem[];
};

@Injectable()
export class FmpTapeService {
  constructor(private readonly http: FmpHttpService) {}

  async getStockTape(rawSymbol: string): Promise<StockTape> {
    const symbol = rawSymbol.trim().toUpperCase();

    const response = await this.http.get<unknown>('historical-chart/5min', {
      symbol,
    });

    if (!Array.isArray(response)) {
      throw new BadGatewayException('Invalid intraday response from the data provider.');
    }

    if (response.length === 0) {
      throw new NotFoundException(`Intraday data is currently unavailable for ${symbol}.`);
    }

    const bars = response.filter(this.isIntradayBar);

    if (!bars.length) {
      throw new BadGatewayException(`Invalid intraday bars returned for ${symbol}.`);
    }

    const recentBars = bars.slice(0, 24);
    const {buy, sell} = this.calculatePressure(recentBars);

    const activity = recentBars.slice(0, 5).map((bar) => ({
      time: this.getTime(bar.date),
      price: bar.close,
      volume: bar.volume,
      direction: this.getDirection(bar),
    }));

    const pressureBars = [...recentBars].reverse().map((bar) => ({
      time: this.getTime(bar.date),
      volume: bar.volume,
      direction: this.getDirection(bar),
    }));

    return {
      symbol,
      interval: '5min',
      pressure: {
        buy,
        sell,
        message: this.getPressureMessage(buy, sell),
      },
      pressureBars,
      activity,
    };
  }

  private calculatePressure(bars: FmpIntradayBar[]) {
    let buyVolume = 0;
    let sellVolume = 0;

    bars.forEach((bar) => {
      const direction = this.getDirection(bar);

      if (direction === 'UP') {
        buyVolume += bar.volume;
      }

      if (direction === 'DOWN') {
        sellVolume += bar.volume;
      }
    });

    const total = buyVolume + sellVolume;

    if (!total) {
      return {
        buy: 50,
        sell: 50,
      };
    }

    const buy = Math.round((buyVolume / total) * 100);

    return {
      buy,
      sell: 100 - buy,
    };
  }

  private getDirection(bar: FmpIntradayBar): TapeDirection {
    if (bar.close > bar.open) {
      return 'UP';
    }

    if (bar.close < bar.open) {
      return 'DOWN';
    }

    return 'NEUTRAL';
  }

  private getTime(date: string): string {
    const [, time = ''] = date.split(' ');

    return time.slice(0, 5);
  }

  private getPressureMessage(buy: number, sell: number): string {
    if (buy >= 65) {
      return 'Buyers are dominating short-term activity.';
    }

    if (sell >= 65) {
      return 'Sellers are dominating short-term activity.';
    }

    if (buy >= 55) {
      return 'Buying pressure is slightly stronger.';
    }

    if (sell >= 55) {
      return 'Selling pressure is slightly stronger.';
    }

    return 'Buying and selling pressure is relatively balanced.';
  }

  private isIntradayBar(value: unknown): value is FmpIntradayBar {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const bar = value as Record<string, unknown>;

    return (
      typeof bar.date === 'string' &&
      typeof bar.open === 'number' &&
      typeof bar.high === 'number' &&
      typeof bar.low === 'number' &&
      typeof bar.close === 'number' &&
      typeof bar.volume === 'number'
    );
  }
}
