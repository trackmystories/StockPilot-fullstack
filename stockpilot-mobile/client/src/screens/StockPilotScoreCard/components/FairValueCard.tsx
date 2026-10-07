import {StyleSheet, Text, View} from 'react-native';
import type {FairValueResult} from '../types/investmentOverview';
import {
  AnalysisCard,
  AnalysisDetails,
  analysisStyles as styles,
  confidenceLabel,
  formatAmount,
} from './AnalysisCard';

type Props = {
  data: FairValueResult | null;
};

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }

  return value.toFixed(2);
}

function formatDifference(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function FairValueCard({data}: Props) {
  const available = Boolean(
    data?.eligible &&
    typeof data.estimatedFairValue === 'number' &&
    Number.isFinite(data.estimatedFairValue),
  );

  const difference = available ? data?.differencePercent : null;
  const hasDifference = typeof difference === 'number' && Number.isFinite(difference);

  const methods = data?.methods ?? [];
  const currency = data?.currency?.toUpperCase() ?? '';

  const differenceTone =
    typeof difference === 'number'
      ? difference > 0
        ? 'positive'
        : difference < 0
          ? 'negative'
          : 'neutral'
      : 'neutral';

  const differenceLabel =
    typeof difference === 'number'
      ? difference > 0
        ? 'Above price at calculation'
        : difference < 0
          ? 'Below price at calculation'
          : 'Matches price at calculation'
      : '';

  return (
    <AnalysisCard title="Fair Value">
      {available && data ? (
        <>
          <View style={localStyles.heroRow}>
            <View style={localStyles.estimatedSection}>
              <Text style={localStyles.label}>Estimated value</Text>

              <View style={localStyles.priceRow}>
                <Text style={localStyles.heroPrice}>{formatPrice(data.estimatedFairValue)}</Text>

                {currency ? <Text style={localStyles.heroCurrency}>{currency}</Text> : null}
              </View>
            </View>

            {hasDifference && difference !== null ? (
              <View style={localStyles.differenceSection}>
                <View
                  style={[
                    localStyles.differenceBadge,
                    differenceTone === 'positive' && localStyles.differenceBadgePositive,
                    differenceTone === 'negative' && localStyles.differenceBadgeNegative,
                    differenceTone === 'neutral' && localStyles.differenceBadgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      localStyles.differenceValue,
                      differenceTone === 'positive' && localStyles.differenceValuePositive,
                      differenceTone === 'negative' && localStyles.differenceValueNegative,
                      differenceTone === 'neutral' && localStyles.differenceValueNeutral,
                    ]}
                  >
                    {formatDifference(difference)}
                  </Text>
                </View>

                <Text style={localStyles.differenceLabel}>{differenceLabel}</Text>
              </View>
            ) : null}
          </View>

          <View style={localStyles.divider} />

          <View style={localStyles.metricsRow}>
            <View style={localStyles.metricSection}>
              <Text style={localStyles.label}>Price at calculation</Text>

              <View style={localStyles.metricPriceRow}>
                <Text style={localStyles.metricValue}>{formatPrice(data.currentPrice)}</Text>

                {currency ? <Text style={localStyles.metricCurrency}>{currency}</Text> : null}
              </View>
            </View>

            <View style={localStyles.metricDivider} />

            <View style={localStyles.metricSection}>
              <Text style={localStyles.label}>Model confidence</Text>

              <Text style={localStyles.confidenceValue}>{confidenceLabel(data.confidence)}</Text>
            </View>
          </View>

          <Text style={localStyles.methodSummary}>
            Based on {methods.length} valuation {methods.length === 1 ? 'method' : 'methods'}.
            {!data.currency ? ' Currency unavailable.' : ''}
          </Text>
        </>
      ) : (
        <Text style={styles.body}>Not enough valuation data to show a reliable estimate.</Text>
      )}

      {methods.length ? (
        <AnalysisDetails label="View valuation methods">
          <Text style={styles.body}>
            The estimate is the median of the available methods. Confidence reflects method
            coverage, not the probability of a future return.
          </Text>

          {methods.map((method) => (
            <View key={method.id}>
              <Text style={styles.detailTitle}>{method.name}</Text>

              <Text style={styles.body}>{formatAmount(method.impliedValue, data?.currency)}</Text>

              {method.source === 'peer' ? (
                <Text style={styles.body}>
                  Company multiple: {formatAmount(method.companyMultiple)} · Peer median:{' '}
                  {formatAmount(method.peerMedian)}
                  {method.peerCount !== null ? ` · ${method.peerCount} peers` : ''}
                  {method.peerGroup ? ` · ${method.peerGroup}` : ''}
                </Text>
              ) : (
                <Text style={styles.body}>Analyst price-target reference</Text>
              )}
            </View>
          ))}
        </AnalysisDetails>
      ) : null}
    </AnalysisCard>
  );
}

const localStyles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
  },

  estimatedSection: {
    flex: 1,
  },

  label: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: '#7184A3',
  },

  priceRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  heroPrice: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: '#062653',
  },

  heroCurrency: {
    marginLeft: 7,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#7184A3',
  },

  differenceSection: {
    flex: 1,
    alignItems: 'stretch',
  },

  differenceBadge: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  differenceBadgePositive: {
    backgroundColor: '#E7F6F1',
  },

  differenceBadgeNegative: {
    backgroundColor: '#FCECEC',
  },

  differenceBadgeNeutral: {
    backgroundColor: '#F1F3F5',
  },

  differenceValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },

  differenceValuePositive: {
    color: '#079B73',
  },

  differenceValueNegative: {
    color: '#D34A4A',
  },

  differenceValueNeutral: {
    color: '#7184A3',
  },

  differenceLabel: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#7184A3',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: '#DCE7E4',
  },

  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  metricSection: {
    flex: 1,
  },

  metricDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
    backgroundColor: '#DCE7E4',
  },

  metricPriceRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  metricValue: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#062653',
  },

  metricCurrency: {
    marginLeft: 6,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#7184A3',
  },

  confidenceValue: {
    marginTop: 6,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#062653',
  },

  methodSummary: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#7184A3',
  },
});
