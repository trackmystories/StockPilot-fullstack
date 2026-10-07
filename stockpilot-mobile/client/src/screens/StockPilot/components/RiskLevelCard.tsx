import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {SelectRiskLevel} from '../types/stockPilot';

type Props = {
  riskLevel: SelectRiskLevel;
  onPress?: () => void;
};

const riskConfig = {
  low: {
    title: 'Low Risk',
    description: 'Established companies with strong fundamentals.',
    icon: 'shield-checkmark-outline' as const,
    backgroundColor: '#E5F8EF',
    iconBackgroundColor: '#CEF4E2',
    iconColor: '#08A979',
  },

  medium: {
    title: 'Medium Risk',
    description: 'Growing companies with solid potential.',
    icon: 'scale-outline' as const,
    backgroundColor: '#FFF4DC',
    iconBackgroundColor: '#FFE8AD',
    iconColor: '#E69C00',
  },

  high: {
    title: 'High Risk',
    description: 'Innovative companies with higher growth potential.',
    icon: 'bar-chart-outline' as const,
    backgroundColor: '#FFE8EA',
    iconBackgroundColor: '#FFD6DC',
    iconColor: '#E83F64',
  },
};

export function RiskLevelCard({riskLevel, onPress}: Props) {
  const config = riskConfig[riskLevel];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: config.iconBackgroundColor,
          },
        ]}
      >
        <Ionicons name={config.icon} size={30} color={config.iconColor} />
      </View>

      <Text style={styles.title}>{config.title}</Text>

      <Text style={styles.description}>{config.description}</Text>

      <View style={styles.action}>
        <Text style={styles.actionText}>View stocks</Text>

        <Ionicons name="arrow-forward" size={18} color="#0A1D45" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 205,
    minHeight: 220,
    paddingHorizontal: 17,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
  },

  icon: {
    width: 51,
    height: 51,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1D45',
  },

  description: {
    marginTop: 5,
    minHeight: 61,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 19,
    color: '#61738F',
  },

  action: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A1D45',
  },
});
