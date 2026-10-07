import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import type {SelectStock} from '../types/stockPilot';
import {MarketStockRow, type StockListMetric} from './MarketStockRow';

type Props = {
  title: string;
  subtitle: string;
  stocks: SelectStock[];
  loading?: boolean;
  metric?: StockListMetric;
  emptyText?: string;
  onStockPress: (stock: SelectStock) => void;
  onViewAllPress: () => void;
};

export function MarketStocksSection({
  title,
  subtitle,
  stocks,
  loading = false,
  metric,
  emptyText = 'Stocks are currently unavailable.',
  onStockPress,
  onViewAllPress,
}: Props) {
  const visibleStocks = stocks.slice(0, 3);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable style={styles.viewAll} onPress={onViewAllPress}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="arrow-forward" size={19} color="#079B6D" />
        </Pressable>
      </View>
      <View style={styles.card}>
        {loading ? <Text style={styles.message}>Loading...</Text> : null}
        {!loading && visibleStocks.length > 0
          ? visibleStocks.map((stock, index) => (
              <MarketStockRow
                key={stock.symbol}
                stock={stock}
                metric={metric}
                onPress={() => onStockPress(stock)}
                showDivider={index < visibleStocks.length - 1}
              />
            ))
          : null}
        {!loading && visibleStocks.length === 0 ? (
          <Text style={styles.message}>{emptyText}</Text>
        ) : null}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: '#071B43',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#71819B',
    fontSize: 13,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: '#079B6D',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#DDE5EF',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  message: {
    padding: 18,
    color: '#71819B',
    fontSize: 13,
  },
});
