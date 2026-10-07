import {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../..';
import {GetMarketStocks} from './application/GetMarketStocks';
import {MarketStocksList} from './components/MarketStocksList';
import type {StockListMetric} from './components/MarketStockRow';
import {HttpMarketStocksRepository} from './infrastructure/HttpMarketStocksRepository';
import {useMarketStocks} from './hooks/useMarketStocks';

type Props = NativeStackScreenProps<HomeStackParamList, 'FeaturedPicksList'>;

const momentumMetric: StockListMetric = {
  label: 'Momentum',
  getScore: (stock) => stock.momentumScore,
  direction: 'higher_is_better',
};

export default function FeaturedPicksList({route, navigation}: Props) {
  const {title, subtitle, algorithm, stocks: initialStocks} = route.params;
  const loader = useMemo(() => new GetMarketStocks(new HttpMarketStocksRepository()), []);
  const list = useMarketStocks(loader, algorithm, initialStocks);

  return (
    <SafeAreaView style={styles.safeArea}>
      <MarketStocksList
        title={title}
        subtitle={
          list.loading ? 'Loading stocks...' : algorithm ? `${list.total} stocks` : subtitle
        }
        metric={momentumMetric}
        stocks={list.stocks}
        refreshing={list.loading}
        loadingMore={list.loadingMore}
        hasMore={list.hasMore && !list.error}
        onRefresh={algorithm ? () => void list.refresh() : undefined}
        onLoadMore={() => void list.loadMore()}
        onBack={() => navigation.goBack()}
        onStockPress={(stock) => navigation.navigate('StockPilotScoreCard', {stock})}
      />

      {list.error ? (
        <View style={styles.errorContainer}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {list.error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void list.retry()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#71819B',
    textAlign: 'center',
  },
  retryButton: {
    padding: 14,
  },
  retryText: {
    color: '#079B6D',
    fontWeight: '700',
  },
});
