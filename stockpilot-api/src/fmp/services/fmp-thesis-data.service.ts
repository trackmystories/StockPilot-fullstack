import {Injectable} from '@nestjs/common';
import {FmpHttpService} from '../clients/fmp-http.service';

export type FmpAnalystEstimate = {
  date: string | null;
  revenueAvg: number | null;
  epsAvg: number | null;
  numAnalystsRevenue: number | null;
  numAnalystsEps: number | null;
};

export type FmpPriceTargetConsensus = {
  targetHigh: number | null;
  targetLow: number | null;
  targetConsensus: number | null;
  targetMedian: number | null;
};

export type FmpRatingSnapshot = {
  rating: string | null;
  overallScore: number | null;
};

export type FmpThesisData = {
  analystEstimates: FmpAnalystEstimate[];
  priceTarget: FmpPriceTargetConsensus | null;
  rating: FmpRatingSnapshot | null;
};

@Injectable()
export class FmpThesisDataService {
  constructor(private readonly http: FmpHttpService) {}

  async getThesisData(rawSymbol: string): Promise<FmpThesisData> {
    const symbol = rawSymbol.trim().toUpperCase();

    const [analystResult, priceTargetResult, ratingResult] = await Promise.allSettled([
      this.http.get<unknown>('analyst-estimates', {
        symbol,
        period: 'annual',
        page: '0',
        limit: '6',
      }),

      this.http.get<unknown>('price-target-consensus', {
        symbol,
      }),

      this.http.get<unknown>('ratings-snapshot', {
        symbol,
      }),
    ]);

    const analystPayload =
      analystResult.status === 'fulfilled' && Array.isArray(analystResult.value) ? analystResult.value : [];

    const priceTargetPayload =
      priceTargetResult.status === 'fulfilled' && Array.isArray(priceTargetResult.value) ? priceTargetResult.value : [];

    const ratingPayload =
      ratingResult.status === 'fulfilled' && Array.isArray(ratingResult.value) ? ratingResult.value : [];

    const analystEstimates = analystPayload.map((row) => ({
      date: this.stringOrNull(row.date),
      revenueAvg: this.numberOrNull(row.revenueAvg ?? row.estimatedRevenueAvg),
      epsAvg: this.numberOrNull(row.epsAvg ?? row.estimatedEpsAvg),
      numAnalystsRevenue: this.numberOrNull(row.numAnalystsRevenue ?? row.numberAnalystEstimatedRevenue),
      numAnalystsEps: this.numberOrNull(row.numAnalystsEps ?? row.numberAnalystsEstimatedEps),
    }));

    const targetRow = priceTargetPayload[0];

    const priceTarget = targetRow
      ? {
          targetHigh: this.numberOrNull(targetRow.targetHigh),
          targetLow: this.numberOrNull(targetRow.targetLow),
          targetConsensus: this.numberOrNull(targetRow.targetConsensus),
          targetMedian: this.numberOrNull(targetRow.targetMedian),
        }
      : null;

    const ratingRow = ratingPayload[0];

    const rating = ratingRow
      ? {
          rating: this.stringOrNull(ratingRow.rating),
          overallScore: this.numberOrNull(ratingRow.overallScore),
        }
      : null;

    return {
      analystEstimates,
      priceTarget,
      rating,
    };
  }

  private numberOrNull(value: unknown): number | null {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return null;
    }

    if (typeof value === 'string' && !value.trim()) {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private stringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    return value.trim() || null;
  }
}
