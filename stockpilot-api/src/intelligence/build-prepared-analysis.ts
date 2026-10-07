import type {FmpThesisData} from '../fmp/services/fmp-thesis-data.service';
import {calculateBullBearCase} from './calculators/bull-bear-case.calculator';
import type {CompanyData, EstimatesData} from './calculators/calculator.type';
import {calculateEarningsOutlook} from './calculators/earnings-outlook.calculator';
import {calculateFairValue} from './calculators/fair-value.calculator';
import {calculateFinancialMetrics} from './calculators/financial-metrics.calculator';
import {calculateInvestmentCase} from './calculators/investment-case.calculator';
import {calculateInvestmentThesis} from './calculators/investment-thesis.calculator';
import {calculateInvestorSignals} from './calculators/investor-signals.calculator';
import {calculatePeerComparison} from './calculators/peer-comparison.calculator';
import type {
  FmpFinancialStatements,
  StockIntelligence,
  StockIntelligenceMetrics,
} from './types';

type Input = {
  symbol: string;
  company: CompanyData;
  financials: FmpFinancialStatements;
  metrics: StockIntelligenceMetrics;
  estimates: EstimatesData | null;
  thesisData: FmpThesisData;
  scorecard: StockIntelligence;
};

export function buildPreparedAnalysis({
  symbol,
  company,
  financials,
  metrics,
  estimates,
  thesisData,
  scorecard,
}: Input) {
  const financialMetrics = calculateFinancialMetrics(financials, metrics);
  const investorSignals = calculateInvestorSignals(financials, metrics);
  const fairValue = calculateFairValue({
    currentPrice: metrics.price,
    metrics,
    thesisData,
  });
  const earningsOutlook = calculateEarningsOutlook(estimates);
  const peerComparison = calculatePeerComparison(company, metrics);

  return {
    symbol,
    metrics: financialMetrics,
    investorSignals,
    bullBearCase: calculateBullBearCase({
      metrics: financialMetrics,
      investorSignals,
    }),
    investmentThesis: calculateInvestmentThesis({
      symbol,
      currentPrice: metrics.price,
      metrics: financialMetrics,
      investorSignals,
      thesisData,
    }),
    fairValue,
    earningsOutlook,
    peerComparison,
    investmentCase: calculateInvestmentCase({
      scorecard,
      metrics,
      fairValue,
      earningsOutlook,
      peerComparison,
    }),
  };
}