import {calculateWeightedScore} from '../scoring';
import type {ScoreResult} from '../types';

type Inputs = {earningsQuality: ScoreResult; cashPower: ScoreResult; marginPower: ScoreResult};

export function calculateEarningsReliabilityScore({earningsQuality, cashPower, marginPower}: Inputs): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'earningsQuality',
      rawValue: earningsQuality.score,
      coverage: earningsQuality.coverage,
      sourceConfidence: earningsQuality.confidence,
      score: earningsQuality.score,
      weight: 0.5,
    },
    {
      name: 'cashPower',
      rawValue: cashPower.score,
      coverage: cashPower.coverage,
      sourceConfidence: cashPower.confidence,
      score: cashPower.score,
      weight: 0.3,
    },
    {
      name: 'marginPower',
      rawValue: marginPower.score,
      coverage: marginPower.coverage,
      sourceConfidence: marginPower.confidence,
      score: marginPower.score,
      weight: 0.2,
    },
  ]);
}
