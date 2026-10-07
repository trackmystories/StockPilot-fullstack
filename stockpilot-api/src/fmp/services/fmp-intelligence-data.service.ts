import {Injectable} from '@nestjs/common';
import type {EstimatesData, MomentumData} from '../../intelligence/calculators/calculator.type';
import {FmpHttpService} from '../clients/fmp-http.service';

type Row = Record<string, unknown>;

@Injectable()

export class FmpIntelligenceDataService {

  constructor(private readonly http: FmpHttpService) {}
  async getMomentumData(symbol: string): Promise<MomentumData | null> {
    // Same endpoint and parameters as risk:
    // both share one cached request.
    const rows = await this.http.get<Row[]>('historical-price-eod/full', {symbol: symbol.trim().toUpperCase()});
    const prices = [...rows]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map((row) => this.toNumber(row.close))
      .filter((value): value is number => value !== null && value > 0);
    if (!prices.length) {
      return null;
    }
    const price = prices[0];
    const change = (days: number): number | null => (prices.length > days ? price / prices[days] - 1 : null);
    const average = (days: number): number | null =>
      prices.length >= days ? prices.slice(0, days).reduce((sum, value) => sum + value, 0) / days : null;
    const year = prices.slice(0, 252);
    return {
      price,
      return1M: change(21),
      return3M: change(63),
      return6M: change(126),
      return12M: change(252),
      sma50: average(50),
      sma200: average(200),
      yearHigh: year.length >= 252 ? Math.max(...year) : null,
      yearLow: year.length >= 252 ? Math.min(...year) : null,
      rsi14: this.calculateRsi14(prices),
    };
  }
  async getEstimatesData(symbol: string): Promise<EstimatesData | null> {
    const rows = await this.http.get<Row[]>('analyst-estimates', {
      symbol: symbol.trim().toUpperCase(),
      period: 'annual',
      page: '0',
      limit: '10',
    });
    const normalized = rows
      .map((row): Row & {year: number} => ({
        ...row,
        year: typeof row.date === 'string' ? Number(row.date.slice(0, 4)) : NaN,
      }))
      .filter((row) => Number.isFinite(row.year))
      .sort((a, b) => a.year - b.year);
    const today = new Date().toISOString().slice(0, 10);
    const current = normalized.find((row) => String(row.date) >= today);
    if (!current) {
      return null;
    }
    const next = normalized.find((row) => row.year === current.year + 1);
    if (!next) {
      return null;
    }
    const currentEps = this.toNumber(current.epsAvg ?? current.estimatedEpsAvg);
    const nextEps = this.toNumber(next.epsAvg ?? next.estimatedEpsAvg);
    const currentRevenue = this.toNumber(current.revenueAvg ?? current.estimatedRevenueAvg);
    const nextRevenue = this.toNumber(next.revenueAvg ?? next.estimatedRevenueAvg);

    return {
      currentPeriod: String(current.date),
      nextPeriod: String(next.date),
      observedAt: new Date().toISOString(),
      currency:
        typeof next.reportedCurrency === 'string'
          ? next.reportedCurrency
          : typeof next.currency === 'string'
            ? next.currency
            : null,
      currentEps,
      nextEps,
      currentRevenue,
      nextRevenue,
      epsGrowth: currentEps !== null && nextEps !== null && currentEps > 0 ? nextEps / currentEps - 1 : null,
      revenueGrowth:
        currentRevenue !== null && nextRevenue !== null && currentRevenue > 0 ? nextRevenue / currentRevenue - 1 : null,
      analystCount: (() => {
        const counts = [current, next].flatMap((row) => [
          this.toNumber(row.numAnalystsEps ?? row.numberAnalystsEstimatedEps ?? row.numberAnalystEstimatedEps),
          this.toNumber(
            row.numAnalystsRevenue ?? row.numberAnalystsEstimatedRevenue ?? row.numberAnalystEstimatedRevenue,
          ),
        ]);
        return counts.every((value) => value !== null && value > 0) ? Math.min(...(counts as number[])) : null;
      })(),
    };
  }
  
  private toNumber(value: unknown): number | null {
    if (
      (typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private calculateRsi14(pricesNewestFirst: number[]): number | null {
    if (pricesNewestFirst.length < 15) {
      return null;
    }
    const prices = pricesNewestFirst.slice(0, 15).reverse();
    let gains = 0;
    let losses = 0;
    for (let index = 1; index < prices.length; index += 1) {
      const change = prices[index] - prices[index - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    if (losses === 0) {
      return gains > 0 ? 100 : 50;
    }
    return 100 - 100 / (1 + gains / losses);
  }
}
