import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import type {FmpFinancialMetrics} from '../../stocks/useFmpFinancialMetrics';

import {financialMetricDefinitions} from '../domain/financialMetricDefinitions';

import {MetricInfoRow} from './MetricInfoRow';

type Props = {
  metrics: FmpFinancialMetrics | null;

  loading: boolean;

  error: string | null;
};

type ValueTone = 'positive' | 'negative' | 'neutral' | 'unavailable';

const formatPercentage = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const formatNumber = (value: number | null, decimals = 2) => {
  if (value === null) {
    return 'N/A';
  }

  return value.toFixed(decimals);
};

const formatCurrency = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  const absoluteValue = Math.abs(value);

  let formatted: string;

  if (absoluteValue >= 1_000_000_000) {
    formatted = `$${(absoluteValue / 1_000_000_000).toFixed(2)}B`;
  } else if (absoluteValue >= 1_000_000) {
    formatted = `$${(absoluteValue / 1_000_000).toFixed(2)}M`;
  } else if (absoluteValue >= 1_000) {
    formatted = `$${(absoluteValue / 1_000).toFixed(2)}K`;
  } else {
    formatted = `$${absoluteValue.toFixed(2)}`;
  }

  return value < 0 ? `-${formatted}` : formatted;
};

const formatMultiple = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return `${value.toFixed(2)}x`;
};

const getValueTone = (value: number | null): ValueTone => {
  if (value === null) {
    return 'unavailable';
  }

  if (value < 0) {
    return 'negative';
  }

  if (value > 0) {
    return 'positive';
  }

  return 'neutral';
};

function SectionTitle({children}: {children: string}) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function FinancialMetricsCard({metrics, loading, error}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Financial KPIs</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" />

          <Text style={styles.loadingText}>Loading financial metrics…</Text>
        </View>
      ) : null}

      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && metrics ? (
        <>
          <SectionTitle>Growth</SectionTitle>

          <MetricInfoRow
            label="Revenue Growth (YoY)"
            value={formatPercentage(metrics.growth.revenueGrowthYoY)}
            tone={getValueTone(metrics.growth.revenueGrowthYoY)}
            description={financialMetricDefinitions.revenueGrowthYoY}
          />

          <MetricInfoRow
            label="TTM Revenue Growth"
            value={formatPercentage(metrics.growth.revenueGrowthTtm)}
            tone={getValueTone(metrics.growth.revenueGrowthTtm)}
            description={financialMetricDefinitions.revenueGrowthTtm}
          />

          <MetricInfoRow
            label="Growth Acceleration"
            value={formatPercentage(metrics.growth.revenueAcceleration)}
            tone={getValueTone(metrics.growth.revenueAcceleration)}
            description={financialMetricDefinitions.growthAcceleration}
          />

          <SectionTitle>Profitability</SectionTitle>

          <MetricInfoRow
            label="Operating Margin (TTM)"
            value={formatPercentage(metrics.profitability.operatingMarginTtm)}
            tone={getValueTone(metrics.profitability.operatingMarginTtm)}
            description={financialMetricDefinitions.operatingMarginTtm}
          />

          <SectionTitle>Cash Flow</SectionTitle>

          <MetricInfoRow
            label="Free Cash Flow (TTM)"
            value={formatCurrency(metrics.cashFlow.freeCashFlowTtm)}
            tone={getValueTone(metrics.cashFlow.freeCashFlowTtm)}
            description={financialMetricDefinitions.freeCashFlowTtm}
          />

          <MetricInfoRow
            label="FCF Margin"
            value={formatPercentage(metrics.cashFlow.freeCashFlowMargin)}
            tone={getValueTone(metrics.cashFlow.freeCashFlowMargin)}
            description={financialMetricDefinitions.freeCashFlowMargin}
          />

          <SectionTitle>Financial Health</SectionTitle>

          <MetricInfoRow
            label="Net Debt"
            value={formatCurrency(metrics.balanceSheet.netDebt)}
            tone={getValueTone(metrics.balanceSheet.netDebt)}
            description={financialMetricDefinitions.netDebt}
          />

          <MetricInfoRow
            label="Current Ratio"
            value={formatNumber(metrics.balanceSheet.currentRatio)}
            tone={getValueTone(metrics.balanceSheet.currentRatio)}
            description={financialMetricDefinitions.currentRatio}
          />

          <MetricInfoRow
            label="Interest Coverage"
            value={formatMultiple(metrics.balanceSheet.interestCoverage)}
            tone={getValueTone(metrics.balanceSheet.interestCoverage)}
            description={financialMetricDefinitions.interestCoverage}
          />

          <MetricInfoRow
            label="Net Debt / EBITDA"
            value={formatMultiple(metrics.balanceSheet.netDebtToEbitda)}
            tone={getValueTone(metrics.balanceSheet.netDebtToEbitda)}
            description={financialMetricDefinitions.netDebtToEbitda}
          />

          <SectionTitle>Shareholder Metrics</SectionTitle>

          <MetricInfoRow
            label="Diluted Share Growth (YoY)"
            value={formatPercentage(metrics.dilution.dilutedShareGrowthYoY)}
            tone={getValueTone(metrics.dilution.dilutedShareGrowthYoY)}
            description={financialMetricDefinitions.dilutedShareGrowthYoY}
          />

          <MetricInfoRow
            label="Diluted EPS (TTM)"
            value={
              metrics.dilution.epsDilutedTtm === null
                ? 'N/A'
                : `$${metrics.dilution.epsDilutedTtm.toFixed(2)}`
            }
            tone={getValueTone(metrics.dilution.epsDilutedTtm)}
            description={financialMetricDefinitions.epsDilutedTtm}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EFEC',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#142947',
  },

  source: {
    marginTop: 4,
    fontSize: 12,
    color: '#7788A3',
  },

  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },

  loadingText: {
    fontSize: 13,
    color: '#667792',
  },

  error: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B54747',
  },

  sectionTitle: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#142947',
  },
});
