import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {RecentSearchStock} from '../types/stockSearch';

type Props = {
  stocks: RecentSearchStock[];
  onPress: (stock: RecentSearchStock) => void;
  onRemove: (symbol: string) => void;
  onClear: () => void;
};

export function RecentSearchesSection({
  stocks,
  onPress,
  onRemove,
  onClear,
}: Props) {
  if (stocks.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent searches</Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClear}
          hitSlop={10}
        >
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View>
        {stocks.map((stock) => (
          <View key={stock.symbol} style={styles.row}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.stockButton}
              onPress={() => onPress(stock)}
            >
              <View style={styles.historyIcon}>
                <Ionicons
                  name="time-outline"
                  size={19}
                  color="#7184A3"
                />
              </View>

              <View style={styles.details}>
                <Text style={styles.symbol}>
                  {stock.symbol}
                </Text>

                <Text
                  numberOfLines={1}
                  style={styles.company}
                >
                  {stock.companyName}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={12}
              onPress={() => onRemove(stock.symbol)}
              style={styles.removeButton}
            >
              <Ionicons
                name="close"
                size={20}
                color="#8A98AD"
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 30,
  },
  header: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    color: '#081B3A',
  },
  clear: {
    fontSize: 13,
    fontWeight: '600',
    color: '#079B73',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  symbol: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#081B3A',
  },
  company: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#7788A3',
  },
  removeButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});