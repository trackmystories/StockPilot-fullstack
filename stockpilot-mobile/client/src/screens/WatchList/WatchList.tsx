import { loadWatchlistMomentum, type WatchlistStock } from './application/watchlistMomentum';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {WatchListStackParamList} from '../../';
import {useAppSelector} from '../store/hooks';
import {StockList} from '../components/StockList';
import {useOpenPortfolioTransaction} from '../Portfolio/hooks/useOpenPortfolioTransaction';
import type {StockListItem} from '../components/stockListPresentation';
import {ScreenHeader} from '../components/ScreenHeader';
import type {SelectStock} from '../StockPilot/types/stockPilot';
import type {StockRiskDetails} from '../StockPilot/infrastructure/HttpStockRiskRepository';
import {authenticatedRequest} from '../Auth/infrastructure/authenticatedRequest';
import {HttpWatchlistRepository} from './infrastructure/HttpWatchlistRepository';
import {AppHeader} from '../components/AppHeader';

type Props = NativeStackScreenProps<WatchListStackParamList, 'WatchListScreen'>;
// Keep the numeric amount for display; SelectStock.marketCap remains its navigation size label.
type WatchlistEntry = WatchlistStock & {marketCapValue: number | null};
type SortOption = 'default' | 'company' | 'price' | 'change' | 'marketCap' | 'momentum';

type Quote = {
  symbol: string;
  name?: string | null;
  price: number | null;
  change: number | null;
  changePercentage: number | null;
  marketCap?: number | null;
  currency?: string | null;
  asOf?: string;
  source?: string;
};

type CachedMarket = {
  momentumScore?: number | null;
  quote?: Quote;
  risk?: StockRiskDetails;
  updatedAt: number;
};

const repository = new HttpWatchlistRepository();
const MARKET_TTL = 60_000;

