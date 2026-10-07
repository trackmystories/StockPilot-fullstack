import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {StockChartData, StockChartRange} from '../../stocks/useFmpStockChart';

import {StockPriceChart} from './StockPriceChart';

type Props = {
  chart: StockChartData | null;

  range: StockChartRange;

  loading: boolean;

  error: string | null;

  onRangeChange: (range: StockChartRange) => void;
};

const RANGES: StockChartRange[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

export function StockChartCard({chart, range, loading, error, onRangeChange}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Price Performance</Text>

          <Text style={styles.subtitle}>Historical share price</Text>
        </View>
      </View>

      <View style={styles.chart}>
        <StockPriceChart points={chart?.points ?? []} loading={loading} error={error} />
      </View>

      <View style={styles.ranges}>
        {RANGES.map((rangeOption) => {
          const selected = range === rangeOption;

          return (
            <Pressable
              key={rangeOption}
              style={[styles.rangeButton, selected && styles.rangeButtonSelected]}
              onPress={() => onRangeChange(rangeOption)}
            >
              <Text style={[styles.rangeText, selected && styles.rangeTextSelected]}>
                {rangeOption}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,

    paddingVertical: 18,

    borderWidth: 1,

    borderColor: '#E4EFEC',

    borderRadius: 18,

    backgroundColor: '#FFFFFF',
  },

  header: {
    paddingHorizontal: 18,
  },

  title: {
    fontSize: 20,

    fontWeight: '700',

    color: '#142947',
  },

  subtitle: {
    marginTop: 3,

    fontSize: 12,

    color: '#7788A3',
  },

  chart: {
    marginTop: 16,

    paddingHorizontal: 10,
  },

  ranges: {
    marginTop: 14,

    paddingHorizontal: 12,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: 6,
  },

  rangeButton: {
    flex: 1,

    height: 38,

    borderRadius: 19,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#F1F6F5',
  },

  rangeButtonSelected: {
    backgroundColor: '#079B73',
  },

  rangeText: {
    fontSize: 12,

    fontWeight: '600',

    color: '#071B43',
  },

  rangeTextSelected: {
    color: '#FFFFFF',
  },
});
