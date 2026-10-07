import Ionicons from '@expo/vector-icons/Ionicons';

import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import type {InvestmentThesis} from '../../stocks/useFmpFinancialMetrics';

type Props = {
  thesis: InvestmentThesis | null;

  loading: boolean;

  error: string | null;
};

const getConfidenceLabel = (confidence: InvestmentThesis['confidence']) => {
  switch (confidence) {
    case 'high':
      return 'High confidence';

    case 'medium':
      return 'Medium confidence';

    default:
      return 'Low confidence';
  }
};

export function InvestmentThesisCard({thesis, loading, error}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="document-text-outline" size={23} color="#142947" />

          <Text style={styles.title}>Confidence level</Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color="#7788A3" />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" />

          <Text style={styles.loadingText}>Building investment thesis…</Text>
        </View>
      ) : null}

      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && thesis ? (
        <>
          <View
            style={[
              styles.confidence,

              thesis.confidence === 'high'
                ? styles.highConfidence
                : thesis.confidence === 'medium'
                  ? styles.mediumConfidence
                  : styles.lowConfidence,
            ]}
          >
            <Text style={styles.confidenceText}>{getConfidenceLabel(thesis.confidence)}</Text>
          </View>

          <Text style={styles.summary}>{thesis.summary}</Text>

          <Text style={styles.basis}>
            {thesis.evidenceSources.length > 1 ? ' and market consensus data' : ''}.
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EFEC',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  title: {
    fontSize: 19,
    fontWeight: '600',
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
    color: '#B54747',
  },

  confidence: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },

  highConfidence: {
    backgroundColor: '#DDF7EC',
  },

  mediumConfidence: {
    backgroundColor: '#FFF2D6',
  },

  lowConfidence: {
    backgroundColor: '#EEF1F5',
  },

  confidenceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#142947',
  },

  summary: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
    color: '#667792',
  },

  basis: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 16,
    color: '#8B9AB0',
  },
});
