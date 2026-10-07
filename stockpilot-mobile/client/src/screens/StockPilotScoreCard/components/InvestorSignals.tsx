import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import type {InvestorSignals as InvestorSignalsData} from '../../stocks/useFmpFinancialMetrics';

import {investorSignalDefinitions} from '../domain/investorSignalDefinitions';

import {MetricInfoRow} from './MetricInfoRow';

type Props = {
  data: InvestorSignalsData | null;

  loading: boolean;

  error: string | null;
};

type ValueTone = 'positive' | 'negative' | 'neutral' | 'unavailable';

const formatPercentage = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  const prefix = value > 0 ? '+' : '';

  return `${prefix}${value.toFixed(1)}%`;
};

const formatRatio = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return `${value.toFixed(2)}x`;
};

const formatCurrency = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  const absolute = Math.abs(value);

  let formatted: string;

  if (absolute >= 1_000_000_000) {
    formatted = `$${(absolute / 1_000_000_000).toFixed(2)}B`;
  } else if (absolute >= 1_000_000) {
    formatted = `$${(absolute / 1_000_000).toFixed(1)}M`;
  } else if (absolute >= 1_000) {
    formatted = `$${(absolute / 1_000).toFixed(1)}K`;
  } else {
    formatted = `$${absolute.toFixed(2)}`;
  }

  return value < 0 ? `-${formatted}` : formatted;
};

const formatQuarters = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return `${value.toFixed(1)} quarters`;
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

