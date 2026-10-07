import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, Text, View} from 'react-native';
import type {InvestmentCaseResult} from '../types/investmentOverview';
import {
  AnalysisBadge,
  AnalysisCard,
  analysisStyles,
  confidenceLabel,
} from './AnalysisCard';

type Props = {
  data: InvestmentCaseResult | null;
};

const sources = {
  scorecard: 'Scorecard',
  'earnings-outlook': 'Earnings outlook',
  'fair-value': 'Fair value',
  'peer-comparison': 'Peer comparison',
  'data-quality': 'Data quality',
};

export function InvestmentCaseCard({data}: Props) {
  const groups = [
    {
      title: 'Strengths',
      items: data?.strengths ?? [],
      color: '#079B73',
      icon: 'add-circle-outline' as const,
    },
    {
      title: 'Watch points',
      items: data?.watch ?? [],
      color: '#A46A11',
      icon: 'alert-circle-outline' as const,
    },
    {
      title: 'Risks',
      items: data?.risks ?? [],
      color: '#C94B4B',
      icon: 'alert-circle-outline' as const,
    },
  ].filter((group) => group.items.length > 0);

  return (
    <AnalysisCard
      title="Investment Case"
      badge={
        data ? (
          <AnalysisBadge
            label={`Confidence: ${confidenceLabel(data.confidence)}`}
          />
        ) : undefined
      }
    >
      {groups.length ? (
        groups.map((group, index) => (
          <View key={group.title}>
            {index > 0 ? <View style={styles.divider} /> : null}

            <Text style={styles.groupTitle}>{group.title}</Text>

            {group.items.map((item) => (
              <View key={item.key} style={styles.item}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={group.icon}
                    size={23}
                    color={group.color}
                  />
                </View>

                <View style={styles.content}>
                  <Text style={styles.itemTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.evidence}>
                    {item.evidence}
                  </Text>

                  <Text style={styles.source}>
                    Source: {sources[item.source]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))
      ) : (
        <Text style={analysisStyles.body}>
          No supported investment-case signals are available in the saved
          analysis yet.
        </Text>
      )}
    </AnalysisCard>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    marginBottom: 18,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#062653',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22,
  },

  iconContainer: {
    width: 24,
    height: 24,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  itemTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.15,
    color: '#062653',
  },

  evidence: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
    color: '#7184A3',
  },

  source: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: '#7184A3',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 2,
    marginBottom: 22,
    backgroundColor: '#DCE7E4',
  },
});