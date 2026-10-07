import {useCallback, useEffect, useState} from 'react';
import type {
  EarningsOutlookResult,
  FairValueResult,
  InvestmentCaseResult,
} from '../StockPilotScoreCard/types/investmentOverview';
import {ApiError, requestJson} from '../Auth/infrastructure/http';
import {loadStockData, saveStockData} from './storage/savedStockDataCache';

export type FmpFinancialMetrics = {
  growth: {
    revenueGrowthYoY: number | null;
    revenueGrowthTtm: number | null;
    revenueAcceleration: number | null;
  };
  profitability: {operatingMarginTtm: number | null};
  cashFlow: {freeCashFlowTtm: number | null; freeCashFlowMargin: number | null};
  balanceSheet: {
    netDebt: number | null;
    currentRatio: number | null;
    interestCoverage: number | null;
    netDebtToEbitda: number | null;
  };
  dilution: {dilutedShareGrowthYoY: number | null; epsDilutedTtm: number | null};
};
export type InvestorSignals = {
  earningsQuality: {
    cashConversionTtm: number | null;
    accrualRatioTtm: number | null;
    fcfConversionTtm: number | null;
    operatingMarginChangeYoY: number | null;
  };
  capitalEfficiency: {
    roicTtm: number | null;
    incrementalRoicYoY: number | null;
    capexIntensityTtm: number | null;
    revenueToInvestedCapital: number | null;
    roicMethod: string;
  };
  growthMomentum: {
    revenueGrowthYoY: number | null;
    revenueGrowthTtm: number | null;
    revenueAcceleration: number | null;
    operatingMarginChangeYoY: number | null;
  };
  fundingRisk: {
    cashRunwayQuarters: number | null;
    netDebt: number | null;
    currentRatio: number | null;
    interestCoverage: number | null;
    netDebtToEbitda: number | null;
    debtGrowthYoY: number | null;
    cashToShortTermDebt: number | null;
    dilutedShareGrowthYoY: number | null;
    netStockIssuanceTtm: number | null;
  };
};
export type BullBearCaseItem = {key: string; text: string};
export type BullBearCase = {bullCase: BullBearCaseItem[]; bearCase: BullBearCaseItem[]};
export type InvestmentThesis = {
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  drivers: string[];
  risks: string[];
  evidenceSources: string[];
};
export type FinancialMetricsResponse = {
  symbol: string;
  sourceRunId?: string;
  calculationVersion?: number;
  stale?: boolean;
  metrics: FmpFinancialMetrics;
  investorSignals: InvestorSignals;
  bullBearCase: BullBearCase;
  investmentThesis: InvestmentThesis;
  fairValue?: FairValueResult | null;
  earningsOutlook?: EarningsOutlookResult | null;
  investmentCase?: InvestmentCaseResult | null;
};

type State = {
  data: FinancialMetricsResponse | null;
  loading: boolean;
  error: string | null;
  notPrepared: boolean;
  fromCache: boolean;
  cachedAt: number | null;
};

const initialState: State = {
  data: null,
  loading: true,
  error: null,
  notPrepared: false,
  fromCache: false,
  cachedAt: null,
};

export function useFmpFinancialMetrics(symbol: string, token: string | null) {
  const [state, setState] = useState<State>(initialState);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const controller = new AbortController();
    let active = true;

    setState({
      ...initialState,
      loading: Boolean(normalizedSymbol),
    });

    if (!normalizedSymbol) return;

    void (async () => {
      try {
        const data = await requestJson<FinancialMetricsResponse>(
          `/api/financials/${encodeURIComponent(normalizedSymbol)}`,
          {signal: controller.signal},
        );

        if (data.symbol !== normalizedSymbol || !data.metrics || !data.investorSignals) {
          throw new Error('Invalid financial analysis response.');
        }

        await saveStockData('financials', normalizedSymbol, data);

        if (active) {
          setState({
            data,
            loading: false,
            error: null,
            notPrepared: false,
            fromCache: false,
            cachedAt: null,
          });
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;

        const cached = await loadStockData<FinancialMetricsResponse>('financials', normalizedSymbol);

        if (cached?.data?.symbol === normalizedSymbol && cached.data.metrics && cached.data.investorSignals) {
          setState({
            data: cached.data,
            loading: false,
            error: null,
            notPrepared: false,
            fromCache: true,
            cachedAt: cached.cachedAt,
          });
          return;
        }

        const notPrepared = error instanceof ApiError && error.code === 'INTELLIGENCE_NOT_PREPARED';
        setState({
          data: null,
          loading: false,
          notPrepared,
          error: notPrepared
            ? 'Financial analysis is not available for this stock yet. It will appear after a scheduled update includes it.'
            : error instanceof Error
              ? error.message
              : 'Could not load financial metrics.',
          fromCache: false,
          cachedAt: null,
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [symbol, token, attempt]);

  const data = state.data?.symbol === symbol.trim().toUpperCase() ? state.data : null;

  return {
    ...state,
    data,
    metrics: data?.metrics ?? null,
    investorSignals: data?.investorSignals ?? null,
    bullBearCase: data?.bullBearCase ?? null,
    investmentThesis: data?.investmentThesis ?? null,
    fairValue: data?.fairValue ?? null,
    earningsOutlook: data?.earningsOutlook ?? null,
    investmentCase: data?.investmentCase ?? null,
    refresh,
  };
}