export function InvestorSignals({data, loading, error}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Investor Signals</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" />

          <Text style={styles.loadingText}>Calculating investor signals…</Text>
        </View>
      ) : null}

      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && data ? (
        <>
          <SectionTitle>Earnings Quality</SectionTitle>

          <MetricInfoRow
            label="Cash Conversion"
            value={formatRatio(data.earningsQuality.cashConversionTtm)}
            tone={getValueTone(data.earningsQuality.cashConversionTtm)}
            description={investorSignalDefinitions.cashConversion}
          />

          <MetricInfoRow
            label="Accrual Ratio"
            value={formatPercentage(data.earningsQuality.accrualRatioTtm)}
            tone={getValueTone(data.earningsQuality.accrualRatioTtm)}
            description={investorSignalDefinitions.accrualRatio}
          />

          <MetricInfoRow
            label="FCF Conversion"
            value={formatRatio(data.earningsQuality.fcfConversionTtm)}
            tone={getValueTone(data.earningsQuality.fcfConversionTtm)}
            description={investorSignalDefinitions.fcfConversion}
          />

          <MetricInfoRow
            label="Operating Margin Change"
            value={formatPercentage(data.earningsQuality.operatingMarginChangeYoY)}
            tone={getValueTone(data.earningsQuality.operatingMarginChangeYoY)}
            description={investorSignalDefinitions.operatingMarginChange}
          />

          <SectionTitle>Capital Efficiency</SectionTitle>

          <MetricInfoRow
            label="ROIC"
            value={formatPercentage(data.capitalEfficiency.roicTtm)}
            tone={getValueTone(data.capitalEfficiency.roicTtm)}
            description={investorSignalDefinitions.roic}
          />

          <MetricInfoRow
            label="Incremental ROIC"
            value={formatPercentage(data.capitalEfficiency.incrementalRoicYoY)}
            tone={getValueTone(data.capitalEfficiency.incrementalRoicYoY)}
            description={investorSignalDefinitions.incrementalRoic}
          />

          <MetricInfoRow
            label="Capex Intensity"
            value={formatPercentage(data.capitalEfficiency.capexIntensityTtm)}
            tone={getValueTone(data.capitalEfficiency.capexIntensityTtm)}
            description={investorSignalDefinitions.capexIntensity}
          />

          <MetricInfoRow
            label="Revenue / Invested Capital"
            value={formatRatio(data.capitalEfficiency.revenueToInvestedCapital)}
            tone={getValueTone(data.capitalEfficiency.revenueToInvestedCapital)}
            description={investorSignalDefinitions.revenueToInvestedCapital}
          />

          <SectionTitle>Growth Momentum</SectionTitle>

          <MetricInfoRow
            label="Revenue Growth (YoY)"
            value={formatPercentage(data.growthMomentum.revenueGrowthYoY)}
            tone={getValueTone(data.growthMomentum.revenueGrowthYoY)}
            description={investorSignalDefinitions.revenueGrowthYoY}
          />

          <MetricInfoRow
            label="TTM Revenue Growth"
            value={formatPercentage(data.growthMomentum.revenueGrowthTtm)}
            tone={getValueTone(data.growthMomentum.revenueGrowthTtm)}
            description={investorSignalDefinitions.revenueGrowthTtm}
          />

          <MetricInfoRow
            label="Revenue Acceleration"
            value={formatPercentage(data.growthMomentum.revenueAcceleration)}
            tone={getValueTone(data.growthMomentum.revenueAcceleration)}
            description={investorSignalDefinitions.revenueAcceleration}
          />

          <MetricInfoRow
            label="Operating Margin Change"
            value={formatPercentage(data.growthMomentum.operatingMarginChangeYoY)}
            tone={getValueTone(data.growthMomentum.operatingMarginChangeYoY)}
            description={investorSignalDefinitions.operatingMarginChange}
          />

          <SectionTitle>Funding Risk</SectionTitle>

          <MetricInfoRow
            label="Cash Runway"
            value={formatQuarters(data.fundingRisk.cashRunwayQuarters)}
            tone={getValueTone(data.fundingRisk.cashRunwayQuarters)}
            description={investorSignalDefinitions.cashRunway}
          />

          <MetricInfoRow
            label="Net Debt"
            value={formatCurrency(data.fundingRisk.netDebt)}
            tone={getValueTone(data.fundingRisk.netDebt)}
            description={investorSignalDefinitions.netDebt}
          />

          <MetricInfoRow
            label="Current Ratio"
            value={formatRatio(data.fundingRisk.currentRatio)}
            tone={getValueTone(data.fundingRisk.currentRatio)}
            description={investorSignalDefinitions.currentRatio}
          />

          <MetricInfoRow
            label="Interest Coverage"
            value={formatRatio(data.fundingRisk.interestCoverage)}
            tone={getValueTone(data.fundingRisk.interestCoverage)}
            description={investorSignalDefinitions.interestCoverage}
          />

          <MetricInfoRow
            label="Net Debt / EBITDA"
            value={formatRatio(data.fundingRisk.netDebtToEbitda)}
            tone={getValueTone(data.fundingRisk.netDebtToEbitda)}
            description={investorSignalDefinitions.netDebtToEbitda}
          />

          <MetricInfoRow
            label="Debt Growth (YoY)"
            value={formatPercentage(data.fundingRisk.debtGrowthYoY)}
            tone={getValueTone(data.fundingRisk.debtGrowthYoY)}
            description={investorSignalDefinitions.debtGrowthYoY}
          />

          <MetricInfoRow
            label="Cash / Short-Term Debt"
            value={formatRatio(data.fundingRisk.cashToShortTermDebt)}
            tone={getValueTone(data.fundingRisk.cashToShortTermDebt)}
            description={investorSignalDefinitions.cashToShortTermDebt}
          />

          <MetricInfoRow
            label="Diluted Share Growth"
            value={formatPercentage(data.fundingRisk.dilutedShareGrowthYoY)}
            tone={getValueTone(data.fundingRisk.dilutedShareGrowthYoY)}
            description={investorSignalDefinitions.dilutedShareGrowth}
          />

          <MetricInfoRow
            label="Net Stock Issuance"
            value={formatCurrency(data.fundingRisk.netStockIssuanceTtm)}
            tone={getValueTone(data.fundingRisk.netStockIssuanceTtm)}
            description={investorSignalDefinitions.netStockIssuance}
          />

          <Text style={styles.methodNote}>
            ROIC uses a simplified NOPAT and average invested-capital methodology. N/A is shown when
            a ratio is not meaningful for the reported financials.
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4EFEC',
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#142947',
  },

  loading: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    color: '#667792',
  },

  error: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 19,
    color: '#B54747',
  },

  sectionTitle: {
    marginTop: 22,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#142947',
  },

  methodNote: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 17,
    color: '#7788A3',
  },
});
