import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {Ionicons} from '@expo/vector-icons';

import {SelectRiskLevel} from '../types/stockPilot';

import {RiskLevelCard} from './RiskLevelCard';

type Props = {
  onViewAllPress: () => void;

  onRiskPress: (riskLevel: SelectRiskLevel) => void;
};

export function RiskLevelSection({onViewAllPress, onRiskPress}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Browse by risk level</Text>

          <Text style={styles.subtitle}>Explore opportunities that match your risk appetite.</Text>
        </View>

        <Pressable style={styles.viewAll} onPress={onViewAllPress}>
          <Text style={styles.viewAllText}>View all</Text>

          <Ionicons name="arrow-forward" size={20} color="#079B6D" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
      >
        <RiskLevelCard riskLevel="low" onPress={() => onRiskPress('low')} />

        <RiskLevelCard riskLevel="medium" onPress={() => onRiskPress('medium')} />

        <RiskLevelCard riskLevel="high" onPress={() => onRiskPress('high')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 31,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  heading: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#071B43',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 15,
    color: '#71819B',
  },

  viewAll: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#079B6D',
  },

  cards: {
    marginTop: 17,
    gap: 12,
    paddingRight: 20,
  },
});
