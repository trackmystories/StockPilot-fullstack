import {scoreByThresholds} from '../scoring';
import type {EstimatesData} from './calculator.type';

export type EarningsOutlookComponent = {
  value: number | null;
  score: number | null;
  weight: number;
};

export type EarningsOutlookResult = {
  status:
    | 'improving'
    | 'stable'
    | 'mixed'
    | 'weakening'
    | 'insufficient-data';
  score: number | null;
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  eligible: boolean;
  analystCount: number | null;
  revisionPeriodDays: number | null;
  currentPeriod: string | null;
  nextPeriod: string | null;
  eps: {
    currentEstimate: number | null;
    nextEstimate: number | null;
    forwardGrowthPercent: number | null;
    revisionPercent: number | null;
  };
  revenue: {
    currentEstimate: number | null;
    nextEstimate: number | null;
    forwardGrowthPercent: number | null;
    revisionPercent: number | null;
  };
  components: Record<
    string,
    EarningsOutlookComponent
  >;
};

const round = (
  value: number,
  decimals = 2,
): number => Number(value.toFixed(decimals));

const finite = (
  value: number | null | undefined,
): number | null =>
  typeof value === 'number' &&
  Number.isFinite(value)
    ? value
    : null;

export function calculateEarningsOutlook(
  estimates: EstimatesData | null,
): EarningsOutlookResult {
  const epsRevision = finite(
    estimates?.epsRevision,
  );

  const revenueRevision = finite(
    estimates?.revenueRevision,
  );

  const epsGrowth = finite(
    estimates?.epsGrowth,
  );

  const revenueGrowth = finite(
    estimates?.revenueGrowth,
  );

  const inputs = [
    {
      key: 'epsRevision',
      value: epsRevision,
      score: scoreByThresholds(
        epsRevision,
        [
          {value: -15, score: 1},
          {value: -5, score: 3},
          {value: 0, score: 5},
          {value: 5, score: 7.5},
          {value: 15, score: 10},
        ],
      ),
      weight: 0.35,
    },
    {
      key: 'revenueRevision',
      value: revenueRevision,
      score: scoreByThresholds(
        revenueRevision,
        [
          {value: -10, score: 1},
          {value: -3, score: 3},
          {value: 0, score: 5},
          {value: 3, score: 7.5},
          {value: 10, score: 10},
        ],
      ),
      weight: 0.25,
    },
    {
      key: 'forwardEpsGrowth',
      value:
        epsGrowth === null
          ? null
          : epsGrowth * 100,
      score: scoreByThresholds(
        epsGrowth === null
          ? null
          : epsGrowth * 100,
        [
          {value: -25, score: 1},
          {value: 0, score: 4},
          {value: 10, score: 6},
          {value: 25, score: 8},
          {value: 50, score: 10},
        ],
      ),
      weight: 0.2,
    },
    {
      key: 'forwardRevenueGrowth',
      value:
        revenueGrowth === null
          ? null
          : revenueGrowth * 100,
      score: scoreByThresholds(
        revenueGrowth === null
          ? null
          : revenueGrowth * 100,
        [
          {value: -20, score: 1},
          {value: 0, score: 4},
          {value: 10, score: 6},
          {value: 25, score: 8},
          {value: 50, score: 10},
        ],
      ),
      weight: 0.2,
    },
  ];

  const available = inputs.filter(
    (input) => input.score !== null,
  );

  const availableWeight = available.reduce(
    (total, input) =>
      total + input.weight,
    0,
  );

  const coverage = round(
    availableWeight,
    4,
  );

  const score =
    availableWeight >= 0.4
      ? round(
          (available.reduce(
            (total, input) =>
              total +
              (input.score as number) *
                input.weight,
            0,
          ) /
            availableWeight) *
            10,
          1,
        )
      : null;

  const componentScores = available.map(
    (input) => input.score as number,
  );

  const mixed =
    componentScores.some(
      (value) => value >= 7,
    ) &&
    componentScores.some(
      (value) => value <= 4,
    );

  const status =
    score === null
      ? 'insufficient-data'
      : mixed
        ? 'mixed'
        : score >= 70
          ? 'improving'
          : score <= 40
            ? 'weakening'
            : 'stable';

  const analystCount = finite(
    estimates?.analystCount,
  );

  const confidence =
    coverage >= 0.9 &&
    (analystCount ?? 0) >= 10
      ? 'high'
      : coverage >= 0.65 &&
          (analystCount ?? 0) >= 5
        ? 'medium'
        : 'low';

  return {
    status,
    score,
    coverage,
    confidence,
    eligible:
      score !== null &&
      coverage >= 0.4 &&
      (analystCount ?? 0) >= 3,
    analystCount,
    revisionPeriodDays: finite(
      estimates?.revisionDays,
    ),
    currentPeriod:
      estimates?.currentPeriod ?? null,
    nextPeriod:
      estimates?.nextPeriod ?? null,
    eps: {
      currentEstimate: finite(
        estimates?.currentEps,
      ),
      nextEstimate: finite(
        estimates?.nextEps,
      ),
      forwardGrowthPercent:
        epsGrowth === null
          ? null
          : round(epsGrowth * 100, 1),
      revisionPercent:
        epsRevision === null
          ? null
          : round(epsRevision, 1),
    },
    revenue: {
      currentEstimate: finite(
        estimates?.currentRevenue,
      ),
      nextEstimate: finite(
        estimates?.nextRevenue,
      ),
      forwardGrowthPercent:
        revenueGrowth === null
          ? null
          : round(
              revenueGrowth * 100,
              1,
            ),
      revisionPercent:
        revenueRevision === null
          ? null
          : round(
              revenueRevision,
              1,
            ),
    },
    components: Object.fromEntries(
      inputs.map((input) => [
        input.key,
        {
          value:
            input.value === null
              ? null
              : round(input.value, 2),
          score:
            input.score === null
              ? null
              : round(
                  input.score * 10,
                  1,
                ),
          weight: input.weight,
        },
      ]),
    ),
  };
}