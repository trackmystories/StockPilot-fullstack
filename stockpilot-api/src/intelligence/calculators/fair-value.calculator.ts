import type {FmpThesisData} from '../../fmp/services/fmp-thesis-data.service';
import type {PeerMetric, StockIntelligenceMetrics} from '../types';

export type FairValueMethodId =
  | 'analyst-target'
  | 'peer-forward-pe'
  | 'peer-pe'
  | 'peer-price-to-sales'
  | 'peer-price-to-book'
  | 'peer-price-to-fcf'
  | 'peer-ev-to-ebitda';

export type FairValueMethod = {
  id: FairValueMethodId;
  name: string;
  source: 'analyst' | 'peer';
  impliedValue: number;
  companyMultiple: number | null;
  peerMedian: number | null;
  peerCount: number | null;
  peerGroup: string | null;
  peerLevel: 'industry' | 'sector' | null;
};

export type FairValueResult = {
  currentPrice: number | null;
  estimatedFairValue: number | null;
  differencePercent: number | null;
  status:
    | 'below-model-reference'
    | 'near-model-reference'
    | 'above-model-reference'
    | 'insufficient-data';
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  eligible: boolean;
  currency: string | null;
  methods: FairValueMethod[];
};

type Input = {
  currentPrice: number | null;
  metrics: StockIntelligenceMetrics;
  thesisData: FmpThesisData;
};

const round = (value: number, decimals = 2): number =>
  Number(value.toFixed(decimals));

const positive = (
  value: number | null | undefined,
): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;

const median = (values: number[]): number | null => {
  if (!values.length) {
    return null;
  }

  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);

  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
};

const peerFor = (
  metrics: StockIntelligenceMetrics,
  key: keyof StockIntelligenceMetrics,
): PeerMetric | undefined =>
  metrics.peers?.analysisMetrics?.[key] ??
  metrics.peers?.metrics[key];

function peerMethod(
  id: FairValueMethodId,
  name: string,
  currentPrice: number,
  companyMultiple: number | null,
  peer: PeerMetric | undefined,
): FairValueMethod | null {
  const multiple = positive(companyMultiple);
  const peerMedian = positive(peer?.median);

  if (!multiple || !peerMedian || !peer || peer.count < 20) {
    return null;
  }

  const impliedValue =
    currentPrice * (peerMedian / multiple);

  if (!Number.isFinite(impliedValue) || impliedValue <= 0) {
    return null;
  }

  return {
    id,
    name,
    source: 'peer',
    impliedValue: round(impliedValue),
    companyMultiple: round(multiple),
    peerMedian: round(peerMedian),
    peerCount: peer.count,
    peerGroup: peer.group,
    peerLevel: peer.level,
  };
}

function evToEbitdaMethod(
  currentPrice: number,
  metrics: StockIntelligenceMetrics,
): FairValueMethod | null {
  const companyMultiple = positive(metrics.evToEbitda);
  const peer = peerFor(metrics, 'evToEbitda');
  const peerMedian = positive(peer?.median);
  const marketCap = positive(metrics.marketCap);
  const ebitda = positive(metrics.ebitdaTtm);

  if (
    !companyMultiple ||
    !peerMedian ||
    !peer ||
    peer.count < 20 ||
    !marketCap ||
    !ebitda
  ) {
    return null;
  }

  const netDebt = metrics.netDebt ?? 0;
  const currentEnterpriseValue = marketCap + netDebt;
  const reconstructedMultiple =
    currentEnterpriseValue / ebitda;

  if (
    !Number.isFinite(reconstructedMultiple) ||
    reconstructedMultiple <= 0 ||
    Math.abs(
      reconstructedMultiple / companyMultiple - 1,
    ) > 0.05
  ) {
    return null;
  }

  const targetEnterpriseValue = ebitda * peerMedian;
  const targetMarketCap =
    targetEnterpriseValue - netDebt;

  if (
    !Number.isFinite(targetMarketCap) ||
    targetMarketCap <= 0
  ) {
    return null;
  }

  const impliedValue =
    currentPrice * (targetMarketCap / marketCap);

  if (
    !Number.isFinite(impliedValue) ||
    impliedValue <= 0
  ) {
    return null;
  }

  return {
    id: 'peer-ev-to-ebitda',
    name: 'Peer EV / EBITDA',
    source: 'peer',
    impliedValue: round(impliedValue),
    companyMultiple: round(companyMultiple),
    peerMedian: round(peerMedian),
    peerCount: peer.count,
    peerGroup: peer.group,
    peerLevel: peer.level,
  };
}

