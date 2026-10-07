import {calculateWeightedScore} from '../scoring';
import type {ScoreResult} from '../types';

type Inputs = {
  fundamentalMomentum: ScoreResult;
  cashPower: ScoreResult;
  marginPower: ScoreResult;
  financialHealth: ScoreResult;
};

export function calculateExecutionScore({
  fundamentalMomentum,
  cashPower,
  marginPower,
  financialHealth,
}: Inputs): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'fundamentalMomentum',
      rawValue: fundamentalMomentum.score,
      coverage: fundamentalMomentum.coverage,
      sourceConfidence: fundamentalMomentum.confidence,
      score: fundamentalMomentum.score,
      weight: 0.3,
    },
    {
      name: 'cashPower',
      rawValue: cashPower.score,
      coverage: cashPower.coverage,
      sourceConfidence: cashPower.confidence,
      score: cashPower.score,
      weight: 0.25,
    },
    {
      name: 'marginPower',
      rawValue: marginPower.score,
      coverage: marginPower.coverage,
      sourceConfidence: marginPower.confidence,
      score: marginPower.score,
      weight: 0.25,
    },
    {
      name: 'financialHealth',
      rawValue: financialHealth.score,
      coverage: financialHealth.coverage,
      sourceConfidence: financialHealth.confidence,
      score: financialHealth.score,
      weight: 0.2,
    },
  ]);
}
