import type {CompanyData} from './calculator.type';
import type {StockIntelligenceMetrics} from '../types';

type MetricDirection =
  | 'higher_is_better'
  | 'lower_is_better';

type MetricDefinition = {
  key: keyof StockIntelligenceMetrics;
  direction: MetricDirection;
};

type DimensionDefinition = {
  key:
    | 'growth'
    | 'quality'
    | 'financialHealth'
    | 'valuation'
    | 'momentum';
  name: string;
  metrics: MetricDefinition[];
};

export type PeerComparisonMetric = {
  key: string;
  value: number;
  peerMedian: number;
  rawPercentile: number;
  standingPercentile: number;
  peerCount: number;
  group: string;
  level: 'industry' | 'sector';
};

export type PeerComparisonDimension = {
  key: DimensionDefinition['key'];
  name: string;
  standingPercentile: number | null;
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  peerCount: number | null;
  level: 'industry' | 'sector' | null;
  metrics: PeerComparisonMetric[];
};

export type PeerComparisonResult = {
  industry: string | null;
  sector: string | null;
  dimensions: Record<
    DimensionDefinition['key'],
    PeerComparisonDimension
  >;
};

const DIMENSIONS: DimensionDefinition[] = [
  {
    key: 'growth',
    name: 'Growth',
    metrics: [
      {
        key: 'revenueGrowthTtm',
        direction: 'higher_is_better',
      },
      {
        key: 'revenueCagr3Y',
        direction: 'higher_is_better',
      },
      {
        key: 'epsGrowthYoY',
        direction: 'higher_is_better',
      },
      {
        key: 'forwardRevenueGrowth',
        direction: 'higher_is_better',
      },
      {
        key: 'forwardEpsGrowth',
        direction: 'higher_is_better',
      },
    ],
  },
  {
    key: 'quality',
    name: 'Quality',
    metrics: [
      {
        key: 'grossMargin',
        direction: 'higher_is_better',
      },
      {
        key: 'operatingMargin',
        direction: 'higher_is_better',
      },
      {
        key: 'netMargin',
        direction: 'higher_is_better',
      },
      {
        key: 'freeCashFlowMargin',
        direction: 'higher_is_better',
      },
      {
        key: 'roic',
        direction: 'higher_is_better',
      },
      {
        key: 'revenueToInvestedCapital',
        direction: 'higher_is_better',
      },
    ],
  },
  {
    key: 'financialHealth',
    name: 'Financial Health',
    metrics: [
      {
        key: 'currentRatio',
        direction: 'higher_is_better',
      },
      {
        key: 'interestCoverage',
        direction: 'higher_is_better',
      },
      {
        key: 'netDebtToEbitda',
        direction: 'lower_is_better',
      },
      {
        key: 'debtToEquity',
        direction: 'lower_is_better',
      },
      {
        key: 'debtGrowthYoY',
        direction: 'lower_is_better',
      },
    ],
  },
  {
    key: 'valuation',
    name: 'Valuation',
    metrics: [
      {
        key: 'pe',
        direction: 'lower_is_better',
      },
      {
        key: 'forwardPe',
        direction: 'lower_is_better',
      },
      {
        key: 'priceToSales',
        direction: 'lower_is_better',
      },
      {
        key: 'priceToBook',
        direction: 'lower_is_better',
      },
      {
        key: 'priceToFcf',
        direction: 'lower_is_better',
      },
      {
        key: 'evToEbitda',
        direction: 'lower_is_better',
      },
      {
        key: 'fcfYield',
        direction: 'higher_is_better',
      },
    ],
  },
  {
    key: 'momentum',
    name: 'Momentum',
    metrics: [
      {
        key: 'return3m',
        direction: 'higher_is_better',
      },
      {
        key: 'return6m',
        direction: 'higher_is_better',
      },
      {
        key: 'return12m',
        direction: 'higher_is_better',
      },
    ],
  },
];

const round = (
  value: number,
  decimals = 1,
): number => Number(value.toFixed(decimals));

function mode<T extends string>(
  values: T[],
): T | null {
  if (!values.length) {
    return null;
  }

  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(
      value,
      (counts.get(value) ?? 0) + 1,
    );
  }

  return (
    [...counts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] ?? null
  );
}

function calculateDimension(
  definition: DimensionDefinition,
  metrics: StockIntelligenceMetrics,
): PeerComparisonDimension {
  const comparisonMetrics: PeerComparisonMetric[] =
    [];

  for (const definitionMetric of definition.metrics) {
    const value =
      metrics[definitionMetric.key];

    const peer =
      metrics.peers?.analysisMetrics?.[
        definitionMetric.key
      ] ??
      metrics.peers?.metrics[
        definitionMetric.key
      ];

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !peer ||
      peer.count < 20
    ) {
      continue;
    }

    const standing =
      definitionMetric.direction ===
      'higher_is_better'
        ? peer.percentile
        : 1 - peer.percentile;

    comparisonMetrics.push({
      key: String(definitionMetric.key),
      value: round(value, 2),
      peerMedian: round(
        peer.median,
        2,
      ),
      rawPercentile: round(
        peer.percentile * 100,
      ),
      standingPercentile: round(
        standing * 100,
      ),
      peerCount: peer.count,
      group: peer.group,
      level: peer.level,
    });
  }

  const coverage = round(
    comparisonMetrics.length /
      definition.metrics.length,
    4,
  );

  const standingPercentile =
    comparisonMetrics.length
      ? round(
          comparisonMetrics.reduce(
            (total, metric) =>
              total +
              metric.standingPercentile,
            0,
          ) /
            comparisonMetrics.length,
        )
      : null;

  const peerCount =
    comparisonMetrics.length
      ? Math.min(
          ...comparisonMetrics.map(
            (metric) => metric.peerCount,
          ),
        )
      : null;

  const level = mode(
    comparisonMetrics.map(
      (metric) => metric.level,
    ),
  );

  const confidence =
    coverage >= 0.75 &&
    (peerCount ?? 0) >= 40
      ? 'high'
      : coverage >= 0.5 &&
          (peerCount ?? 0) >= 20
        ? 'medium'
        : 'low';

  return {
    key: definition.key,
    name: definition.name,
    standingPercentile,
    coverage,
    confidence,
    peerCount,
    level,
    metrics: comparisonMetrics,
  };
}

export function calculatePeerComparison(
  company: CompanyData,
  metrics: StockIntelligenceMetrics,
): PeerComparisonResult {
  const dimensions = Object.fromEntries(
    DIMENSIONS.map((definition) => [
      definition.key,
      calculateDimension(
        definition,
        metrics,
      ),
    ]),
  ) as Record<
    DimensionDefinition['key'],
    PeerComparisonDimension
  >;

  return {
    industry: company.industry,
    sector: company.sector,
    dimensions,
  };
}