import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, Text, View} from 'react-native';
import type {EarningsOutlookResult} from '../types/investmentOverview';
import {
  AnalysisBadge,
  AnalysisCard,
  AnalysisDetails,
  analysisStyles,
  confidenceLabel,
  formatAmount,
  formatPercent,
} from './AnalysisCard';

const labels = {
  improving: 'Improving',
  stable: 'Stable',
  mixed: 'Mixed',
  weakening: 'Weakening',
  'insufficient-data': 'Limited data',
};

type Props = {
  data: EarningsOutlookResult | null;
};

type GrowthMetricProps = {
  label: string;
  value: number | null | undefined;
};

type RevisionMetricProps = {
  label: string;
  value: number | null | undefined;
};

function GrowthMetric({label, value}: GrowthMetricProps) {
  const available = typeof value === 'number' && Number.isFinite(value);

  const color = !available ? '#142947' : value > 0 ? '#079B73' : value < 0 ? '#B54747' : '#142947';

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>

      <Text style={[styles.metricValue, {color}]}>{available ? formatPercent(value) : '—'}</Text>
    </View>
  );
}

function RevisionMetric({label, value}: RevisionMetricProps) {
  const available = typeof value === 'number' && Number.isFinite(value);

  const color = !available ? '#667792' : value > 0 ? '#079B73' : value < 0 ? '#B54747' : '#142947';

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>

      <Text style={[styles.revisionValue, {color}]}>{available ? formatPercent(value) : '—'}</Text>

      {!available ? <Text style={styles.missingText}>Not enough analyst estimates</Text> : null}
    </View>
  );
}

export function EarningsOutlookCard({data}: Props) {
  const eligible = Boolean(data?.eligible);
  const eps = data?.eps.forwardGrowthPercent;
  const revenue = data?.revenue.forwardGrowthPercent;

  return (
    <AnalysisCard
      title="Earnings Outlook"
      badge={
        data ? (
          <AnalysisBadge
            label={eligible ? labels[data.status] : 'Limited data'}
            tone={
              !eligible
                ? 'neutral'
                : data.status === 'improving'
                  ? 'positive'
                  : data.status === 'weakening'
                    ? 'negative'
                    : data.status === 'mixed'
                      ? 'caution'
                      : 'neutral'
            }
          />
        ) : undefined
      }
    >
      {data ? (
        <>
          <View style={styles.metricsRow}>
            <GrowthMetric label="Revenue growth" value={revenue} />

            <View style={styles.verticalDivider} />

            <GrowthMetric label="EPS growth" value={eps} />
          </View>

          <View style={styles.context}>
            <View style={styles.contextRow}>
              <Ionicons name="calendar-outline" size={18} color="#667792" />

              <Text style={styles.contextText}>
                Forecast periods: {data.currentPeriod ?? '—'} → {data.nextPeriod ?? '—'}
              </Text>
            </View>

            <View style={styles.contextRow}>
              <Ionicons name="people-outline" size={19} color="#667792" />

              <Text style={styles.contextText}>
                Analyst estimates
                {typeof data.analystCount === 'number'
                  ? ` · ${data.analystCount} ${data.analystCount === 1 ? 'analyst' : 'analysts'}`
                  : ''}
                {' · '}
                {confidenceLabel(data.confidence)} confidence
              </Text>
            </View>

            {!eligible ? (
              <View style={styles.contextRow}>
                <Ionicons name="information-circle-outline" size={19} color="#667792" />

                <Text style={styles.contextText}>
                  Coverage is too limited for an overall outlook rating.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            Estimate revisions
            {data.revisionPeriodDays !== null ? ` · ${data.revisionPeriodDays} days` : ''}
          </Text>

          <View style={styles.revisionsRow}>
            <RevisionMetric label="Revenue revision" value={data.revenue.revisionPercent} />

            <View style={styles.verticalDivider} />

            <RevisionMetric label="EPS revision" value={data.eps.revisionPercent} />
          </View>

          <AnalysisDetails label="View forecast details">
            <Text style={analysisStyles.body}>
              Growth compares the two forecast periods. Revisions measure changes to saved analyst
              estimates over the comparison window.
            </Text>

            {data.score !== null && eligible ? (
              <Text style={analysisStyles.detailTitle}>
                Outlook score: {formatAmount(data.score)}/100
              </Text>
            ) : null}

            <Text style={analysisStyles.body}>
              Signal coverage: {Math.round(data.coverage * 100)}%
            </Text>

            <Text style={analysisStyles.detailTitle}>EPS estimates</Text>

            <Text style={analysisStyles.body}>
              {data.currentPeriod ?? 'Current forecast'}: {formatAmount(data.eps.currentEstimate)}
              {'\n'}
              {data.nextPeriod ?? 'Next forecast'}: {formatAmount(data.eps.nextEstimate)}
            </Text>

            <Text style={analysisStyles.detailTitle}>Revenue estimates</Text>

            <Text style={analysisStyles.body}>
              {data.currentPeriod ?? 'Current forecast'}:{' '}
              {formatAmount(data.revenue.currentEstimate)}
              {'\n'}
              {data.nextPeriod ?? 'Next forecast'}: {formatAmount(data.revenue.nextEstimate)}
            </Text>

            <Text style={analysisStyles.body}>
              Estimate currency is not supplied by this response. Figures retain their source units.
              Estimates may change.
            </Text>
          </AnalysisDetails>
        </>
      ) : (
        <Text style={analysisStyles.body}>
          Earnings outlook is not available in the saved analysis yet.
        </Text>
      )}
    </AnalysisCard>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  revisionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  metric: {
    flex: 1,
    minWidth: 0,
  },

  metricLabel: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: '#667792',
  },

  metricValue: {
    marginTop: 7,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },

  revisionValue: {
    marginTop: 7,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  missingText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: '#667792',
  },

  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    backgroundColor: '#E4EFEC',
  },

  context: {
    marginTop: 24,
    gap: 13,
  },

  contextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  contextText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: '#667792',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: '#E4EFEC',
  },

  sectionTitle: {
    marginBottom: 18,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#142947',
  },
});
