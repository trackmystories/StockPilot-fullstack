import {calculateWeightedScore, gateComposite, scoreByThresholds} from '../scoring';
import type {ScoreResult, StockIntelligenceMetrics} from '../types';

type Inputs = {metrics: StockIntelligenceMetrics; fundamentalMomentum: ScoreResult; financialHealth: ScoreResult};

export function calculateRecoveryScore({metrics, fundamentalMomentum, financialHealth}: Inputs): ScoreResult {
  const distanceFromHigh =
    metrics.price === null || metrics.yearHigh === null || metrics.yearHigh === 0
      ? null
      : ((metrics.price - metrics.yearHigh) / metrics.yearHigh) * 100;
  const depressedPrice = scoreByThresholds(distanceFromHigh, [
    {value: -80, score: 10},
    {value: -50, score: 9},
    {value: -30, score: 8},
    {value: -15, score: 5},
    {value: -5, score: 2},
    {value: 0, score: 1},
  ]);
  return gateComposite(
    calculateWeightedScore([
      {name: 'depressedPrice', rawValue: distanceFromHigh, score: depressedPrice, weight: 0.3},
      {
        name: 'fundamentalMomentum',
        rawValue: fundamentalMomentum.score,
        coverage: fundamentalMomentum.coverage,
        sourceConfidence: fundamentalMomentum.confidence,
        score: fundamentalMomentum.score,
        weight: 0.45,
      },
      {
        name: 'financialHealth',
        rawValue: financialHealth.score,
        coverage: financialHealth.coverage,
        sourceConfidence: financialHealth.confidence,
        score: financialHealth.score,
        weight: 0.25,
      },
    ]),
    [fundamentalMomentum, financialHealth],
  );
}
