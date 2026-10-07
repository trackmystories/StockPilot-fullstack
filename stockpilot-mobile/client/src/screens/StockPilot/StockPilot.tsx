import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  loadWatchlistMomentum,
  WATCHLIST_MOMENTUM_METRIC,
} from '../WatchList/application/watchlistMomentum';
import { HttpWatchlistRepository } from '../WatchList/infrastructure/HttpWatchlistRepository';
import { AppHeader } from '../components/AppHeader';
import { authenticatedRequest } from '../Auth/infrastructure/authenticatedRequest';
import { useAppSelector } from '../store/hooks';
import { useStocks } from '../stocks/StocksProvider';
import { ExploreStockInsightsButton } from './components/ExploreStockInsightsButton';
import { IndustriesSection } from './components/IndustriesSection';
import { TrendingIndustriesSection } from './components/TrendingIndustriesSection';
import { MarketIndicators } from './components/MarketIndicators';
import { MarketStocksSection } from './components/MarketStocksSection';
import { MARKET_TTL, WATCHLIST_BATCH_SIZE } from './config/stockPilotConfig';
import type { StockRiskDetails } from './infrastructure/HttpStockRiskRepository';
import type { CachedMarket, NavigationProp, SelectStock, StockMarketQuote } from './types/stockPilot';
import { toWatchlistStock } from './utils/toWatchlistStock';
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = width - 74;
const watchlistRepository = new HttpWatchlistRepository();

