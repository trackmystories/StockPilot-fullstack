import {calculateWeightedScore, scoreByThresholds} from '../scoring';
import type {EstimatesData, IntelligenceCalculatorResult} from './calculator.type';
export type EstimatesRisingResult = IntelligenceCalculatorResult;
// Revision = change to the SAME fiscal-period forecast across two saved observations.
export function attachEstimateRevisions(
  current: EstimatesData | null,
  previous: EstimatesData | null,
): EstimatesData | null {
  if (!current) return null;
  const days =
    previous?.observedAt && current.observedAt
      ? (Date.parse(current.observedAt) - Date.parse(previous.observedAt)) / 86400000
      : null;
  const comparable =
    days !== null &&
    days >= 5 &&
    days <= 45 &&
    !!current.nextPeriod &&
    current.nextPeriod === previous?.nextPeriod &&
    typeof current.currency === 'string' &&
    current.currency.trim().length > 0 &&
    current.currency === previous?.currency;
  const revision = (latest: number | null, old: number | null | undefined): number | null =>
    comparable && latest !== null && old != null && old > 0 ? (latest / old - 1) * 100 : null;
  return {
    ...current,
    epsRevision: revision(current.nextEps, previous?.nextEps),
    revenueRevision: revision(current.nextRevenue, previous?.nextRevenue),
    revisionDays: comparable ? days : null,
  };
}
export function calculateEstimatesRising(data: EstimatesData | null): EstimatesRisingResult {
  const curve = [
    {value: -10, score: 1},
    {value: 0, score: 4},
    {value: 3, score: 7},
    {value: 7, score: 9},
    {value: 15, score: 10},
  ];
  const result = calculateWeightedScore([
    {
      name: 'epsRevision',
      rawValue: data?.epsRevision ?? null,
      score: scoreByThresholds(data?.epsRevision ?? null, curve),
      weight: 0.6,
    },
    {
      name: 'revenueRevision',
      rawValue: data?.revenueRevision ?? null,
      score: scoreByThresholds(data?.revenueRevision ?? null, curve),
      weight: 0.4,
    },
  ]);
  const reasons: string[] = [];
  if (!data?.currency?.trim()) reasons.push('estimate_currency_required');
  if (data?.revisionDays == null) reasons.push('comparable_estimate_snapshot_required');
  if ((data?.analystCount ?? 0) < 3) reasons.push('at_least_three_analysts_required');
  if ((data?.epsRevision ?? 0) <= 0 || (data?.revenueRevision ?? 0) < 0) reasons.push('positive_revision_required');
  if (result.score === null || result.coverage < 1) reasons.push('incomplete_component_evidence');
  return {
    score: (result.score ?? 0) * 10,
    coverage: result.coverage * 100,
    confidence:
      reasons.length || (data?.analystCount ?? 0) < 5
        ? 'low'
        : (data?.analystCount ?? 0) < 10 || !data?.currency
          ? 'medium'
          : result.confidence,
    eligible: reasons.length === 0,
    reasons,
    components: result.components,
  };
}