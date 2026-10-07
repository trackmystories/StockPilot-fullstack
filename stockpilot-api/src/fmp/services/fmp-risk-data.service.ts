import {Injectable, Logger} from '@nestjs/common';
import {calculateRiskScore} from '../../intelligence/calculators/risk.calculator';
import {
  calculateVolatilityScore,
  type HistoricalPricePoint,
} from '../../intelligence/calculators/volatility.calculator';
import {FmpHttpService} from '../clients/fmp-http.service';
type FmpProfile = {
  symbol?: string;
  companyName?: string;
  companyNameLong?: string;
  beta?: number | string | null;
  marketCap?: number | string | null;
  image?: string | null;
};
type FmpRatios = {
  currentRatio?: number | string | null;
  debtToEquityRatio?: number | string | null;
  debtEquityRatio?: number | string | null;
  priceToEarningsRatio?: number | string | null;
  priceEarningsRatio?: number | string | null;
  priceToSalesRatio?: number | string | null;
  netProfitMargin?: number | string | null;
};
type FmpCashFlow = {freeCashFlow?: number | string | null};
type FmpHistoricalPrice = {symbol?: string; date?: string; close?: number | string | null};
@Injectable()
export class FmpRiskDataService {
  private readonly logger = new Logger(FmpRiskDataService.name);
  constructor(private readonly http: FmpHttpService) {}
  async getStockRiskMetrics(rawSymbol: string, strict = false) {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!symbol) {
      throw new Error('Stock symbol is required.');
    }
    const [profileResult, ratiosResult, cashFlowResult, historicalResult] = await Promise.allSettled([
      this.http.get<unknown>('profile', {symbol}),
      this.http.get<unknown>('ratios', {symbol, period: 'annual', limit: '1'}),
      this.http.get<unknown>('cash-flow-statement', {symbol, period: 'annual', limit: '1'}),
      this.http.get<unknown>('historical-price-eod/full', {symbol}),
    ]);
    if (strict) {
      for (const result of [profileResult, ratiosResult, cashFlowResult, historicalResult]) {
        if (result.status === 'rejected') {
          throw result.reason;
        }
        if (!Array.isArray(result.value)) {
          throw new Error(`Invalid FMP risk input for ${symbol}.`);
        }
      }
    }
    if (profileResult.status === 'rejected') {
      this.logger.warn(`FMP profile failed for ${symbol}.`);
    }
    if (ratiosResult.status === 'rejected') {
      this.logger.warn(`FMP ratios failed for ${symbol}.`);
    }
    if (cashFlowResult.status === 'rejected') {
      this.logger.warn(`FMP cash flow failed for ${symbol}.`);
    }
    if (historicalResult.status === 'rejected') {
      this.logger.warn(`FMP historical price failed for ${symbol}.`);
    }
    const profilePayload =
      profileResult.status === 'fulfilled' && Array.isArray(profileResult.value) ? profileResult.value : [];
    const ratiosPayload =
      ratiosResult.status === 'fulfilled' && Array.isArray(ratiosResult.value) ? ratiosResult.value : [];
    const cashFlowPayload =
      cashFlowResult.status === 'fulfilled' && Array.isArray(cashFlowResult.value) ? cashFlowResult.value : [];
    const historicalPayload =
      historicalResult.status === 'fulfilled' && Array.isArray(historicalResult.value) ? historicalResult.value : [];
    const profile = this.getFirstItem<FmpProfile>(profilePayload);
    const ratios = this.getFirstItem<FmpRatios>(ratiosPayload);
    const cashFlow = this.getFirstItem<FmpCashFlow>(cashFlowPayload);
    const historicalPrices = this.parseHistoricalPrices(historicalPayload);
    const beta = this.numberOrNull(profile?.beta);
    const marketCap = this.numberOrNull(profile?.marketCap);
    const debtToEquity = this.numberOrNull(ratios?.debtToEquityRatio) ?? this.numberOrNull(ratios?.debtEquityRatio);
    const currentRatio = this.numberOrNull(ratios?.currentRatio);
    const netMargin = this.numberOrNull(ratios?.netProfitMargin);
    const freeCashFlow = this.numberOrNull(cashFlow?.freeCashFlow);
    const peRatio = this.numberOrNull(ratios?.priceToEarningsRatio) ?? this.numberOrNull(ratios?.priceEarningsRatio);
    const priceToSalesRatio = this.numberOrNull(ratios?.priceToSalesRatio);
    const volatility = calculateVolatilityScore({beta, historicalPrices});
    const risk = calculateRiskScore({
      beta,
      debtToEquity,
      currentRatio,
      netMargin: netMargin === null ? null : netMargin * 100,
      freeCashFlow,
      marketCap,
      peRatio,
      priceToSalesRatio,
      volatilityScore: volatility.score,
    });
    const companyName = this.stringOrNull(profile?.companyName) ?? this.stringOrNull(profile?.companyNameLong);
    const logoUrl = this.stringOrNull(profile?.image);
    return {
      companyName,
      logoUrl,
      riskScore: risk.score,
      riskCoverage: risk.coverage,
      riskConfidence: risk.confidence,
      volatilityCoverage: volatility.coverage,
      volatilityConfidence: volatility.confidence,
      riskLevel: risk.level,
      volatilityScore: volatility.score,
      volatility: {beta: volatility.beta, annualizedVolatility: volatility.annualizedVolatility},
      riskComponents: risk.components,
    };
  }
  private numberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  private stringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }
  private getFirstItem<T>(payload: unknown[]): T | undefined {
    if (!payload.length) {
      return undefined;
    }
    return payload[0] as T;
  }
  private parseHistoricalPrices(payload: unknown[]): HistoricalPricePoint[] {
    return payload
      .map((item) => {
        const row = item as FmpHistoricalPrice;
        const date = this.stringOrNull(row.date);
        const close = this.numberOrNull(row.close);
        if (!date || close === null) {
          return null;
        }
        return {date, close};
      })
      .filter((item): item is HistoricalPricePoint => item !== null)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 253);
  }
}
