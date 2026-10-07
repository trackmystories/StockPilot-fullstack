import type {FmpFinancialStatements} from '../../fmp/services/fmp-financial.service';
import type {FinancialMetrics} from '../calculators/financial-metrics.calculator';

export type StockIntelligenceInput = {
  symbol: string;
  financials: FmpFinancialStatements;
  metrics: FinancialMetrics;
};
