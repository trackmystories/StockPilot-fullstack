import {calculateWeightedScore} from '../scoring';
import type {ScoreResult} from '../types';

type Inputs = {dilutionRisk: ScoreResult};

export function calculateDilutionScore({dilutionRisk}: Inputs): ScoreResult {
  const score = dilutionRisk.score === null ? null : 11 - dilutionRisk.score;
  return calculateWeightedScore([
    {
      name: 'dilutionSafety',
      rawValue: dilutionRisk.score,
      coverage: dilutionRisk.coverage,
      sourceConfidence: dilutionRisk.confidence,
      score,
      weight: 1,
    },
  ]);
}
