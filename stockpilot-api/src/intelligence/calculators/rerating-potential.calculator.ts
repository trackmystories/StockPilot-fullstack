import {calculateWeightedScore, gateComposite} from '../scoring';
import type {ScoreResult} from '../types';
type Inputs = {
  fundamentalMomentum: ScoreResult;
  growthDurability: ScoreResult;
  marginPower: ScoreResult;
  valuation: ScoreResult;
  recovery: ScoreResult;
};
export function calculateReratingPotentialScore({
  fundamentalMomentum,
  growthDurability,
  marginPower,
  valuation,
  recovery,
}: Inputs): ScoreResult {
  return gateComposite(
    calculateWeightedScore([
      {
        name: 'fundamentalMomentum',
        rawValue: fundamentalMomentum.score,
        coverage: fundamentalMomentum.coverage,
        sourceConfidence: fundamentalMomentum.confidence,
        score: fundamentalMomentum.score,
        weight: 0.3,
      },
      {
        name: 'growthDurability',
        rawValue: growthDurability.score,
        coverage: growthDurability.coverage,
        sourceConfidence: growthDurability.confidence,
        score: growthDurability.score,
        weight: 0.2,
      },
      {
        name: 'marginPower',
        rawValue: marginPower.score,
        coverage: marginPower.coverage,
        sourceConfidence: marginPower.confidence,
        score: marginPower.score,
        weight: 0.15,
      },
      {
        name: 'valuation',
        rawValue: valuation.score,
        coverage: valuation.coverage,
        sourceConfidence: valuation.confidence,
        score: valuation.score,
        weight: 0.2,
      },
      {
        name: 'recovery',
        rawValue: recovery.score,
        coverage: recovery.coverage,
        sourceConfidence: recovery.confidence,
        score: recovery.score,
        weight: 0.15,
      },
    ]),
    [fundamentalMomentum, valuation],
  );
}
