import {enforceScorecardEvidence} from './scorecard-evidence';
import {calculateBalanceSheetResilienceScore} from './calculators/balance-sheet-resilience.calculator';
import {calculateBreakoutReadinessScore} from './calculators/breakout-readiness.calculator';
import {calculateBusinessEfficiencyScore} from './calculators/business-efficiency.calculator';
import {calculateCapitalDisciplineScore} from './calculators/capital-discipline.calculator';
import {calculateCapitalEfficiencyScore} from './calculators/capital-efficiency.calculator';
import {calculateCashPowerScore} from './calculators/cash-power.calculator';
import {calculateConvictionScore} from './calculators/conviction.calculator';
import {calculateDilutionRiskScore} from './calculators/dilution-risk.calculator';
import {calculateDilutionScore} from './calculators/dilution.calculator';
import {calculateEarningsQualityScore} from './calculators/earnings-quality.calculator';
import {calculateEarningsReliabilityScore} from './calculators/earnings-reliability.calculator';
import {calculateExecutionScore} from './calculators/execution.calculator';
import {calculateFinancialHealthScore} from './calculators/financial-health.calculator';
import {calculateFundamentalMomentumScore} from './calculators/fundamental-momentum.calculator';
import {calculateFundingPressureScore} from './calculators/funding-pressure.calculator';
import {calculateGrowthDurabilityScore} from './calculators/growth-durability.calculator';
import {calculateGrowthScore} from './calculators/growth.calculator';
import {calculateMarginPowerScore} from './calculators/margin-power.calculator';
import {calculateMomentumScore} from './calculators/momentum.calculator';
import {calculateOperatingLeverageScore} from './calculators/operating-leverage.calculator';
import {calculateQualityScore} from './calculators/quality.calculator';
import {calculateRecoveryScore} from './calculators/recovery.calculator';
import {calculateReratingPotentialScore} from './calculators/rerating-potential.calculator';
import {calculateSelfFundingScore} from './calculators/self-funding.calculator';
import {calculateShareholderFriendlinessScore} from './calculators/shareholder-friendliness.calculator';
import {calculateStrongBalanceSheet} from './calculators/strong-balance-sheet.calculator';
import {calculateSurvivalScore} from './calculators/survival.calculator';
import {calculateValuationCompressionRiskScore} from './calculators/valuation-compression-risk.calculator';
import {calculateValuationScore} from './calculators/valuation.calculator';
import {confidenceFromCoverage, calculateWeightedScore} from './scoring';
import type {
  FmpFinancialStatements,
  ScoreResult,
  StockIntelligence,
  StockIntelligenceMetrics,
} from './types';
function createRiskScore(score: number | null, coverage = 0): ScoreResult {
  const complete =
    typeof score === 'number' &&
    Number.isFinite(score) &&
    score >= 1 &&
    score <= 10 &&
    Number.isFinite(coverage) &&
    coverage >= 0.5;
  return {
    score: complete ? score : null,
    direction: 'higher_is_riskier',
    coverage: Number.isFinite(coverage) ? Math.min(1, Math.max(0, coverage)) : 0,
    confidence: complete
      ? coverage < 1 && coverage >= 0.9
        ? 'medium'
        : confidenceFromCoverage(coverage)
      : 'low',
    eligible: complete,
    reasons: complete
      ? coverage < 1
        ? ['partial_evidence_score']
        : []
      : ['insufficient_component_evidence'],
    components: {},
  };
}
export function calculateScorecard(
  symbol: string,
  metrics: StockIntelligenceMetrics,
  riskMetrics: {
    riskScore: number | null;
    riskCoverage?: number;
    volatilityCoverage?: number;
    volatilityScore: number | null;
  },
  financialStatements: FmpFinancialStatements,
): StockIntelligence {
  const quality = calculateQualityScore(metrics);
  const growth = calculateGrowthScore(metrics);
  const valuation = calculateValuationScore(metrics);
  const financialHealth = calculateFinancialHealthScore(metrics);
  const momentum = calculateMomentumScore(metrics);
  const earningsQuality = calculateEarningsQualityScore(metrics);
  const capitalEfficiency = calculateCapitalEfficiencyScore(metrics);
  const cashPower = calculateCashPowerScore(metrics);
  const fundingPressure = calculateFundingPressureScore(metrics);
  const dilutionRisk = calculateDilutionRiskScore(metrics);
  const growthDurability = calculateGrowthDurabilityScore(metrics);
  const marginPower = calculateMarginPowerScore(metrics);
  const capitalDiscipline = calculateCapitalDisciplineScore(metrics);
  const businessEfficiency = calculateBusinessEfficiencyScore(metrics);
  const fundamentalMomentum = calculateFundamentalMomentumScore(metrics);
  const operatingLeverage = calculateOperatingLeverageScore(metrics);
  const strongBalanceSheet = calculateStrongBalanceSheet(financialStatements, metrics);
  const risk = createRiskScore(riskMetrics.riskScore, riskMetrics.riskCoverage);
  const volatility = createRiskScore(riskMetrics.volatilityScore, riskMetrics.volatilityCoverage);
  const balanceSheetResilience = calculateBalanceSheetResilienceScore({
    financialHealth,
    cashPower,
    fundingPressure,
  });
  const earningsReliability = calculateEarningsReliabilityScore({
    earningsQuality,
    cashPower,
    marginPower,
  });
  const execution = calculateExecutionScore({
    fundamentalMomentum,
    cashPower,
    marginPower,
    financialHealth,
  });
  const selfFunding = calculateSelfFundingScore({
    cashPower,
    financialHealth,
    dilutionRisk,
    fundingPressure,
  });
  const survival = calculateSurvivalScore({
    financialHealth,
    cashPower,
    fundingPressure,
    dilutionRisk,
  });
  const dilution = calculateDilutionScore({dilutionRisk});
  const shareholderFriendliness = calculateShareholderFriendlinessScore({
    dilution,
    capitalDiscipline,
    financialHealth,
    cashPower,
  });
  const recovery = calculateRecoveryScore({metrics, fundamentalMomentum, financialHealth});
  const reratingPotential = calculateReratingPotentialScore({
    fundamentalMomentum,
    growthDurability,
    marginPower,
    valuation,
    recovery,
  });
  const valuationCompressionRisk = calculateValuationCompressionRiskScore({
    valuation,
    growth,
    marginPower,
    momentum,
  });
  const breakoutReadiness = calculateBreakoutReadinessScore({
    momentum,
    fundamentalMomentum,
    marginPower,
    growth,
  });
  const conviction = calculateConvictionScore({
    quality,
    growth,
    valuation,
    financialHealth,
    earningsQuality,
    capitalEfficiency,
    fundamentalMomentum,
  });
  const result: StockIntelligence = {
    symbol,
    generatedAt: new Date().toISOString(),
    scores: {
      overall: calculateWeightedScore([]),
      conviction,
      quality,
      growth,
      valuation,
      financialHealth,
      momentum,
      earningsQuality,
      capitalEfficiency,
      reratingPotential,
      execution,
      cashPower,
      fundingPressure,
      dilutionRisk,
      balanceSheetResilience,
      growthDurability,
      marginPower,
      capitalDiscipline,
      earningsReliability,
      businessEfficiency,
      valuationCompressionRisk,
      recovery,
      breakoutReadiness,
      fundamentalMomentum,
      survival,
      shareholderFriendliness,
      selfFunding,
      operatingLeverage,
      dilution,
      risk,
      volatility,
    },
    categories: {strongBalanceSheet},
    metrics,
  };
  const source = metrics.dataQuality;
  for (const [key, score] of Object.entries(result.scores)) {
    const priceOnly = key === 'momentum' || key === 'volatility';
    const age = priceOnly ? source?.priceAgeDays : source?.statementAgeDays;
    if (age == null || age > (priceOnly ? 10 : 200)) {
      score.score = null;
      score.confidence = 'low';
      score.eligible = false;
      score.reasons = [...(score.reasons ?? []), 'stale_or_missing_source_dates'];
    }
  }
  const checked = enforceScorecardEvidence(result);
  const pillars = ['quality', 'growth', 'financialHealth', 'valuation', 'momentum'] as const;
  const overall = calculateWeightedScore(
    pillars.map((name) => ({
      name,
      rawValue: checked.scores[name].score,
      score: checked.scores[name].score,
      coverage: checked.scores[name].coverage,
      sourceConfidence: checked.scores[name].confidence,
      weight: 0.2,
    })),
  );
  const usable = pillars.filter((name) => checked.scores[name].score !== null);
  if (
    usable.length < 3 ||
    !usable.includes('financialHealth') ||
    (!usable.includes('quality') && !usable.includes('growth'))
  ) {
    overall.score = null;
    overall.eligible = false;
    overall.reasons = [...(overall.reasons ?? []), 'insufficient_core_evidence'];
  }
  checked.scores.overall = overall;
  const facts = metrics.secSupplement?.facts ?? [];
  for (const key of ['financialHealth', 'fundingPressure', 'risk'] as const) {
    const applicable =
      key === 'fundingPressure'
        ? facts.some((fact) => fact.metric === 'currentRatio')
        : key === 'financialHealth'
          ? facts.some((fact) => fact.metric !== 'debtToEquity')
          : facts.some((fact) => fact.metric !== 'cashToShortTermDebt');
    if (applicable && checked.scores[key].score !== null) {
      checked.scores[key].reasons = [
        ...(checked.scores[key].reasons ?? []),
        'sec_supported_inputs',
      ];
    }
  }
  if (
    overall.score !== null &&
    checked.scores.financialHealth.reasons?.includes('sec_supported_inputs')
  ) {
    overall.reasons = [...(overall.reasons ?? []), 'sec_supported_inputs'];
  }
  return checked;
}
