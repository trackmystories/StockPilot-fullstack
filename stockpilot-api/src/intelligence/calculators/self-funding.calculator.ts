import {calculateWeightedScore, gateComposite} from '../scoring';
import type {ScoreResult} from '../types';

type Inputs = {
  cashPower: ScoreResult;
  financialHealth: ScoreResult;
  dilutionRisk: ScoreResult;
  fundingPressure: ScoreResult;
};

export function calculateSelfFundingScore({
  cashPower,
  financialHealth,
  dilutionRisk,
  fundingPressure,
}: Inputs): ScoreResult {
  const dilutionSafety = dilutionRisk.score === null ? null : 11 - dilutionRisk.score;
  const fundingSafety = fundingPressure.score === null ? null : 11 - fundingPressure.score;
  return gateComposite(
    calculateWeightedScore([
      {
        name: 'cashPower',
        rawValue: cashPower.score,
        coverage: cashPower.coverage,
        sourceConfidence: cashPower.confidence,
        score: cashPower.score,
        weight: 0.4,
      },
      {
        name: 'financialHealth',
        rawValue: financialHealth.score,
        coverage: financialHealth.coverage,
        sourceConfidence: financialHealth.confidence,
        score: financialHealth.score,
        weight: 0.25,
      },
      {
        name: 'dilutionSafety',
        rawValue: dilutionRisk.score,
        coverage: dilutionRisk.coverage,
        sourceConfidence: dilutionRisk.confidence,
        score: dilutionSafety,
        weight: 0.2,
      },
      {
        name: 'fundingSafety',
        rawValue: fundingPressure.score,
        coverage: fundingPressure.coverage,
        sourceConfidence: fundingPressure.confidence,
        score: fundingSafety,
        weight: 0.15,
      },
    ]),
    [cashPower, fundingPressure],
    0,
  );
}
