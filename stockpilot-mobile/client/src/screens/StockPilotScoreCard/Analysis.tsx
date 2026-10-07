import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {StockChartRange} from '../stocks/useFmpStockChart';
import type {useFmpFinancialMetrics} from '../stocks/useFmpFinancialMetrics';
import type {useFmpStockChart} from '../stocks/useFmpStockChart';
import type {useFmpCompanyProfile} from '../stocks/useFmpCompanyProfile';
import {AnalysisReportChart} from './components/AnalysisReportCharts';
import {BullBearCard} from './components/BullBearCard';
import {CompanyProfileCard} from './components/CompanyProfileCard';
import {EarningsOutlookCard} from './components/EarningsOutlookCard';
import {FairValueCard} from './components/FairValueCard';
import {FinancialMetricsCard} from './components/FinancialMetricsCard';
import {InvestmentCaseCard} from './components/InvestmentCaseCard';
import {InvestmentThesisCard} from './components/InvestmentThesisCard';
import {InvestorSignals} from './components/InvestorSignals';
import {StockChartCard} from './components/StockChartCard';
import {useAnalysisReportCharts} from './hooks/useAnalysisReportCharts';

type Props = {
  symbol: string;
  token: string | null;
  onViewFullReport: () => void;
  chart: ReturnType<typeof useFmpStockChart>;
  chartRange: StockChartRange;
  onChartRangeChange: (range: StockChartRange) => void;
  financials: ReturnType<typeof useFmpFinancialMetrics>;
  companyProfile: ReturnType<typeof useFmpCompanyProfile>;
};

export default function Analysis({
  symbol,
  token,
  onViewFullReport,
  chart,
  chartRange,
  onChartRangeChange,
  financials,
  companyProfile,
}: Props) {
  const {charts: reportCharts} = useAnalysisReportCharts(
    symbol,
    token,
  );

  const chartOne = reportCharts[0];
  const chartTwo = reportCharts[1];
  const chartThree = reportCharts[2];
  const chartFour = reportCharts[3];

  return (
    <View style={styles.section}>
      <StockChartCard
        chart={chart.data}
        range={chartRange}
        loading={chart.loading}
        error={chart.error}
        onRangeChange={onChartRangeChange}
      />

      <FairValueCard data={financials.fairValue} />

      <AnalysisReportChart chart={chartOne} />

      <EarningsOutlookCard
        data={financials.earningsOutlook}
      />
      
      <AnalysisReportChart chart={chartTwo} />

      <InvestmentCaseCard
        data={financials.investmentCase}
      />

      <AnalysisReportChart chart={chartOne} />

      <BullBearCard
        bullCase={financials.bullBearCase?.bullCase ?? []}
        bearCase={financials.bullBearCase?.bearCase ?? []}
      />

      <AnalysisReportChart chart={chartFour} />

      <View style={styles.reportAction}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View full report for ${symbol}`}
          onPress={onViewFullReport}
          style={styles.reportButton}
        >
          <Text style={styles.reportButtonText}>
            View full report
          </Text>
        </Pressable>
      </View>

      <InvestmentThesisCard
        thesis={financials.investmentThesis}
        loading={financials.loading}
        error={financials.error}
      />

      <FinancialMetricsCard
        metrics={financials.metrics}
        loading={financials.loading}
        error={financials.error}
      />

      <InvestorSignals
        data={financials.investorSignals}
        loading={financials.loading}
        error={financials.error}
      />

      <CompanyProfileCard
        profile={companyProfile.profile}
        loading={companyProfile.loading}
        error={companyProfile.error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
  },

  reportAction: {
    marginTop: 4,
    marginBottom: 8,
  },

  reportButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  reportButtonText: {
    color: '#087758',
    fontSize: 12,
    fontWeight: '600',
  },
});