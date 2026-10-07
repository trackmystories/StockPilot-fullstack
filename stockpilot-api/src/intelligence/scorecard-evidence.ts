import type {ScoreResult, StockIntelligence} from './types';

export function enforceScorecardEvidence(card: StockIntelligence): StockIntelligence {
  
  const scores = Object.fromEntries(
    Object.entries(card.scores).map(([key, source]) => {
      const reasons = [...(source.reasons ?? [])];
      const supported =
        Number.isFinite(source.coverage) &&
        source.coverage >= 0.5 &&
        Object.values(source.components ?? {}).filter(
          (component) =>
            component.score !== null &&
            Number.isFinite(component.score) &&
            (component.coverage ?? 1) > 0,
        ).length >= Math.min(2, Object.keys(source.components ?? {}).length);
      if (!supported) reasons.push('insufficient_component_evidence');
      else if (source.coverage < 1) reasons.push('partial_evidence_score');
      if (key === 'operatingLeverage') {
        if (
          card.metrics.operatingIncomeTtm == null ||
          !Number.isFinite(card.metrics.operatingIncomeTtm)
        )
          reasons.push('operating_income_required');
        else if (card.metrics.operatingIncomeTtm <= 0)
          reasons.push('positive_operating_income_required');
        if (
          card.metrics.incrementalOperatingMargin == null ||
          !Number.isFinite(card.metrics.incrementalOperatingMargin)
        )
          reasons.push('incremental_operating_margin_required');
        else if (card.metrics.incrementalOperatingMargin <= 0)
          reasons.push('positive_incremental_operating_margin_required');
      }
      const blocked =
        source.eligible === false ||
        !supported ||
        reasons.some((reason) =>
          [
            'positive_operating_income_required',
            'positive_incremental_operating_margin_required',
            'operating_income_required',
            'incremental_operating_margin_required',
            'stale_or_missing_source_dates',
            'insufficient_core_evidence',
          ].includes(reason),
        );
      const score =
        !blocked && typeof source.score === 'number' && Number.isFinite(source.score)
          ? source.score
          : null;
      return [
        key,
        {
          ...source,
          components: {...source.components},
          score,
          eligible: score !== null && source.eligible !== false,
          confidence: supported ? source.confidence : 'low',
          reasons: [...new Set(reasons)],
        } satisfies ScoreResult,
      ];
    }),
  ) as StockIntelligence['scores'];
  const category = card.categories?.strongBalanceSheet;
  return {
    ...card,
    evidencePolicyVersion: 4,
    scores,
    categories: category
      ? {
          ...card.categories,
          strongBalanceSheet: {
            ...category,
            score:
              category.coverage === 1 &&
              category.metrics.every(
                (metric) => metric.score !== null && Number.isFinite(metric.score),
              )
                ? category.score
                : null,
          },
        }
      : card.categories,
  };
}