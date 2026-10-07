import {useCallback, useEffect, useState} from 'react';
import {ApiError} from '../Auth/infrastructure/http';
import {authenticatedRequest} from '../Auth/infrastructure/authenticatedRequest';
import {loadStockData, saveStockData} from './storage/savedStockDataCache';

export type ScoreConfidence = 'low' | 'medium' | 'high';
export type ScoreDirection = 'higher_is_better' | 'higher_is_riskier';
export type ScoreComponent = {
  score: number | null;
  rawValue: number | null;
  weight: number;
  coverage?: number;
};
export type IntelligenceScore = {
  score: number | null;
  direction: ScoreDirection;
  confidence?: ScoreConfidence;
  eligible?: boolean;
  reasons?: string[];
  coverage: number;
  components: Record<string, ScoreComponent>;
};
export type StockIntelligenceScores = Record<
  | 'overall'
  | 'conviction'
  | 'quality'
  | 'growth'
  | 'valuation'
  | 'financialHealth'
  | 'momentum'
  | 'earningsQuality'
  | 'capitalEfficiency'
  | 'reratingPotential'
  | 'execution'
  | 'cashPower'
  | 'fundingPressure'
  | 'dilutionRisk'
  | 'balanceSheetResilience'
  | 'growthDurability'
  | 'marginPower'
  | 'capitalDiscipline'
  | 'earningsReliability'
  | 'businessEfficiency'
  | 'valuationCompressionRisk'
  | 'recovery'
  | 'breakoutReadiness'
  | 'fundamentalMomentum'
  | 'survival'
  | 'shareholderFriendliness'
  | 'selfFunding'
  | 'operatingLeverage'
  | 'dilution'
  | 'risk'
  | 'volatility',
  IntelligenceScore
>;
export type StockIntelligence = {
  symbol: string;
  generatedAt: string | null;
  sourceRunId?: string;
  calculationVersion?: number;
  stale?: boolean;
  scores: Partial<StockIntelligenceScores>;
};

type State = {
  data: StockIntelligence | null;
  loading: boolean;
  error: string | null;
  notPrepared: boolean;
  fromCache: boolean;
  cachedAt: number | null;
};

const initialState: State = {
  data: null,
  loading: false,
  error: null,
  notPrepared: false,
  fromCache: false,
  cachedAt: null,
};

export function useStockIntelligence(symbol: string, token: string | null) {
  const [state, setState] = useState<State>(initialState);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const normalizedSymbol = symbol.trim().toUpperCase();

    if (!normalizedSymbol) {
      setState(initialState);
      return;
    }

    if (!token) {
      setState({
        ...initialState,
        error: 'Please sign in to load stock scores.',
      });
      return;
    }

    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setState({
        ...initialState,
        loading: true,
      });

      try {
        const data = await authenticatedRequest<StockIntelligence>(
          `/api/stocks/${encodeURIComponent(normalizedSymbol)}/intelligence`,
          {signal: controller.signal},
        );

        if (!data || data.symbol !== normalizedSymbol || !data.scores || typeof data.scores !== 'object') {
          throw new Error('Invalid stock intelligence response.');
        }

        await saveStockData('intelligence', normalizedSymbol, data);

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

        const cached = await loadStockData<StockIntelligence>('intelligence', normalizedSymbol);

        if (cached?.data?.symbol === normalizedSymbol && cached.data.scores) {
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
          error: notPrepared
            ? 'Scores are not available for this stock yet. They will appear after a scheduled update includes it.'
            : error instanceof Error
              ? error.message
              : 'Could not load stock intelligence.',
          notPrepared,
          fromCache: false,
          cachedAt: null,
        });
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [symbol, token, attempt]);

  return {...state, refresh};
}