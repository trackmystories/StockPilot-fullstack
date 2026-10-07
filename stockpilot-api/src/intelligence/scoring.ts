import type {
  ScoreComponent,
  ScoreConfidence,
  ScoreDirection,
  ScoreResult,
  StockIntelligenceMetrics,
} from './types';

export type Threshold = {value: number; score: number};

export type WeightedInput = {
  name: string;
  rawValue: number | null;
  score: number | null;
  weight: number;
  coverage?: number;
  sourceConfidence?: ScoreConfidence;
};
const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export function confidenceFromCoverage(coverage: number): ScoreConfidence {
  return coverage >= 0.9 ? 'high' : coverage >= 0.75 ? 'medium' : 'low';
}

export function scoreByThresholds(value: number | null, thresholds: Threshold[]): number | null {
  if (value === null || !Number.isFinite(value) || !thresholds.length) return null;
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  if (value <= sorted[0].value) return clamp(sorted[0].score, 1, 10);
  for (let i = 1; i < sorted.length; i++) {
    if (value <= sorted[i].value) {
      const a = sorted[i - 1];
      const b = sorted[i];
      return Number(
        clamp(
          a.score + ((value - a.value) / (b.value - a.value)) * (b.score - a.score),
          1,
          10,
        ).toFixed(2),
      );
    }
  }
  return clamp(sorted[sorted.length - 1].score, 1, 10);
}
export function calculateWeightedScore(
  inputs: WeightedInput[],
  direction: ScoreDirection = 'higher_is_better',
): ScoreResult {
  const components: Record<string, ScoreComponent> = {};
  let possible = 0;
  let available = 0;
  let total = 0;
  for (const input of inputs) {
    if (!Number.isFinite(input.weight) || input.weight <= 0) continue;
    const score =
      input.score !== null && Number.isFinite(input.score) ? clamp(input.score, 1, 10) : null;
    const coverage =
      score === null ? 0 : clamp(Number.isFinite(input.coverage ?? 1) ? (input.coverage ?? 1) : 0);
    possible += input.weight;
    available += input.weight * coverage;
    total += (score ?? 0) * input.weight * coverage;
    components[input.name] = {
      score,
      rawValue: input.rawValue !== null && Number.isFinite(input.rawValue) ? input.rawValue : null,
      weight: input.weight,
      coverage,
    };
  }
  const coverage = possible > 0 ? available / possible : 0;
  const complete =
    possible > 0 &&
    Object.values(components).every(
      (component) => component.score !== null && component.coverage === 1,
    );
  const usableCount = Object.values(components).filter(
    (component) => component.score !== null && (component.coverage ?? 0) > 0,
  ).length;
  const eligible = coverage >= 0.5 && usableCount >= Math.min(2, Object.keys(components).length);
  let confidence = confidenceFromCoverage(coverage);
  const lowWeight = inputs.reduce(
    (total, input) =>
      total + (input.score !== null && input.sourceConfidence === 'low' ? input.weight : 0),
    0,
  );
  if (possible > 0 && lowWeight / possible >= 0.2) confidence = 'low';
  else if (
    confidence === 'high' &&
    inputs.some(
      (input) =>
        input.score !== null && input.sourceConfidence && input.sourceConfidence !== 'high',
    )
  )
    confidence = 'medium';
  return {
    score: eligible ? Number((total / available).toFixed(1)) : null,
    eligible,
    reasons: complete
      ? []
      : [eligible ? 'partial_evidence_score' : 'insufficient_component_evidence'],
    direction,
    coverage: Number(coverage.toFixed(4)),
    confidence: complete ? confidence : confidence === 'high' ? 'medium' : confidence,
    components,
  };
}
// Relative ranks supplement absolute economics; they never turn a loss into a cheap multiple.
export function scoreMetric(
  metrics: StockIntelligenceMetrics,
  key: keyof StockIntelligenceMetrics,
  thresholds: Threshold[],
): number | null {
  const value = metrics[key];
  if (
    ['pe', 'forwardPe', 'priceToSales', 'priceToBook', 'priceToFcf', 'evToEbitda'].includes(
      String(key),
    ) &&
    (typeof value !== 'number' || value <= 0)
  )
    return null;
  const absolute = scoreByThresholds(typeof value === 'number' ? value : null, thresholds);
  const peer = metrics.peers?.metrics[key];
  if (absolute === null || !peer || peer.count < 20) return absolute;
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const higher = sorted[sorted.length - 1].score >= sorted[0].score;
  const relative = 1 + 9 * (higher ? peer.percentile : 1 - peer.percentile);
  return Number((absolute * 0.75 + relative * 0.25).toFixed(2));
}
export function gateComposite(
  result: ScoreResult,
  sources: ScoreResult[],
  minimumScore = 4,
): ScoreResult {
  const enoughEvidence =
    result.score !== null &&
    Number.isFinite(result.score) &&
    result.coverage >= 0.5 &&
    sources.every(
      (source) =>
        source.score !== null &&
        Number.isFinite(source.score) &&
        source.coverage >= 0.5 &&
        source.eligible !== false,
    );
  const passes =
    enoughEvidence &&
    sources.every(
      (source) =>
        (source.direction === 'higher_is_riskier' ? 11 - source.score! : source.score!) >=
        minimumScore,
    );
  return {
    ...result,
    score: passes ? result.score : null,
    eligible: passes,
    confidence: enoughEvidence ? result.confidence : 'low',
    reasons: [
      ...new Set([
        ...(result.reasons ?? []),
        ...(!enoughEvidence
          ? ['insufficient_core_evidence']
          : passes
            ? []
            : ['core_factor_below_minimum']),
      ]),
    ],
  };
}