export function calculateFairValue({
  currentPrice,
  metrics,
  thesisData,
}: Input): FairValueResult {
  const price = positive(currentPrice);

  if (!price) {
    return {
      currentPrice: null,
      estimatedFairValue: null,
      differencePercent: null,
      status: 'insufficient-data',
      coverage: 0,
      confidence: 'low',
      eligible: false,
      currency:
        metrics.dataQuality?.quoteCurrency ?? null,
      methods: [],
    };
  }

  const methods: FairValueMethod[] = [];

  const analystTarget =
    positive(
      thesisData.priceTarget?.targetMedian,
    ) ??
    positive(
      thesisData.priceTarget?.targetConsensus,
    );

  if (analystTarget) {
    methods.push({
      id: 'analyst-target',
      name: 'Analyst target',
      source: 'analyst',
      impliedValue: round(analystTarget),
      companyMultiple: null,
      peerMedian: null,
      peerCount: null,
      peerGroup: null,
      peerLevel: null,
    });
  }

  const peerMethods = [
    peerMethod(
      'peer-forward-pe',
      'Peer forward P/E',
      price,
      metrics.forwardPe,
      peerFor(metrics, 'forwardPe'),
    ),
    peerMethod(
      'peer-pe',
      'Peer trailing P/E',
      price,
      metrics.pe,
      peerFor(metrics, 'pe'),
    ),
    peerMethod(
      'peer-price-to-sales',
      'Peer price / sales',
      price,
      metrics.priceToSales,
      peerFor(metrics, 'priceToSales'),
    ),
    peerMethod(
      'peer-price-to-book',
      'Peer price / book',
      price,
      metrics.priceToBook,
      peerFor(metrics, 'priceToBook'),
    ),
    peerMethod(
      'peer-price-to-fcf',
      'Peer price / FCF',
      price,
      metrics.priceToFcf,
      peerFor(metrics, 'priceToFcf'),
    ),
    evToEbitdaMethod(price, metrics),
  ].filter(
    (
      method,
    ): method is FairValueMethod =>
      method !== null,
  );

  methods.push(...peerMethods);

  const estimatedFairValue =
    methods.length >= 2
      ? median(
          methods.map(
            (method) => method.impliedValue,
          ),
        )
      : null;

  const differencePercent =
    estimatedFairValue === null
      ? null
      : round(
          (estimatedFairValue / price - 1) * 100,
          1,
        );

  const coverage = round(
    methods.length / 7,
    4,
  );

  const hasAnalystTarget = methods.some(
    (method) => method.source === 'analyst',
  );

  const peerMethodCount = methods.filter(
    (method) => method.source === 'peer',
  ).length;

  const confidence =
    methods.length >= 4 &&
    hasAnalystTarget &&
    peerMethodCount >= 3
      ? 'high'
      : methods.length >= 3
        ? 'medium'
        : 'low';

  const status =
    differencePercent === null
      ? 'insufficient-data'
      : differencePercent >= 15
        ? 'below-model-reference'
        : differencePercent <= -15
          ? 'above-model-reference'
          : 'near-model-reference';

  return {
    currentPrice: round(price),
    estimatedFairValue:
      estimatedFairValue === null
        ? null
        : round(estimatedFairValue),
    differencePercent,
    status,
    coverage,
    confidence,
    eligible: estimatedFairValue !== null,
    currency:
      metrics.dataQuality?.quoteCurrency ?? null,
    methods,
  };
}