import {calculateWeightedScore, gateComposite} from '../scoring';
import type {ScoreResult} from '../types';

type Inputs = {valuation: ScoreResult; growth: ScoreResult; marginPower: ScoreResult; momentum: ScoreResult};

export function calculateValuationCompressionRiskScore({
  valuation,
  growth,
  marginPower,
  momentum,
}: Inputs): ScoreResult {
  const valuationRisk = valuation.score === null ? null : 11 - valuation.score;
  const growthRisk = growth.score === null ? null : 11 - growth.score;
  const marginRisk = marginPower.score === null ? null : 11 - marginPower.score;
  const momentumRisk = momentum.score === null ? null : 11 - momentum.score;
  return gateComposite(
    calculateWeightedScore(
      [
        {
          name: 'valuationRisk',
          rawValue: valuation.score,
          coverage: valuation.coverage,
          sourceConfidence: valuation.confidence,
          score: valuationRisk,
          weight: 0.35,
        },
        {
          name: 'growthRisk',
          rawValue: growth.score,
          coverage: growth.coverage,
          sourceConfidence: growth.confidence,
          score: growthRisk,
          weight: 0.25,
        },
        {
          name: 'marginRisk',
          rawValue: marginPower.score,
          coverage: marginPower.coverage,
          sourceConfidence: marginPower.confidence,
          score: marginRisk,
          weight: 0.2,
        },
        {
          name: 'momentumRisk',
          rawValue: momentum.score,
          coverage: momentum.coverage,
          sourceConfidence: momentum.confidence,
          score: momentumRisk,
          weight: 0.2,
        },
      ],
      'higher_is_riskier',
    ),
    [valuation],
    0,
  );
}
