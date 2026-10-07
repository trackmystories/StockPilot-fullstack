import {calculateWeightedScore, gateComposite} from '../scoring';
import type {ScoreResult} from '../types';
type Inputs = {
  financialHealth: ScoreResult;
  cashPower: ScoreResult;
  fundingPressure: ScoreResult;
  dilutionRisk: ScoreResult;
};
export function calculateSurvivalScore({
  financialHealth,
  cashPower,
  fundingPressure,
  dilutionRisk,
}: Inputs): ScoreResult {
  const fundingSafety = fundingPressure.score === null ? null : 11 - fundingPressure.score;
  const dilutionSafety = dilutionRisk.score === null ? null : 11 - dilutionRisk.score;
  return gateComposite(
    calculateWeightedScore([
      {
        name: 'financialHealth',
        rawValue: financialHealth.score,
        coverage: financialHealth.coverage,
        sourceConfidence: financialHealth.confidence,
        score: financialHealth.score,
        weight: 0.35,
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
        name: 'fundingSafety',
        rawValue: fundingPressure.score,
        coverage: fundingPressure.coverage,
        sourceConfidence: fundingPressure.confidence,
        score: fundingSafety,
        weight: 0.2,
      },
      {
        name: 'dilutionSafety',
        rawValue: dilutionRisk.score,
        coverage: dilutionRisk.coverage,
        sourceConfidence: dilutionRisk.confidence,
        score: dilutionSafety,
        weight: 0.15,
      },
    ]),
    [financialHealth, cashPower, fundingPressure, dilutionRisk],
    0,
  );
}