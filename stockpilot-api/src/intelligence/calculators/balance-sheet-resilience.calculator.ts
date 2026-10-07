import {calculateWeightedScore} from '../scoring';
import type {ScoreResult} from '../types';
type Inputs = {financialHealth: ScoreResult; cashPower: ScoreResult; fundingPressure: ScoreResult};

export function calculateBalanceSheetResilienceScore({
  financialHealth,
  cashPower,
  fundingPressure,
}: Inputs): ScoreResult {
  const fundingSafety = fundingPressure.score === null ? null : 11 - fundingPressure.score;
  return calculateWeightedScore([
    {
      name: 'financialHealth',
      rawValue: financialHealth.score,
      coverage: financialHealth.coverage,
      sourceConfidence: financialHealth.confidence,
      score: financialHealth.score,
      weight: 0.5,
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
      name: 'fundingSafety',
      rawValue: fundingPressure.score,
      coverage: fundingPressure.coverage,
      sourceConfidence: fundingPressure.confidence,
      score: fundingSafety,
      weight: 0.25,
    },
  ]);
}
