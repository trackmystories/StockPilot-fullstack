import {calculateWeightedScore, gateComposite} from '../scoring';
import type {ScoreResult} from '../types';
type Inputs = {
  quality: ScoreResult;
  growth: ScoreResult;
  valuation: ScoreResult;
  financialHealth: ScoreResult;
  earningsQuality: ScoreResult;
  capitalEfficiency: ScoreResult;
  fundamentalMomentum: ScoreResult;
};
export function calculateConvictionScore({
  quality,
  growth,
  valuation,
  financialHealth,
  earningsQuality,
  capitalEfficiency,
  fundamentalMomentum,
}: Inputs): ScoreResult {
  return gateComposite(
    calculateWeightedScore([
      {
        name: 'quality',
        rawValue: quality.score,
        coverage: quality.coverage,
        sourceConfidence: quality.confidence,
        score: quality.score,
        weight: 0.25,
      },
      {
        name: 'growth',
        rawValue: growth.score,
        coverage: growth.coverage,
        sourceConfidence: growth.confidence,
        score: growth.score,
        weight: 0.2,
      },
      {
        name: 'valuation',
        rawValue: valuation.score,
        coverage: valuation.coverage,
        sourceConfidence: valuation.confidence,
        score: valuation.score,
        weight: 0.15,
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
        name: 'earningsQuality',
        rawValue: earningsQuality.score,
        coverage: earningsQuality.coverage,
        sourceConfidence: earningsQuality.confidence,
        score: earningsQuality.score,
        weight: 0.1,
      },
      {
        name: 'capitalEfficiency',
        rawValue: capitalEfficiency.score,
        coverage: capitalEfficiency.coverage,
        sourceConfidence: capitalEfficiency.confidence,
        score: capitalEfficiency.score,
        weight: 0.1,
      },
      {
        name: 'fundamentalMomentum',
        rawValue: fundamentalMomentum.score,
        coverage: fundamentalMomentum.coverage,
        sourceConfidence: fundamentalMomentum.confidence,
        score: fundamentalMomentum.score,
        weight: 0.05,
      },
    ]),
    [quality, financialHealth, earningsQuality],
  );
}
