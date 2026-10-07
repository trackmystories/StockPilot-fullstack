import {calculateWeightedScore} from '../scoring';
import type {ScoreResult} from '../types';

type Inputs = {
  dilution: ScoreResult;
  capitalDiscipline: ScoreResult;
  financialHealth: ScoreResult;
  cashPower: ScoreResult;
};

export function calculateShareholderFriendlinessScore({
  dilution,
  capitalDiscipline,
  financialHealth,
  cashPower,
}: Inputs): ScoreResult {
  return calculateWeightedScore([
    {
      name: 'dilution',
      rawValue: dilution.score,
      coverage: dilution.coverage,
      sourceConfidence: dilution.confidence,
      score: dilution.score,
      weight: 0.35,
    },
    {
      name: 'capitalDiscipline',
      rawValue: capitalDiscipline.score,
      coverage: capitalDiscipline.coverage,
      sourceConfidence: capitalDiscipline.confidence,
      score: capitalDiscipline.score,
      weight: 0.3,
    },
    {
      name: 'financialHealth',
      rawValue: financialHealth.score,
      coverage: financialHealth.coverage,
      sourceConfidence: financialHealth.confidence,
      score: financialHealth.score,
      weight: 0.15,
    },
    {
      name: 'cashPower',
      rawValue: cashPower.score,
      coverage: cashPower.coverage,
      sourceConfidence: cashPower.confidence,
      score: cashPower.score,
      weight: 0.2,
    },
  ]);
}