function toStock(
  symbol: string,
  quote?: Quote,
  risk?: StockRiskDetails,
  momentumScore: number | null = null,
): WatchlistEntry {

  const metric = () => ({
    score: null,
    description: 'Not available.',
  });
  
  const cap = quote?.marketCap;

  return {
    symbol,
    marketCapValue: typeof cap === 'number' && Number.isFinite(cap) ? cap : null,
    companyName: risk?.companyName || quote?.name || symbol,
    logoUrl: risk?.logoUrl ?? null,
    themeId: '' as SelectStock['themeId'],
    themeName: '',
    sector: '',
    marketCap:
      cap == null
        ? null
        : cap >= 200e9
          ? 'Mega'
          : cap >= 10e9
            ? 'Large'
            : cap >= 2e9
              ? 'Mid'
              : 'Small',
    score: null,
    riskScore: risk?.riskScore ?? null,
    riskLevel: risk?.riskLevel ?? null,
    volatilityScore: risk?.volatilityScore ?? null,
    thesis: '',
    price: quote?.price ?? null,
    change: quote?.change ?? null,
    changePercentage: quote?.changePercentage ?? null,
    featured: false,
    trend: [],
    revenueGrowth: null,
    profitability: null,
    debt: null,
    analystUpside: null,
    momentum: null,
    momentumScore,
    percentFromATH: null,
    percentFromATL: null,
    growth: metric(),
    valuation: metric(),
    financialHealth: metric(),
    marketOutlook: metric(),
    highlights: [],
    investmentThesis: {
      confidence: null,
      text: '',
    },
    earnings: {
      nextEarnings: null,
      estimatedEps: null,
      epsGrowth: null,
      estimatedRevenue: null,
      revenueGrowth: null,
    },
    catalysts: [],
    priceTargets: {
      bear: null,
      base: null,
      bull: null,
    },
    upsidePotential: null,
    bullCase: [],
    bearCase: [],
    quote: {
      currency: 'USD',
      asOf: quote?.asOf ?? null,
      source: quote?.source,
      status: quote?.price != null ? 'available' : 'unavailable',
    },
  };
}
function toListItem(stock: WatchlistEntry): StockListItem {
  return {
    symbol: stock.symbol,
    companyName: stock.companyName,
    logoUrl: stock.logoUrl,
    price: stock.price ?? null,
    currency: stock.quote?.currency ?? null,
    marketCap: stock.marketCapValue,
    momentumScore: stock.momentumScore,
  };
}
function compareNumbers(a: number | null | undefined, b: number | null | undefined): number {
  const left = typeof a === 'number' && Number.isFinite(a) ? a : null;
  const right = typeof b === 'number' && Number.isFinite(b) ? b : null;
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return right - left;
}
const isWatchlistMember = () => true;
export default function WatchList(props: Props) {
  const uid = useAppSelector((state) => state.auth.user?.uid);
  // Clear the previous account's state when the signed-in user changes.
  return <WatchListContent key={uid ?? 'signed-out'} {...props} />;
}
function WatchListContent({navigation}: Props) {
  const openPortfolioTransaction = useOpenPortfolioTransaction();
  const token = useAppSelector((state) => state.auth.token);
  const [stocks, setStocks] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [sort, setSort] = useState<SortOption>('default');
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);
  const removeLock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const serial = useRef(0);
  const loaded = useRef(false);
  const market = useRef(new Map<string, CachedMarket>());
  const load = useCallback(
    async (refresh = false) => {
      if (removeLock.current) return;
      const request = ++serial.current;
      const isCurrent = () => request === serial.current;
      if (!token) {
        market.current.clear();
        loaded.current = false;
        setStocks([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      // Returning to the tab never hides an already loaded list.
      setLoading(!loaded.current);
      setRefreshing(refresh && loaded.current);
      setError('');
      setWarning('');
      try {
        // Always check for watchlist additions/removals.
        const saved = await repository.getTickers(token);
        if (!isCurrent()) return;
        const tickers = [...new Set(saved.map((value) => value.trim().toUpperCase()))];
        const next = new Map(market.current);
        const now = Date.now();
        // Only request new or stale market data, unless manually refreshed.
        const pending = tickers.filter((symbol) => {
          const cached = next.get(symbol);
          return refresh || !cached || now - cached.updatedAt >= MARKET_TTL;
        });

        let partial = false;
        for (let i = 0; i < pending.length; i += 3) {
          if (!isCurrent()) return;
          const batch = pending.slice(i, i + 3);
          // Bounded batches: quotes, risk, and prepared momentum for three symbols.
          const [quoteResult, riskResults, momentumResults] = await Promise.all([
            authenticatedRequest<{quotes: Quote[]}>(
              `/api/stocks/quotes?symbols=${encodeURIComponent(batch.join(','))}`,
            ).catch(() => {
              partial = true;
              return {quotes: [] as Quote[]};
            }),
            Promise.allSettled(
              batch.map((symbol) =>
                authenticatedRequest<StockRiskDetails>(
                  `/api/stocks/${encodeURIComponent(symbol)}/risk`,
                ),
              ),
            ),
            Promise.allSettled(batch.map((symbol) => loadWatchlistMomentum(symbol))),
          ]);
          if (!isCurrent()) return;
          const quotes = new Map(
            quoteResult.quotes.map((quote) => [quote.symbol.toUpperCase(), quote] as const),
          );
          batch.forEach((symbol, index) => {
            const previous = next.get(symbol);
            const quote = quotes.get(symbol);
            const result = riskResults[index];
            const risk = result.status === 'fulfilled' ? result.value : undefined;
            const momentumResult = momentumResults[index];
            const momentumScore =
              momentumResult.status === 'fulfilled' ? momentumResult.value : null;
            const complete = quote != null && risk != null && momentumResult.status === 'fulfilled';
            if (!complete) partial = true;
            next.set(symbol, {
              quote: quote ?? previous?.quote,
              risk: risk ?? previous?.risk,
              momentumScore,
              updatedAt: complete ? Date.now() : 0,
            });
          });
        }
        if (!isCurrent()) return;
        const members = new Set(tickers);
        for (const symbol of next.keys()) {
          if (!members.has(symbol)) next.delete(symbol);
        }
        market.current = next;
        loaded.current = true;
        // Update together after enrichment, without intermediate empty rows.
        setStocks(
          tickers.map((symbol) => {
            const cached = next.get(symbol);
            return toStock(symbol, cached?.quote, cached?.risk, cached?.momentumScore);
          }),
        );
        if (partial) {
          setWarning('Some data could not be refreshed. Showing saved data where available.');
        }
      } catch (cause) {
        if (!isCurrent()) return;
        const message = cause instanceof Error ? cause.message : 'Could not load watchlist.';
        // Background failures leave the populated list visible.
        if (loaded.current) {
          setWarning(message);
        } else {
          setError(message);
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token],
  );
  const removeFromWatchlist = useCallback(
    async (stock: WatchlistEntry) => {
      if (!token || removeLock.current) return;
      removeLock.current = true;
      setRemovingSymbol(stock.symbol);
      try {
        await repository.removeStock(token, stock.symbol);
        if (!mounted.current) return;
        // A quote/membership load started before removal must not resurrect this row.
        serial.current += 1;
        market.current.delete(stock.symbol);
        setStocks((current) => current.filter((item) => item.symbol !== stock.symbol));
        setLoading(false);
        setRefreshing(false);
      } catch (cause) {
        if (mounted.current) {
          Alert.alert(
            'Could not update watchlist',
            cause instanceof Error ? cause.message : 'Please try again.',
          );
        }
      } finally {
        removeLock.current = false;
        if (mounted.current) setRemovingSymbol(null);
      }
    },
    [token],
  );
  const sortedStocks = useMemo(() => {
    if (sort === 'default') return stocks;
    return [...stocks].sort((a, b) => {
      switch (sort) {
        case 'company':
          return (a.companyName || a.symbol).localeCompare(b.companyName || b.symbol);
        case 'price':
          return compareNumbers(a.price, b.price);
        case 'change':
          return compareNumbers(a.changePercentage, b.changePercentage);
        case 'marketCap':
          return compareNumbers(a.marketCapValue, b.marketCapValue);
        case 'momentum':
          return compareNumbers(a.momentumScore, b.momentumScore);
        default:
          return 0;
      }
    });
  }, [sort, stocks]);
  const showSortOptions = () => {
    Alert.alert('Sort stocks', '', [
      {text: 'Original order', onPress: () => setSort('default')},
      {text: 'Company: A–Z', onPress: () => setSort('company')},
      {text: 'Price: highest first', onPress: () => setSort('price')},
      {text: 'Daily change: highest first', onPress: () => setSort('change')},
      {text: 'Market cap: highest first', onPress: () => setSort('marketCap')},
      {text: 'Momentum: highest first', onPress: () => setSort('momentum')},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        serial.current++;
      };
    }, [load]),
  );
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader
        onSearchPress={() => {
          navigation.navigate('StockSearch');
        }}
        onNotificationsPress={() => {
          navigation.navigate('Notifications');
        }}
      />
      {loading ? (
        <View style={styles.feedback}>
          <ActivityIndicator color="#087A61" />
        </View>
      ) : error ? (
        <View style={styles.feedback}>
          <Text>{error}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => void load()}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {!!warning && <Text style={styles.warning}>{warning}</Text>}
          <ScreenHeader
            title="Watchlist"
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
            }}
          />
          <View style={styles.toolbar}>
            <Text style={styles.subtitle}>Stocks you are following</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={showSortOptions}
              style={[styles.sortButton, sort !== 'default' && styles.sortButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Sort watchlist stocks"
            >
              <Text style={styles.sortText}>Sort</Text>
              <Ionicons name="swap-vertical-outline" size={16} color="#071B43" />
            </TouchableOpacity>
          </View>
          <StockList
            onAddToPortfolio={(stock) => openPortfolioTransaction({
              symbol: stock.symbol,
              companyName: stock.companyName,
              logoUrl: stock.logoUrl,
              // Use source currency when provided, not the watchlist's USD display fallback.
              // Unknown currency is resolved by the existing investment form.
              currency: market.current.get(stock.symbol)?.quote?.currency ?? null,
            })}
            data={sortedStocks}
            getItem={toListItem}
            priceLabel="Price"
            isFavorite={isWatchlistMember}
            updatingSymbol={removingSymbol}
            watchlistDisabled={!token || removingSymbol !== null}
            onToggleWatchlist={(stock) => void removeFromWatchlist(stock)}
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            onStockPress={(stock) => navigation.navigate('StockPilotScoreCard', {stock})}
            extraData={{sort, removingSymbol}}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {token ? 'No stocks in your watchlist yet.' : 'Sign in to view your watchlist.'}
              </Text>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  feedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  retry: {
    color: '#087A61',
    fontWeight: '600',
    padding: 12,
  },
  warning: {
    padding: 16,
    color: '#71819B',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  subtitle: {flex: 1, minWidth: 0, color: '#079B6D', fontSize: 16, fontWeight: '600'},
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
  sortButtonActive: {borderColor: '#079B6D', backgroundColor: '#ECF8F4'},
  sortText: {color: '#071B43', fontSize: 13, fontWeight: '600'},
  emptyText: {padding: 20, color: '#71819B', textAlign: 'center', fontSize: 13},
});
