import type {
  StockIntelligence,
  StockIntelligenceMetrics,
} from '../types';
import type {EarningsOutlookResult} from './earnings-outlook.calculator';
import type {FairValueResult} from './fair-value.calculator';
import type {PeerComparisonResult} from './peer-comparison.calculator';

export type InvestmentCaseItem = {
  key: string;
  title: string;
  evidence: string;
  source:
    | 'scorecard'
    | 'earnings-outlook'
    | 'fair-value'
    | 'peer-comparison'
    | 'data-quality';
  importance: number;
};

export type InvestmentCaseResult = {
  coverage: number;
  confidence: 'low' | 'medium' | 'high';
  strengths: InvestmentCaseItem[];
  watch: InvestmentCaseItem[];
  risks: InvestmentCaseItem[];
};

type Input = {
  scorecard: StockIntelligence;
  metrics: StockIntelligenceMetrics;
  fairValue: FairValueResult;
  earningsOutlook: EarningsOutlookResult;
  peerComparison: PeerComparisonResult;
};

const round = (
  value: number,
  decimals = 1,
): number => Number(value.toFixed(decimals));

export function calculateInvestmentCase({
  scorecard,
  metrics,
  fairValue,
  earningsOutlook,
  peerComparison,
}: Input): InvestmentCaseResult {
  const strengths: InvestmentCaseItem[] = [];
  const watch: InvestmentCaseItem[] = [];
  const risks: InvestmentCaseItem[] = [];

  const addScoreSignal = (
    key: keyof StockIntelligence['scores'],
    name: string,
    highTarget: 'strength' | 'risk',
    highThreshold = 8,
    lowThreshold = 4,
  ): void => {
    const result =
      scorecard.scores[key];

    if (
      result.score === null ||
      result.eligible === false ||
      result.coverage < 0.75
    ) {
      return;
    }

    const score = round(result.score);

    if (score >= highThreshold) {
      const item: InvestmentCaseItem = {
        key: `${String(key)}-high`,
        title:
          highTarget === 'strength'
            ? `Strong ${name.toLowerCase()}`
            : `Elevated ${name.toLowerCase()}`,
        evidence: `${name} score is ${score}/10.`,
        source: 'scorecard',
        importance: 50 + score * 5,
      };

      (
        highTarget === 'strength'
          ? strengths
          : risks
      ).push(item);

      return;
    }

    if (score <= lowThreshold) {
      const item: InvestmentCaseItem = {
        key: `${String(key)}-low`,
        title:
          highTarget === 'strength'
            ? `Weak ${name.toLowerCase()}`
            : `Low ${name.toLowerCase()}`,
        evidence: `${name} score is ${score}/10.`,
        source: 'scorecard',
        importance:
          50 + (10 - score) * 5,
      };

      (
        highTarget === 'strength'
          ? risks
          : strengths
      ).push(item);
    }
  };

  addScoreSignal(
    'quality',
    'Quality',
    'strength',
  );

  addScoreSignal(
    'growth',
    'Growth',
    'strength',
  );

  addScoreSignal(
    'financialHealth',
    'Financial health',
    'strength',
  );

  addScoreSignal(
    'valuation',
    'Valuation',
    'strength',
  );

  addScoreSignal(
    'risk',
    'Risk',
    'risk',
    7,
    3,
  );

  addScoreSignal(
    'volatility',
    'Volatility',
    'risk',
    7,
    3,
  );

  if (earningsOutlook.eligible) {
    if (
      earningsOutlook.status ===
      'improving'
    ) {
      strengths.push({
        key: 'earnings-outlook-improving',
        title:
          'Earnings outlook is improving',
        evidence: `Earnings outlook score is ${earningsOutlook.score}/100 across ${Math.round(
          earningsOutlook.coverage * 100,
        )}% of the available signals.`,
        source: 'earnings-outlook',
        importance: 82,
      });
    } else if (
      earningsOutlook.status ===
      'weakening'
    ) {
      risks.push({
        key: 'earnings-outlook-weakening',
        title:
          'Earnings outlook is weakening',
        evidence: `Earnings outlook score is ${earningsOutlook.score}/100 across ${Math.round(
          earningsOutlook.coverage * 100,
        )}% of the available signals.`,
        source: 'earnings-outlook',
        importance: 82,
      });
    } else if (
      earningsOutlook.status === 'mixed'
    ) {
      watch.push({
        key: 'earnings-outlook-mixed',
        title:
          'Earnings signals are mixed',
        evidence:
          'Forward growth and estimate revisions are pointing in different directions.',
        source: 'earnings-outlook',
        importance: 72,
      });
    }
  }

  if (
    fairValue.eligible &&
    fairValue.differencePercent !== null &&
    fairValue.estimatedFairValue !== null
  ) {
    const gap =
      fairValue.differencePercent;

    if (gap >= 15) {
      strengths.push({
        key: 'fair-value-below-reference',
        title:
          'Price is below the model reference',
        evidence: `The blended valuation reference is ${round(
          gap,
        )}% above the current price using ${fairValue.methods.length} methods.`,
        source: 'fair-value',
        importance: Math.min(
          85,
          60 + Math.abs(gap),
        ),
      });
    } else if (gap <= -15) {
      watch.push({
        key: 'fair-value-above-reference',
        title:
          'Price is above the model reference',
        evidence: `The blended valuation reference is ${round(
          Math.abs(gap),
        )}% below the current price using ${fairValue.methods.length} methods.`,
        source: 'fair-value',
        importance: Math.min(
          85,
          60 + Math.abs(gap),
        ),
      });
    }
  }

  const comparableDimensions =
    Object.values(
      peerComparison.dimensions,
    ).filter(
      (dimension) =>
        dimension.standingPercentile !==
          null &&
        dimension.coverage >= 0.5,
    );

  const strongestPeerDimension = [
    ...comparableDimensions,
  ].sort(
    (a, b) =>
      (b.standingPercentile ?? 0) -
      (a.standingPercentile ?? 0),
  )[0];

  const weakestPeerDimension = [
    ...comparableDimensions,
  ].sort(
    (a, b) =>
      (a.standingPercentile ?? 100) -
      (b.standingPercentile ?? 100),
  )[0];

  if (
    (strongestPeerDimension?.standingPercentile ??
      0) >= 80
  ) {
    strengths.push({
      key: `peer-${strongestPeerDimension.key}-strong`,
      title: `${strongestPeerDimension.name} compares well with peers`,
      evidence: `${strongestPeerDimension.name} ranks around the ${round(
        strongestPeerDimension.standingPercentile!,
      )}th percentile on the available peer metrics.`,
      source: 'peer-comparison',
      importance: 70,
    });
  }

  if (
    (weakestPeerDimension?.standingPercentile ??
      100) <= 20
  ) {
    risks.push({
      key: `peer-${weakestPeerDimension.key}-weak`,
      title: `${weakestPeerDimension.name} trails peers`,
      evidence: `${weakestPeerDimension.name} ranks around the ${round(
        weakestPeerDimension.standingPercentile!,
      )}th percentile on the available peer metrics.`,
      source: 'peer-comparison',
      importance: 70,
    });
  }

  for (
    const warning of
      metrics.dataQuality?.warnings ?? []
  ) {
    if (
      warning ===
      'valuation_currency_unverified'
    ) {
      watch.push({
        key: 'valuation-currency-unverified',
        title:
          'Valuation currency needs verification',
        evidence:
          'Price and reported financial-statement currencies could not be confirmed as comparable.',
        source: 'data-quality',
        importance: 95,
      });
    }
  }

  const coreScores = [
    scorecard.scores.quality,
    scorecard.scores.growth,
    scorecard.scores.valuation,
    scorecard.scores.financialHealth,
    scorecard.scores.risk,
    scorecard.scores.volatility,
  ];

  const scoreCoverage =
    coreScores.reduce(
      (total, result) =>
        total + result.coverage,
      0,
    ) / coreScores.length;

  const peerCoverage =
    comparableDimensions.length
      ? comparableDimensions.reduce(
          (total, dimension) =>
            total + dimension.coverage,
          0,
        ) / comparableDimensions.length
      : 0;

  const coverage = round(
    scoreCoverage * 0.55 +
      earningsOutlook.coverage * 0.2 +
      fairValue.coverage * 0.15 +
      peerCoverage * 0.1,
    4,
  );

  const confidence =
    coverage >= 0.85
      ? 'high'
      : coverage >= 0.65
        ? 'medium'
        : 'low';

  const byImportance = (
    a: InvestmentCaseItem,
    b: InvestmentCaseItem,
  ): number =>
    b.importance - a.importance;

  return {
    coverage,
    confidence,
    strengths: strengths
      .sort(byImportance)
      .slice(0, 4),
    watch: watch
      .sort(byImportance)
      .slice(0, 3),
    risks: risks
      .sort(byImportance)
      .slice(0, 4),
  };
}