import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SelectStock } from '../StockPilot/types/stockPilot';
import { useWatchlist } from '../WatchList/application/useWatchlist';
import { StockList } from '../components/StockList';
import { useOpenPortfolioTransaction } from '../Portfolio/hooks/useOpenPortfolioTransaction';
import type { FilterSort, FilterStock, StockFilterRoutes } from './domain/stockFilter';
import { toSelectStock } from './domain/toSelectStock';
import { getStockListLayout, type StockListItem } from '../components/stockListPresentation';
import { useStockFilterResults } from './hooks/useStockFilterResults';

type Routes = StockFilterRoutes & { StockPilotScoreCard: { stock: SelectStock } };
type Props = NativeStackScreenProps<Routes, 'StockFilterList'>;

const SORTS: {
  id: FilterSort;
  label: string;
}[] = [
    { id: 'symbol', label: 'A–Z' },
    { id: 'overall', label: 'Overall score' },
    { id: 'risk', label: 'Lowest risk' },
  ];

function toListItem(stock: FilterStock): StockListItem {
  return {
    symbol: stock.symbol,
    companyName: stock.companyName,
    logoUrl: stock.logoUrl,
    price: stock.price,
    currency: stock.currency,
    marketCap: stock.marketCap,
    momentumScore: stock.scores?.momentum ?? null,
    stale: stock.stale,
  };
}

export default function StockFilterList({ navigation, route }: Props) {
  const openPortfolioTransaction = useOpenPortfolioTransaction();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const availableWidth = Math.max(1, Math.min(measuredWidth ?? width, width) - insets.left - insets.right);
  const layout = useMemo(
    () => getStockListLayout(availableWidth, fontScale),
    [availableWidth, fontScale],
  );
  const [sort, setSort] = useState<FilterSort>('symbol');
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
      // useWatchlist already loads on mount. Refresh after returning from another screen.
      if (hasFocused.current) {
        void refreshWatchlist();
      }
      hasFocused.current = true;
    }, [refreshWatchlist]),
  );
  const handleToggleWatchlist = useCallback(
    async (stock: FilterStock) => {
      if (toggleLock.current || watchlistLoading || watchlistUpdating) {
        return;
      }
      if (watchlistError) {
        Alert.alert('Watchlist unavailable', watchlistError, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => void refreshWatchlist() },
        ]);
        return;
      }
      // A ref blocks duplicate taps before React has rendered the busy state.
      toggleLock.current = true;
      setUpdatingSymbol(stock.symbol);
      try {
        await toggleFavorite(stock.symbol);
      } catch (error) {
        Alert.alert(
          'Could not update watchlist',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        toggleLock.current = false;
        setUpdatingSymbol(null);
      }
    },
    [refreshWatchlist, toggleFavorite, watchlistError, watchlistLoading, watchlistUpdating],
  );
  const watchlistDisabled = watchlistLoading || watchlistUpdating || updatingSymbol !== null;
  const { selectedIds, runId } = route.params;
  const results = useStockFilterResults(selectedIds, runId, sort);
  const edit = () => navigation.navigate('StockFilter', { selectedIds, resultRouteKey: route.key });
  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'left', 'right']}
      onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.icon}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={23} color="#081B3A" />
        </TouchableOpacity>
        <Text
          style={styles.title}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          Filtered stocks
        </Text>
        <TouchableOpacity
          style={styles.icon}
          activeOpacity={0.7}
          onPress={edit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${selectedIds.length} selected filters`}
        >
          <Ionicons name="options-outline" size={23} color="#079B73" />
          {selectedIds.length ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedIds.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      <View style={[styles.summary, { paddingHorizontal: layout.padding }]}>
        <Text
          style={[styles.total, { fontSize: layout.symbolFontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {results.data ? `${results.data.total.toLocaleString()} stocks` : 'Loading stocks…'}
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={edit} style={styles.edit}>
          <Text style={styles.editText}>Edit filters</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.note, { paddingHorizontal: layout.padding, fontSize: layout.detailFontSize }]}>
        Saved Firestore data · prices are not live
      </Text>
      <View style={[styles.sorts, { paddingHorizontal: layout.padding }]}>
        {SORTS.map((option) => (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.7}
            onPress={() => setSort(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: sort === option.id }}
            style={[styles.sort, sort === option.id && styles.activeSort]}
          >
            <Text
              style={[
                styles.sortText,
                { fontSize: layout.labelFontSize + 1 },
                sort === option.id && styles.activeSortText,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <StockList
        onAddToPortfolio={(stock) => openPortfolioTransaction({ symbol: stock.symbol, companyName: stock.companyName, logoUrl: stock.logoUrl, currency: stock.currency, exchange: stock.exchange })}
        data={results.data?.items ?? []}
        getItem={toListItem}
        loading={results.loading}
        loadingMessage="Loading matching stocks…"
        priceLabel="Saved price"
        isFavorite={isFavorite}
        updatingSymbol={updatingSymbol}
        watchlistDisabled={watchlistDisabled}
        onToggleWatchlist={(stock) => void handleToggleWatchlist(stock)}
        onStockPress={(stock) => navigation.navigate('StockPilotScoreCard', { stock: toSelectStock(stock) })}
        extraData={{ sort, tickers, watchlistLoading, watchlistUpdating, watchlistError, updatingSymbol }}
        ListEmptyComponent={
          !results.error ? (
            <View style={styles.state}>
              <Ionicons name="filter-outline" size={30} color="#A2AFBD" />
              <Text style={styles.stateText}>No saved stocks match these filters.</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={edit} style={styles.action}>
                <Text style={styles.editText}>Adjust filters</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.bottom}>
            {results.error ? (
              <>
                <Text style={styles.error}>{results.error}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={results.data?.items.length ? results.loadMore : results.retry}
                  style={styles.action}
                >
                  <Text style={styles.editText}>Try again</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {results.data?.nextOffset !== null &&
              results.data?.nextOffset !== undefined &&
              !results.error ? (
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={results.loadingMore}
                onPress={results.loadMore}
                style={styles.loadMore}
                accessibilityRole="button"
                accessibilityState={{ busy: results.loadingMore, disabled: results.loadingMore }}
              >
                {results.loadingMore ? (
                  <ActivityIndicator color="#079B73" size="small" />
                ) : (
                  <Text style={styles.editText}>Load more</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    minHeight: 60,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    marginLeft: 4,
    fontSize: 22,
    fontWeight: '700',
    color: '#081B3A',
  },

  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: '#079B73',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  summary: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  total: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#081B3A',
  },

  edit: {
    minHeight: 44,
    justifyContent: 'center',
    marginLeft: 12,
  },

  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#079B73',
  },

  note: {
    paddingHorizontal: 20,
    fontSize: 11,
    color: '#7788A3',
    flexShrink: 1,
  },

  sorts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },

  sort: {
    minHeight: 40,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE7E4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeSort: {
    backgroundColor: '#EAF8F2',
    borderColor: '#079B73',
  },

  sortText: {
    fontSize: 12,
    color: '#7788A3',
    fontWeight: '600',
  },

  activeSortText: {
    color: '#079B73',
  },

  state: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  stateText: {
    color: '#7788A3',
    textAlign: 'center',
    lineHeight: 21,
  },

  bottom: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },

  action: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadMore: {
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F2',
  },

  error: {
    color: '#B25148',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
