import {Injectable} from '@nestjs/common';
import {screenerConfig} from '../config/screeners.config';
import type {CalculatedScreenerResult, RankedScreenerResult} from '../types/screener-result';

@Injectable()
export class ScreenerRankingService {
  rank(screenerId: string, results: CalculatedScreenerResult[]): RankedScreenerResult[] {
    const config = screenerConfig[screenerId];
    if (!config) {
      throw new Error(`Missing screener configuration for "${screenerId}".`);
    }
    return results
      .filter(
        (result) =>
          result.eligible === true &&
          Number.isFinite(result.score) &&
          Number.isFinite(result.coverage) &&
          result.score >= config.minimumScore &&
          result.coverage >= config.minimumCoverage,
      )
      .sort((first, second) => {
        const scoreDifference = second.score - first.score;
        if (scoreDifference !== 0) {
          return scoreDifference;
        }
        return first.symbol.localeCompare(second.symbol);
      })
      .slice(0, config.resultLimit)
      .map((result, index): RankedScreenerResult => ({...result, rank: index + 1}));
  }
}
