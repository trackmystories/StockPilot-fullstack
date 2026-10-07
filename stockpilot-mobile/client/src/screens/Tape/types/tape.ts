export type TapeDirection = 'UP' | 'DOWN' | 'NEUTRAL';

export type TapePressure = {
  buy: number;
  sell: number;
  message: string;
};

export type TapePressureBar = {
  time: string;
  volume: number;
  direction: TapeDirection;
};

export type TapeActivityItem = {
  time: string;
  price: number;
  volume: number;
  direction: TapeDirection;
};

export type StockTape = {
  symbol: string;
  interval: string;
  pressure: TapePressure;
  pressureBars: TapePressureBar[];
  activity: TapeActivityItem[];
};
