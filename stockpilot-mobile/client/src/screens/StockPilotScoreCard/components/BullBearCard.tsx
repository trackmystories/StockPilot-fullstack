import {StyleSheet, Text, View} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import type {BullBearCaseItem} from '../../stocks/useFmpFinancialMetrics';

type Props = {
  bullCase: BullBearCaseItem[];

  bearCase: BullBearCaseItem[];
};

type CaseColumnProps = {
  title: string;

  items: BullBearCaseItem[];

  type: 'bull' | 'bear';
};

function CaseColumn({title, items, type}: CaseColumnProps) {
  const isBull = type === 'bull';

  return (
    <View style={[styles.column, isBull ? styles.bullColumn : styles.bearColumn]}>
      <View style={styles.titleRow}>
        <Ionicons
          name={isBull ? 'trending-up-outline' : 'warning-outline'}
          size={22}
          color={isBull ? '#079B73' : '#D64545'}
        />

        <Text style={[styles.title, isBull ? styles.bullTitle : styles.bearTitle]}>{title}</Text>
      </View>

      {items.length ? (
        items.map((item) => (
          <View key={item.key} style={styles.item}>
            <Text style={[styles.bullet, isBull ? styles.bullBullet : styles.bearBullet]}>•</Text>

            <Text style={styles.itemText}>{item.text}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>
          No strong {isBull ? 'bullish' : 'bearish'} signal was identified from the available
          financial data.
        </Text>
      )}
    </View>
  );
}

export function BullBearCard({bullCase, bearCase}: Props) {
  return (
    <View style={styles.container}>
      <CaseColumn title="Bull Case" items={bullCase} type="bull" />

      <CaseColumn title="Bear Case" items={bearCase} type="bear" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4EFEC',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  

  column: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
  },

  bullColumn: {
    backgroundColor: '#E9F8F2',
  },

  bearColumn: {
    backgroundColor: '#FDECEC',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },

  title: {
    fontSize: 17,
    fontWeight: '600',
  },

  bullTitle: {
    color: '#079B73',
  },

  bearTitle: {
    color: '#D64545',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bullet: {
    marginRight: 8,
    fontSize: 16,
    lineHeight: 20,
  },

  bullBullet: {
    color: '#079B73',
  },

  bearBullet: {
    color: '#D64545',
  },

  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#556B88',
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7788A3',
  },
});
