import type {MomentumData} from './calculator.type';
export type OversoldResult = {score: number; coverage: number};
const scoreRsi = (rsi: number | null): number | null => {
  if (rsi === null || !Number.isFinite(rsi) || rsi < 0 || rsi > 100) {
    return null;
  }
  if (rsi <= 20) return 100;
  if (rsi <= 25) return 90;
  if (rsi <= 30) return 80;
  if (rsi <= 35) return 65;
  if (rsi <= 40) return 50;
  if (rsi <= 50) return 30;
  return 10;
};
export const calculateOversold = (momentum: MomentumData | null): OversoldResult => {
  if (!momentum) {
    return {score: 0, coverage: 0};
  }
  const rsiScore = scoreRsi(momentum.rsi14);
  const position =
    momentum.price !== null &&
    momentum.yearHigh !== null &&
    momentum.yearLow !== null &&
    momentum.yearHigh > momentum.yearLow
      ? (momentum.price - momentum.yearLow) / (momentum.yearHigh - momentum.yearLow)
      : null;
  const rangeScore = position === null ? null : Math.round(Math.max(0, Math.min(100, (1 - position) * 100)));
  if (rsiScore === null && rangeScore === null) {
    return {score: 0, coverage: 0};
  }
  if (rsiScore === null) {
    return {score: rangeScore ?? 0, coverage: 40};
  }
  if (rangeScore === null) {
    return {score: rsiScore, coverage: 60};
  }
  return {score: Math.round(rsiScore * 0.6 + rangeScore * 0.4), coverage: 100};
};
