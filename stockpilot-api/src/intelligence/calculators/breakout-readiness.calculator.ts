import {calculateWeightedScore, gateComposite} from '../scoring';
import type {ScoreResult} from '../types';

type Inputs = {momentum: ScoreResult; fundamentalMomentum: ScoreResult; marginPower: ScoreResult; growth: ScoreResult};

export function calculateBreakoutReadinessScore({
  momentum,
  fundamentalMomentum,
  marginPower,
  growth,
}: Inputs): ScoreResult {
  return gateComposite(
    calculateWeightedScore([
      {
        name: 'momentum',
        rawValue: momentum.score,
        coverage: momentum.coverage,
        sourceConfidence: momentum.confidence,
        score: momentum.score,
        weight: 0.35,
      },
      {
        name: 'fundamentalMomentum',
        rawValue: fundamentalMomentum.score,
        coverage: fundamentalMomentum.coverage,
        sourceConfidence: fundamentalMomentum.confidence,
        score: fundamentalMomentum.score,
        weight: 0.3,
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
        name: 'growth',
        rawValue: growth.score,
        coverage: growth.coverage,
        sourceConfidence: growth.confidence,
        score: growth.score,
        weight: 0.2,
      },
    ]),
    [momentum, fundamentalMomentum],
  );
}
