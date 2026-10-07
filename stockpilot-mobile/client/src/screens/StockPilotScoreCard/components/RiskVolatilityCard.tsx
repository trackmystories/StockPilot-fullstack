import {StyleSheet, Text, View} from 'react-native';

import type {SelectStock} from '../../StockPilot/types/stockPilot';

type Props = {
  riskScore: SelectStock['riskScore'];
  riskLevel: SelectStock['riskLevel'];
  volatilityScore: SelectStock['volatilityScore'];
};

function getRiskColor(riskLevel: SelectStock['riskLevel']) {
  switch (riskLevel) {
    case 'low':
      return '#079B6D';

    case 'medium':
      return '#D99420';

    case 'high':
      return '#E85B5B';

    default:
      return '#71819B';
  }
}

function formatRiskLevel(riskLevel: SelectStock['riskLevel']) {
  if (!riskLevel) {
    return 'Not rated';
  }

  return `${riskLevel.charAt(0).toUpperCase()}${riskLevel.slice(1)} risk`;
}

export function RiskVolatilityCard({riskScore, riskLevel, volatilityScore}: Props) {
  const riskColor = getRiskColor(riskLevel);

  return (
    <View style={styles.card}>
      <View style={styles.metric}>
        <Text style={styles.label}>Risk</Text>

        <View style={styles.scoreRow}>
          <Text
            style={[
              styles.score,
              {
                color: riskColor,
              },
            ]}
          >
            {typeof riskScore === 'number' ? riskScore : 'N/A'}
          </Text>

          <Text style={styles.maximum}>/10</Text>
        </View>

        <Text style={styles.description}>{formatRiskLevel(riskLevel)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metric}>
        <Text style={styles.label}>Volatility</Text>

        <View style={styles.scoreRow}>
          <Text style={styles.volatilityScore}>
            {typeof volatilityScore === 'number' ? volatilityScore : 'N/A'}
          </Text>

          <Text style={styles.maximum}>/10</Text>
        </View>

        <Text style={styles.description}>Price movement</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8F1',
    borderRadius: 18,
    marginTop: 10,
  },

  metric: {
    flex: 1,
  },

  divider: {
    width: 1,
    marginHorizontal: 20,
    backgroundColor: '#E7EDF4',
  },

  label: {
    color: '#71819B',
    fontSize: 13,
    fontWeight: '600',
  },

  scoreRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  score: {
    fontSize: 28,
    fontWeight: '700',
  },

  volatilityScore: {
    color: '#071B43',
    fontSize: 28,
    fontWeight: '700',
  },

  maximum: {
    marginLeft: 3,
    color: '#071B43',
    fontSize: 14,
    fontWeight: '500',
  },

  description: {
    marginTop: 4,
    color: '#71819B',
    fontSize: 12,
  },
});
