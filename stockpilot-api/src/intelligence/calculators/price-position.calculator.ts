import type {MomentumData} from './calculator.type';

export type PricePositionResult = {
  nearLowScore: number;
  nearHighScore: number;
  coverage: number;

  positionInRange: number | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const calculatePricePosition = (momentum: MomentumData | null): PricePositionResult => {
  if (!momentum || momentum.price === null || momentum.yearHigh === null || momentum.yearLow === null) {
    return {
      nearLowScore: 0,
      nearHighScore: 0,
      coverage: 0,
      positionInRange: null,
    };
  }

  const range = momentum.yearHigh - momentum.yearLow;

  if (range <= 0) {
    return {
      nearLowScore: 0,
      nearHighScore: 0,
      coverage: 0,
      positionInRange: null,
    };
  }

  const position = clamp((momentum.price - momentum.yearLow) / range, 0, 1);

  return {
    /*
     * At the 52W low:
     * nearLowScore = 100
     *
     * At the 52W high:
     * nearHighScore = 100
     */
    nearLowScore: Math.round((1 - position) * 100),

    nearHighScore: Math.round(position * 100),

    coverage: 100,

    positionInRange: position,
  };
};
