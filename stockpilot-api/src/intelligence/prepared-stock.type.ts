import type {FmpRiskDataService} from '../fmp/services/fmp-risk-data.service';
import type {FmpThesisData} from '../fmp/services/fmp-thesis-data.service';
import type {calculateBullBearCase} from './calculators/bull-bear-case.calculator';
import type {IntelligenceCalculatorInput} from './calculators/calculator.type';
import type {calculateFinancialMetrics} from './calculators/financial-metrics.calculator';
import type {calculateInvestmentThesis} from './calculators/investment-thesis.calculator';
import type {calculateInvestorSignals} from './calculators/investor-signals.calculator';
export type PreparedInput = IntelligenceCalculatorInput & {
  calculationVersion: number;
  preparedAt: string;
  sourceObservations?: {
    quote: Record<string, unknown>;
    profile: Record<string, unknown>;
    history: Record<string, unknown>[];
    observedAt: string;
  };
  risk: Awaited<ReturnType<FmpRiskDataService['getStockRiskMetrics']>>;
  thesisData: FmpThesisData;
};
export type PreparedAnalysis = {
  symbol: string;
  metrics: ReturnType<typeof calculateFinancialMetrics>;
  investorSignals: ReturnType<typeof calculateInvestorSignals>;
  bullBearCase: ReturnType<typeof calculateBullBearCase>;
  investmentThesis: ReturnType<typeof calculateInvestmentThesis>;
};

