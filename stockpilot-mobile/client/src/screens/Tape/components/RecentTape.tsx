import {StyleSheet, Text, View} from 'react-native';
import type {TapeActivityItem} from '../types/tape';

type Props = {
  activity: TapeActivityItem[];
};

export function RecentTape({activity}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recent Tape</Text>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.column]}>Time</Text>
        <Text style={[styles.headerText, styles.column]}>Price</Text>
        <Text style={[styles.headerText, styles.volumeColumn]}>Volume</Text>
      </View>

      {activity.map((item, index) => (
        <View key={`${item.time}-${index}`} style={styles.row}>
          <Text style={[styles.text, styles.column]}>{item.time}</Text>

          <Text
            style={[
              styles.price,
              styles.column,
              item.direction === 'UP'
                ? styles.positive
                : item.direction === 'DOWN'
                  ? styles.negative
                  : styles.neutral,
            ]}
          >
            ${item.price.toFixed(2)}
          </Text>

          <Text style={[styles.text, styles.volumeColumn]}>{item.volume.toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5F0',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    overflow: 'hidden',
  },
  title: {
    color: '#062451',
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
  },
  headerText: {
    color: '#7184A1',
    fontSize: 14,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E6ECF3',
  },
  text: {
    color: '#062451',
    fontSize: 15,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
  positive: {
    color: '#0FA97B',
  },
  negative: {
    color: '#F45459',
  },
  neutral: {
    color: '#062451',
  },
  column: {
    flex: 1,
  },
  volumeColumn: {
    flex: 1,
    textAlign: 'right',
  },
});
