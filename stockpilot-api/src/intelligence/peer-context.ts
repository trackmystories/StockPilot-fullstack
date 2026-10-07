import type {CompanyData} from './calculators/calculator.type';
import type {
  PeerContext,
  PeerMetric,
  StockIntelligenceMetrics,
} from './types';

export type PeerStock = {
  symbol: string;
  company: CompanyData;
  metrics: StockIntelligenceMetrics;
};

const SCORE_KEYS: (
  keyof StockIntelligenceMetrics
)[] = [
  'revenueGrowthYoY',
  'revenueGrowthTtm',
  'revenueCagr3Y',
  'epsGrowthYoY',
  'grossMargin',
  'operatingMargin',
  'netMargin',
  'freeCashFlowMargin',
  'roic',
  'revenueToInvestedCapital',
  'capexIntensity',
  'pe',
  'forwardPe',
  'priceToSales',
  'priceToBook',
  'priceToFcf',
  'evToEbitda',
  'fcfYield',
  'return3m',
  'return6m',
  'return12m',
];

const ANALYSIS_KEYS: (
  keyof StockIntelligenceMetrics
)[] = [
  ...SCORE_KEYS,
  'revenueAcceleration',
  'epsCagr3Y',
  'forwardRevenueGrowth',
  'forwardEpsGrowth',
  'currentRatio',
  'interestCoverage',
  'netDebtToEbitda',
  'debtToEquity',
  'debtGrowthYoY',
  'cashToShortTermDebt',
  'dilutedShareGrowthYoY',
  'stockBasedCompensationToRevenue',
];

const SCORE_KEY_SET = new Set<
  keyof StockIntelligenceMetrics
>(SCORE_KEYS);

const ALL_KEYS = [
  ...new Set<
    keyof StockIntelligenceMetrics
  >(ANALYSIS_KEYS),
];

const groupName = (
  company: CompanyData,
  level: 'industry' | 'sector',
): string | null => {
  const value =
    company[level]
      ?.trim()
      .toLowerCase();

  if (!value) {
    return null;
  }

  return `${level}:${
    level === 'industry'
      ? `${(
          company.sector ?? ''
        )
          .trim()
          .toLowerCase()}:`
      : ''
  }${value}`;
};

const bound = (
  values: number[],
  target: number,
  upper: boolean,
): number => {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle =
      (low + high) >>> 1;

    if (
      values[middle] < target ||
      (upper &&
        values[middle] === target)
    ) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
};

const quantileExcludingTarget = (
  values: number[],
  target: number,
  quantile: number,
): number => {
  const removeIndex = bound(
    values,
    target,
    false,
  );

  const count =
    values.length - 1;

  if (count <= 0) {
    return target;
  }

  const valueAt = (
    index: number,
  ): number =>
    values[
      index < removeIndex
        ? index
        : index + 1
    ];

  const position =
    Math.min(
      1,
      Math.max(0, quantile),
    ) *
    (count - 1);

  const lowerIndex =
    Math.floor(position);

  const upperIndex =
    Math.ceil(position);

  const lowerValue =
    valueAt(lowerIndex);

  const upperValue =
    valueAt(upperIndex);

  if (
    lowerIndex === upperIndex
  ) {
    return lowerValue;
  }

  return (
    lowerValue +
    (upperValue - lowerValue) *
      (position - lowerIndex)
  );
};

const valid = (
  stock: PeerStock,
  key: keyof StockIntelligenceMetrics,
): boolean => {
  const priceBased =
    String(key).startsWith('return');

  const age = priceBased
    ? stock.metrics.dataQuality
        ?.priceAgeDays
    : stock.metrics.dataQuality
        ?.statementAgeDays;

  return (
    age !== null &&
    age !== undefined &&
    age <=
      (priceBased ? 10 : 200)
  );
};

function buildMetric(
  stock: PeerStock,
  key: keyof StockIntelligenceMetrics,
  groups: Map<
    string,
    Map<
      keyof StockIntelligenceMetrics,
      number[]
    >
  >,
): PeerMetric | null {
  const value =
    stock.metrics[key];

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !valid(stock, key)
  ) {
    return null;
  }

  for (
    const level of [
      'industry',
      'sector',
    ] as const
  ) {
    const group = groupName(
      stock.company,
      level,
    );

    const values = group
      ? groups
          .get(group)
          ?.get(key)
      : undefined;

    if (
      !group ||
      !values ||
      values.length < 21
    ) {
      continue;
    }

    const count =
      values.length - 1;

    const less = bound(
      values,
      value,
      false,
    );

    const equalOthers =
      bound(values, value, true) -
      less -
      1;

    return {
      percentile:
        (less +
          equalOthers / 2) /
        count,
      count,
      group,
      level,
      q25: quantileExcludingTarget(
        values,
        value,
        0.25,
      ),
      median:
        quantileExcludingTarget(
          values,
          value,
          0.5,
        ),
      q75: quantileExcludingTarget(
        values,
        value,
        0.75,
      ),
    };
  }

  return null;
}

export function buildPeerContexts(
  stocks: PeerStock[],
): Map<string, PeerContext> {
  const groups = new Map<
    string,
    Map<
      keyof StockIntelligenceMetrics,
      number[]
    >
  >();

  for (const stock of stocks) {
    for (
      const level of [
        'industry',
        'sector',
      ] as const
    ) {
      const name = groupName(
        stock.company,
        level,
      );

      if (!name) {
        continue;
      }

      let distribution =
        groups.get(name);

      if (!distribution) {
        distribution = new Map();
        groups.set(
          name,
          distribution,
        );
      }

      for (
        const key of ALL_KEYS
      ) {
        const value =
          stock.metrics[key];

        if (
          typeof value !==
            'number' ||
          !Number.isFinite(value) ||
          !valid(stock, key)
        ) {
          continue;
        }

        const values =
          distribution.get(key) ??
          [];

        values.push(value);

        distribution.set(
          key,
          values,
        );
      }
    }
  }

  for (
    const distribution of
      groups.values()
  ) {
    for (
      const values of
        distribution.values()
    ) {
      values.sort(
        (a, b) => a - b,
      );
    }
  }

  return new Map(
    stocks.map((stock) => {
      const context: PeerContext = {
        metrics: {},
        analysisMetrics: {},
      };

      for (
        const key of ALL_KEYS
      ) {
        const metric = buildMetric(
          stock,
          key,
          groups,
        );

        if (!metric) {
          continue;
        }

        context.analysisMetrics![
          key
        ] = metric;

        if (
          SCORE_KEY_SET.has(key)
        ) {
          context.metrics[key] =
            metric;
        }
      }

      return [
        stock.symbol,
        context,
      ];
    }),
  );
}