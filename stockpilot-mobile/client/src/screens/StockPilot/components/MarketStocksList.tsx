import {useCallback, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import {ScreenHeader} from '../../components/ScreenHeader';
import {useWatchlist} from '../../WatchList/application/useWatchlist';
import type {SelectStock} from '../types/stockPilot';
import {
  DEFAULT_STOCK_METRIC,
  isAvailableNumber,
  MarketStockRow,
  stockColumns,
  type StockListMetric,
} from './MarketStockRow';

type Props = {
  title: string;
  subtitle?: string;
  stocks: SelectStock[];
  loadingMore?: boolean;
  hasMore?: boolean;
  refreshing?: boolean;
  metric?: StockListMetric;
  onBack: () => void;
  onStockPress: (stock: SelectStock) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
};

type SortOption = 'default' | 'company' | 'price' | 'change' | 'score';

function compareNumbers(a: unknown, b: unknown, ascending = false) {
  const validA = isAvailableNumber(a);
  const validB = isAvailableNumber(b);

  if (!validA && !validB) {
    return 0;
  }

  if (!validA) {
    return 1;
  }

  if (!validB) {
    return -1;
  }

  return ascending ? a - b : b - a;
}

export function MarketStocksList({
  title,
  subtitle,
  stocks,
  loadingMore = false,
  hasMore = false,
  refreshing = false,
  metric = DEFAULT_STOCK_METRIC,
  onBack,
  onStockPress,
  onLoadMore,
  onRefresh,
}: Props) {
  const [sort, setSort] = useState<SortOption>('default');
  const [updatingSymbol, setUpdatingSymbol] = useState<string | null>(null);

  const toggleLock = useRef(false);
  const hasFocused = useRef(false);

  const {
    tickers,
    isLoading: watchlistLoading,
    isUpdating: watchlistUpdating,
    error: watchlistError,
    isFavorite,
    toggleFavorite,
    refresh: refreshWatchlist,
  } = useWatchlist();

  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) {
        void refreshWatchlist();
      }

      hasFocused.current = true;
    }, [refreshWatchlist]),
  );

  const handleToggleWatchlist = useCallback(
    async (stock: SelectStock) => {
      if (
        toggleLock.current ||
        watchlistLoading ||
        watchlistUpdating
      ) {
        return;
      }

      if (watchlistError) {
        Alert.alert(
          'Watchlist unavailable',
          watchlistError,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Retry',
              onPress: () => void refreshWatchlist(),
            },
          ],
        );

        return;
      }

      toggleLock.current = true;
      setUpdatingSymbol(stock.symbol);

      try {
        await toggleFavorite(stock.symbol);
      } catch (error) {
        Alert.alert(
          'Could not update watchlist',
          error instanceof Error
            ? error.message
            : 'Please try again.',
        );
      } finally {
        toggleLock.current = false;
        setUpdatingSymbol(null);
      }
    },
    [
      refreshWatchlist,
      toggleFavorite,
      watchlistError,
      watchlistLoading,
      watchlistUpdating,
    ],
  );

  const sortedStocks = useMemo(() => {
    if (sort === 'default') {
      return stocks;
    }

    return [...stocks].sort((a, b) => {
      switch (sort) {
        case 'company':
          return (a.companyName || a.symbol).localeCompare(
            b.companyName || b.symbol,
          );

        case 'price':
          return compareNumbers(a.price, b.price);

        case 'change':
          return compareNumbers(
            a.changePercentage,
            b.changePercentage,
          );

        case 'score':
          return compareNumbers(
            metric.getScore(a),
            metric.getScore(b),
            metric.direction === 'higher_is_riskier',
          );

        default:
          return 0;
      }
    });
  }, [metric, sort, stocks]);

  const showSortOptions = useCallback(() => {
    const scoreDirection =
      metric.direction === 'higher_is_riskier'
        ? 'lowest'
        : 'highest';

    Alert.alert('Sort stocks', '', [
      {
        text: 'Original order',
        onPress: () => setSort('default'),
      },
      {
        text: 'Company: A–Z',
        onPress: () => setSort('company'),
      },
      {
        text: 'Price: highest first',
        onPress: () => setSort('price'),
      },
      {
        text: 'Daily change: highest first',
        onPress: () => setSort('change'),
      },
      {
        text: `${metric.label}: ${scoreDirection} first`,
        onPress: () => setSort('score'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  }, [metric]);

  const watchlistDisabled =
    watchlistLoading ||
    watchlistUpdating ||
    updatingSymbol !== null;

  const extraData = useMemo(
    () => ({
      metric,
      tickers,
      watchlistLoading,
      watchlistUpdating,
      watchlistError,
      updatingSymbol,
    }),
    [
      metric,
      tickers,
      watchlistLoading,
      watchlistUpdating,
      watchlistError,
      updatingSymbol,
    ],
  );

  const renderStock: ListRenderItem<SelectStock> = useCallback(
    ({item, index}) => (
      <MarketStockRow
        stock={item}
        metric={metric}
        onPress={() => onStockPress(item)}
        showDivider={index < sortedStocks.length - 1}
        isFavorite={isFavorite(item.symbol)}
        watchlistBusy={updatingSymbol === item.symbol}
        watchlistDisabled={watchlistDisabled}
        onToggleWatchlist={() =>
          void handleToggleWatchlist(item)
        }
      />
    ),
    [
      handleToggleWatchlist,
      isFavorite,
      metric,
      onStockPress,
      sortedStocks.length,
      updatingSymbol,
      watchlistDisabled,
    ],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        onBack={onBack}
      />

      <View style={styles.toolbar}>
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Sort loaded stocks"
          activeOpacity={0.7}
          onPress={showSortOptions}
          style={[
            styles.sortButton,
            sort !== 'default' &&
              styles.sortButtonActive,
          ]}
        >
          <Text style={styles.sortText}>
            Sort
          </Text>

          <Ionicons
            name="swap-vertical-outline"
            size={16}
            color="#071B43"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.columnHeaders}>
        <View style={stockColumns.company}>
          <Text style={styles.columnLabel}>
            Company
          </Text>
        </View>

        <View style={stockColumns.price}>
          <Text style={styles.columnLabel}>
            Price
          </Text>
        </View>

        <View style={stockColumns.metric}>
          <Text
            style={styles.columnLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {metric.label}
          </Text>
        </View>

        <View style={stockColumns.chevron} />
      </View>

      <FlatList
        style={styles.list}
        data={sortedStocks}
        extraData={extraData}
        keyExtractor={(stock) => stock.symbol}
        renderItem={renderStock}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !refreshing ? (
            <Text style={styles.emptyText}>
              No stocks available.
            </Text>
          ) : null
        }
        ListFooterComponent={
          hasMore && onLoadMore ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{
                disabled: loadingMore,
                busy: loadingMore,
              }}
              activeOpacity={0.7}
              disabled={loadingMore}
              onPress={onLoadMore}
              style={[
                styles.loadMoreButton,
                loadingMore &&
                  styles.loadMoreButtonDisabled,
              ]}
            >
              <Text style={styles.loadMoreText}>
                {loadingMore
                  ? 'Loading...'
                  : 'Load more'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },

  subtitle: {
    flex: 1,
    minWidth: 0,
    color: '#079B6D',
    fontSize: 16,
    fontWeight: '600',
  },

  sortButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDE5EF',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },

  sortButtonActive: {
    borderColor: '#079B6D',
    backgroundColor: '#ECF8F4',
  },

  sortText: {
    color: '#071B43',
    fontSize: 13,
    fontWeight: '600',
  },

  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE5EF',
  },

  columnLabel: {
    color: '#71819B',
    fontSize: 11,
    fontWeight: '500',
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingBottom: 20,
  },

  emptyText: {
    padding: 20,
    color: '#71819B',
    textAlign: 'center',
    fontSize: 13,
  },

  loadMoreButton: {
    minHeight: 44,
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#ECF8F4',
  },

  loadMoreButtonDisabled: {
    opacity: 0.7,
  },

  loadMoreText: {
    color: '#079B6D',
    fontSize: 14,
    fontWeight: '700',
  },
});