import {calculateWeightedScore, confidenceFromCoverage, scoreMetric, type Threshold} from '../scoring';
import type {StockIntelligenceMetrics} from '../types';
import type {IntelligenceCalculatorResult} from './calculator.type';
export type ListMetric = {key: keyof StockIntelligenceMetrics; weight: number; thresholds: Threshold[]};
export const growthCurve: Threshold[] = [
  {value: -30, score: 1},
  {value: 0, score: 3},
  {value: 10, score: 6},
  {value: 25, score: 8},
  {value: 50, score: 10},
];
export const marginCurve: Threshold[] = [
  {value: -20, score: 1},
  {value: 0, score: 3},
  {value: 10, score: 6},
  {value: 20, score: 8.5},
  {value: 35, score: 10},
];
export const consistencyCurve: Threshold[] = [
  {value: 0, score: 1},
  {value: 50, score: 4},
  {value: 75, score: 7},
  {value: 100, score: 10},
];
export function scoreList(
  metrics: StockIntelligenceMetrics,
  definitions: ListMetric[],
  gates: [boolean, string][],
): IntelligenceCalculatorResult {
  const result = calculateWeightedScore(
    definitions.map(({key, weight, thresholds}) => ({
      name: String(key),
      rawValue: typeof metrics[key] === 'number' ? (metrics[key] as number) : null,
      score: scoreMetric(metrics, key, thresholds),
      weight,
    })),
  );
  const reasons = gates.filter(([passes]) => !passes).map(([, reason]) => reason);
  if (result.score === null || result.coverage < 1) reasons.push('incomplete_component_evidence');
  return {
    score: (result.score ?? 0) * 10,
    coverage: result.coverage * 100,
    confidence: confidenceFromCoverage(result.coverage),
    eligible: reasons.length === 0,
    reasons,
    components: result.components,
  };
}