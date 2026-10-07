import type {IntelligenceCalculatorResult} from '../calculators/calculator.type';
export type CalculatedScreenerResult = IntelligenceCalculatorResult & {symbol: string; score: number; coverage: number};
export type RankedScreenerResult = CalculatedScreenerResult & {rank: number};
export type ScreenerRunStatus = 'building' | 'completed' | 'failed';