export default function StockPilot() {
  const navigation = useNavigation<NavigationProp>();
  const token = useAppSelector((state) => state.auth.token);
  const { loading: stocksLoading, refresh: refreshStocks } = useStocks();

  const [marketRefreshKey, setMarketRefreshKey] = useState(0);
  const [activeExploreIndex, setActiveExploreIndex] = useState(0);
  const [watchlistStocks, setWatchlistStocks] = useState<SelectStock[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistWarning, setWatchlistWarning] = useState('');

  const watchlistLoaded = useRef(false);
  const watchlistSerial = useRef(0);
  const watchlistMarket = useRef(new Map<string, CachedMarket>());

  const loadWatchlist = useCallback(
    async (refresh = false) => {
      const request = ++watchlistSerial.current;
      const isCurrent = () => request === watchlistSerial.current;

      if (!token) {
        watchlistMarket.current.clear();
        watchlistLoaded.current = false;
        setWatchlistStocks([]);
        setWatchlistLoading(false);
        setWatchlistWarning('');
        return;
      }

      if (!watchlistLoaded.current) {
        setWatchlistLoading(true);
      }

      setWatchlistWarning('');

      try {
        const saved = await watchlistRepository.getTickers(token);

        if (!isCurrent()) {
          return;
        }

        const tickers = [...new Set(saved.map((value) => value.trim().toUpperCase()))];

        if (tickers.length === 0) {
          watchlistMarket.current.clear();
          watchlistLoaded.current = true;
          setWatchlistStocks([]);
          setWatchlistLoading(false);
          return;
        }

        const next = new Map(watchlistMarket.current);
        const now = Date.now();

        const pending = tickers.filter((symbol) => {
          const cached = next.get(symbol);

          return refresh || !cached || now - cached.updatedAt >= MARKET_TTL;
        });

        let partial = false;

        for (let index = 0; index < pending.length; index += WATCHLIST_BATCH_SIZE) {
          if (!isCurrent()) {
            return;
          }

          const batch = pending.slice(index, index + WATCHLIST_BATCH_SIZE);

          const [quoteResult, riskResults, momentumResults] = await Promise.all([
            authenticatedRequest<{ quotes: StockMarketQuote[] }>(
              `/api/stocks/quotes?symbols=${encodeURIComponent(batch.join(','))}`,
            ).catch(() => {
              partial = true;

              return {
                quotes: [] as StockMarketQuote[],
              };
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

          if (!isCurrent()) {
            return;
          }

          const quotes = new Map(
            quoteResult.quotes.map((quote) => [quote.symbol.toUpperCase(), quote] as const),
          );

          batch.forEach((symbol, batchIndex) => {
            const previous = next.get(symbol);
            const quote = quotes.get(symbol);

            const riskResult = riskResults[batchIndex];
            const risk = riskResult.status === 'fulfilled' ? riskResult.value : undefined;

            const momentumResult = momentumResults[batchIndex];
            const momentumScore =
              momentumResult.status === 'fulfilled'
                ? momentumResult.value
                : (previous?.momentumScore ?? null);

            const complete = quote != null && risk != null && momentumResult.status === 'fulfilled';

            if (!complete) {
              partial = true;
            }

            next.set(symbol, {
              quote: quote ?? previous?.quote,
              risk: risk ?? previous?.risk,
              momentumScore,
              updatedAt: complete ? Date.now() : 0,
            });
          });
        }

        if (!isCurrent()) {
          return;
        }

        const members = new Set(tickers);

        for (const symbol of next.keys()) {
          if (!members.has(symbol)) {
            next.delete(symbol);
          }
        }

        watchlistMarket.current = next;
        watchlistLoaded.current = true;

        const loadedStocks = tickers.map((symbol) => {
          const cached = next.get(symbol);

          return toWatchlistStock(symbol, cached?.quote, cached?.risk, cached?.momentumScore);
        });

        setWatchlistStocks(loadedStocks);

        if (partial) {
          setWatchlistWarning('Some watchlist data could not be refreshed.');
        }
      } catch (error) {
        console.error('Could not load StockPilot watchlist:', error);

        if (!watchlistLoaded.current) {
          setWatchlistStocks([]);
        }

        setWatchlistWarning(error instanceof Error ? error.message : 'Could not load watchlist.');
      } finally {
        if (isCurrent()) {
          setWatchlistLoading(false);
        }
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadWatchlist();

      return () => {
        watchlistSerial.current += 1;
      };
    }, [loadWatchlist]),
  );

  const refreshing = stocksLoading || watchlistLoading;

  const handleRefresh = useCallback(async () => {
    setMarketRefreshKey((value) => value + 1);

    await Promise.all([refreshStocks(), loadWatchlist(true)]);
  }, [refreshStocks, loadWatchlist]);

  const openWatchlist = useCallback(() => {
    navigation.navigate('WatchList');
  }, [navigation]);

  const openStock = useCallback(
    (stock: SelectStock) => {
      navigation.navigate('StockPilotScoreCard', {
        stock,
      });
    },
    [navigation],
  );

  const handleExploreScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));

    setActiveExploreIndex(index);
  };

  const isInitialWatchlistLoading = watchlistLoading && !watchlistLoaded.current;

  const watchlistSubtitle = isInitialWatchlistLoading
    ? 'Loading stocks you follow'
    : `${watchlistStocks.length} ${watchlistStocks.length === 1 ? 'stock' : 'stocks'} you follow`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        onSearchPress={() => navigation.navigate('StockSearch')}
        onNotificationsPress={() => navigation.navigate('Notifications')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <MarketIndicators refreshKey={marketRefreshKey} watchlistStocks={watchlistStocks} />

        <TrendingIndustriesSection
          onOpenResults={(params) => navigation.navigate('StockFilterList', params)}
          onViewAllPress={() => navigation.navigate('StockFilter')}
        />

           <IndustriesSection
          onOpenResults={(params) => navigation.navigate('StockFilterList', params)}
          onViewAllPress={() => navigation.navigate('StockFilter')}
        />

        <View style={styles.exploreCarousel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEventThrottle={16}
            onScroll={handleExploreScroll}
            contentContainerStyle={styles.exploreCarouselContent}
          >
            <ExploreStockInsightsButton
              width={CARD_WIDTH}
              title="Explore Stock Insights"
              subtitle="Discover quality stocks surfaced by our algorithms across financial KPIs."
              icon="smart-lists"
              onPress={() => navigation.navigate('StockFilter')}
            />

            <ExploreStockInsightsButton
              width={CARD_WIDTH}
              title="Read our articles"
              subtitle="Stay informed with company news, market insights and investor research."
              icon="articles"
              onPress={() => navigation.navigate('News')}
            />
          </ScrollView>

          <View style={styles.carouselDots}>
            <View style={activeExploreIndex === 0 ? styles.activeDot : styles.dot} />
            <View style={activeExploreIndex === 1 ? styles.activeDot : styles.dot} />
          </View>
        </View>

        {!!watchlistWarning && <Text style={styles.watchlistWarning}>{watchlistWarning}</Text>}

        {isInitialWatchlistLoading || watchlistStocks.length > 0 ? (
          <MarketStocksSection
            metric={WATCHLIST_MOMENTUM_METRIC}
            title="Your Watchlist"
            subtitle={watchlistSubtitle}
            stocks={watchlistStocks}
            loading={isInitialWatchlistLoading}
            onViewAllPress={openWatchlist}
            onStockPress={openStock}
          />
        ) : (
          <View style={styles.watchlistSection}>
            <View style={styles.watchlistHeader}>
              <Text style={styles.watchlistTitle}>Your Watchlist</Text>
            </View>

            <View style={styles.emptyWatchlist}>
              <View style={styles.emptyWatchlistIcon}>
                <Text style={styles.emptyWatchlistIconText}>♡</Text>
              </View>

              <Text style={styles.emptyWatchlistTitle}>Start following stocks</Text>

              <Text style={styles.emptyWatchlistDescription}>
                Follow stocks to keep track of momentum and quickly return to the companies you care
                about.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FCFB',
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  exploreCarousel: {
    marginTop: 15,
    marginBottom: 2,
    marginHorizontal: -20,
  },
  exploreCarouselContent: {
    paddingLeft: 20,
    paddingRight: 54,
    gap: CARD_GAP,
  },
  carouselDots: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeDot: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#08A66D',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9E6E2',
  },
  watchlistWarning: {
    marginTop: 18,
    fontSize: 12,
    color: '#71819B',
  },
  watchlistSection: {
    marginTop: 28,
  },
  watchlistHeader: {
    marginBottom: 12,
  },
  watchlistTitle: {
    fontSize: 21,
    fontFamily: 'Inter_700Bold',
    color: '#081B3A',
  },
  emptyWatchlist: {
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2ECE8',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyWatchlistIcon: {
    width: 52,
    height: 52,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#E8F8F2',
  },
  emptyWatchlistIconText: {
    fontSize: 29,
    color: '#08A66D',
  },
  emptyWatchlistTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#081B3A',
  },
  emptyWatchlistDescription: {
    maxWidth: 300,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#7788A3',
  },
});
