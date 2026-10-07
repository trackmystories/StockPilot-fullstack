import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddToPortfolioIcon } from '../../components/AddToPortfolioIcon';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { HttpWatchlistRepository } from '../../WatchList/infrastructure/HttpWatchlistRepository';
import { useFmpStockSearch } from '../../stocks/useFmpStockSearch';
import {
  HttpStockRiskRepository,
  type StockRiskDetails,
} from '../infrastructure/HttpStockRiskRepository';
import type { SelectStock } from '../types/stockPilot';
import { useOpenPortfolioTransaction } from '../../Portfolio/hooks/useOpenPortfolioTransaction';

const watchlistRepository = new HttpWatchlistRepository();
const stockRiskRepository = new HttpStockRiskRepository();

type Props = {
  autoFocus?: boolean;
  onBack?: () => void;
  onFilterPress?: () => void;
  onStockPress: (stock: SelectStock) => void;
};

function toSearchStock(
  stock: {
    symbol: string;
    name: string;
    currency: string | null;
    logoUrl: string | null;
  },
  risk: StockRiskDetails | null,
): SelectStock {
  const metric = { score: null, description: 'Not available.' };

  return {
    symbol: stock.symbol.trim().toUpperCase(),
    companyName: risk?.companyName ?? stock.name,
    logoUrl: risk?.logoUrl ?? stock.logoUrl,
    themeId: '' as SelectStock['themeId'],
    themeName: '',
    sector: '',
    marketCap: null,
    score: null,
    riskScore: risk?.riskScore ?? null,
    riskLevel: risk?.riskLevel ?? null,
    volatilityScore: risk?.volatilityScore ?? null,
    thesis: '',
    price: null,
    change: null,
    changePercentage: null,
    featured: false,
    trend: [],
    revenueGrowth: null,
    profitability: null,
    debt: null,
    analystUpside: null,
    momentum: null,
    percentFromATH: null,
    percentFromATL: null,
    growth: metric,
    valuation: metric,
    financialHealth: metric,
    marketOutlook: metric,
    highlights: [],
    investmentThesis: { confidence: null, text: '' },
    earnings: {
      nextEarnings: null,
      estimatedEps: null,
      epsGrowth: null,
      estimatedRevenue: null,
      revenueGrowth: null,
    },
    catalysts: [],
    priceTargets: { bear: null, base: null, bull: null },
    upsidePotential: null,
    bullCase: [],
    bearCase: [],
    quote: { currency: stock.currency ?? 'USD', asOf: null },
  };
}

export function StockSearchSection({
  onStockPress,
  onBack,
  onFilterPress,
  autoFocus = false,
}: Props) {
  const openPortfolioTransaction = useOpenPortfolioTransaction();
  const input = useRef<TextInput>(null);
  const focused = useRef(false);
  const opening = useRef(false);
  const [search, setSearch] = useState('');
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [updatingTickers, setUpdatingTickers] = useState<string[]>([]);
  const [openingTicker, setOpeningTicker] = useState<string | null>(null);
  const token = useAppSelector((state) => state.auth.token);
  const { results, loading, error } = useFmpStockSearch(search);

  useEffect(() => {
    if (autoFocus) {
      input.current?.focus();
    }
  }, [autoFocus]);

  const loadWatchlist = useCallback(async () => {
    if (!token) {
      setWatchlistTickers([]);
      return;
    }

    try {
      setWatchlistLoading(true);

      const tickers = await watchlistRepository.getTickers(token);

      setWatchlistTickers(tickers.map((ticker) => ticker.trim().toUpperCase()));
    } catch (error) {
      console.error('Could not load watchlist:', error);
    } finally {
      setWatchlistLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void loadWatchlist();

      return () => {
        focused.current = false;
      };
    }, [loadWatchlist]),
  );

  const watchlistTickerSet = useMemo(
    () => new Set(watchlistTickers.map((ticker) => ticker.toUpperCase())),
    [watchlistTickers],
  );

  const handleStockPress = async (stock: (typeof results)[number]) => {
    const symbol = stock.symbol.trim().toUpperCase();

    if (opening.current) {
      return;
    }

    try {
      opening.current = true;
      setOpeningTicker(symbol);

      const risk = token ? await stockRiskRepository.getRisk(token, symbol) : null;

      if (focused.current) {
        onStockPress(toSearchStock(stock, risk));
      }
    } catch (error) {
      console.error(`Could not load risk data for ${symbol}:`, error);

      if (focused.current) {
        onStockPress(toSearchStock(stock, null));
      }
    } finally {
      opening.current = false;
      setOpeningTicker(null);
    }
  };

  const handleToggleWatchlist = async (ticker: string) => {
    if (!token) {
      console.error('Cannot update watchlist without auth token.');
      return;
    }

    const normalizedTicker = ticker.trim().toUpperCase();

    if (updatingTickers.includes(normalizedTicker)) {
      return;
    }

    const isFavorite = watchlistTickerSet.has(normalizedTicker);

    try {
      setUpdatingTickers((current) => [...current, normalizedTicker]);

      if (isFavorite) {
        await watchlistRepository.removeStock(token, normalizedTicker);

        setWatchlistTickers((current) =>
          current.filter((item) => item.toUpperCase() !== normalizedTicker),
        );
      } else {
        await watchlistRepository.addStock(token, normalizedTicker);

        setWatchlistTickers((current) => {
          const exists = current.some((item) => item.toUpperCase() === normalizedTicker);

          if (exists) {
            return current;
          }

          return [...current, normalizedTicker];
        });
      }
    } catch (error) {
      console.error(`Could not update watchlist for ${normalizedTicker}:`, error);

      await loadWatchlist();
    } finally {
      setUpdatingTickers((current) => current.filter((item) => item !== normalizedTicker));
    }
  };

  const hasSearch = search.trim().length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.searchHeader}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          hitSlop={10}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={30} color="#081B3A" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <Ionicons name="search-outline" size={23} color="#081B3A" />
          </View>

          <TextInput
            ref={input}
            accessibilityLabel="Search by company or ticker"
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#7184A1"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />

          {loading ? (
            <ActivityIndicator size="small" color="#08A66D" />
          ) : search ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSearch('')}
              hitSlop={8}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={19} color="#7788A3" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onFilterPress}
          hitSlop={10}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Search filters"
        >
          <Ionicons name="options-outline" size={28} color="#081B3A" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {hasSearch && !loading && !error ? (
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.resultsTitle}>Search results</Text>

              <Text style={styles.resultsSubtitle}>Tap a stock to explore its scorecard</Text>
            </View>

            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>{results.length}</Text>
            </View>
          </View>

          {results.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No stocks found</Text>

              <Text style={styles.emptyText}>Try another ticker or company name.</Text>
            </View>
          ) : (
            results.map((item, index) => {
              const ticker = item.symbol.toUpperCase();
              const isFavorite = watchlistTickerSet.has(ticker);
              const isUpdating = updatingTickers.includes(ticker);
              const isOpening = openingTicker === ticker;

              return (
                <TouchableOpacity
                  key={`${item.symbol}-${item.exchange ?? index}`}
                  activeOpacity={0.78}
                  disabled={openingTicker !== null}
                  onPress={() => void handleStockPress(item)}
                  style={styles.stockRow}
                >
                  <View style={styles.stockIdentity}>
                    <View style={styles.symbolBadge}>
                      {isOpening ? (
                        <ActivityIndicator size="small" color="#08A66D" />
                      ) : item.logoUrl ? (
                        <Image
                          source={{
                            uri: item.logoUrl,
                          }}
                          style={styles.stockLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.symbolBadgeText}>
                          {item.symbol.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.stockText}>
                      <View style={styles.symbolRow}>
                        <Text style={styles.symbol}>{item.symbol}</Text>

                        {item.exchange ? (
                          <View style={styles.exchangeBadge}>
                            <Text style={styles.exchange}>{item.exchange}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text numberOfLines={1} style={styles.stockName}>
                        {item.name}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={isUpdating || watchlistLoading}
                      hitSlop={8}
                      style={styles.heartButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        void handleToggleWatchlist(ticker);
                      }}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#08A66D" />
                      ) : (
                        <Ionicons
                          name={isFavorite ? 'heart' : 'heart-outline'}
                          size={23}
                          color="#08A66D"
                        />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.portfolioButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${item.symbol} to a portfolio`}
                      onPress={(event) => {
                        event.stopPropagation();
                        openPortfolioTransaction({
                          symbol: item.symbol,
                          companyName: item.name,
                          currency: item.currency,
                          logoUrl: item.logoUrl,
                          exchange: item.exchange,
                        });
                      }}
                    >
                      <AddToPortfolioIcon />
                    </TouchableOpacity>

                    <View style={styles.arrowButton}>
                      <Ionicons name="chevron-forward" size={21} color="#08A66D" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  portfolioButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    marginTop: 10,
  },

  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerButton: {
    width: 22,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE5EF',
    borderRadius: 29,
    backgroundColor: '#F0F4F3',
    marginTop: 5,
  },

  searchIcon: {
    width: 32,
    height: 38,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchInput: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 9,
    borderRadius: 22,
    backgroundColor: '#EEF3F2',
  },

  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  error: {
    marginTop: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#D64545',
  },

  resultsSection: {
    marginTop: 26,
  },

  resultsHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultsTitle: {
    fontSize: 21,
    fontFamily: 'Inter_700Bold',
    color: '#081B3A',
  },

  resultsSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#7788A3',
  },

  resultCount: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F8F2',
  },

  resultCountText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#08A66D',
  },

  stockRow: {
    minHeight: 84,
    marginBottom: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2ECE8',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },

  stockIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  symbolBadge: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#E8F8F2',
  },

  stockLogo: {
    width: 34,
    height: 34,
  },

  symbolBadgeText: {
    fontSize: 19,
    fontFamily: 'Inter_700Bold',
    color: '#08A66D',
  },

  stockText: {
    flex: 1,
    minWidth: 0,
  },

  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  symbol: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#081B3A',
  },

  exchangeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F0FBF7',
  },

  exchange: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#087A61',
  },

  stockName: {
    marginTop: 4,
    fontSize: 14,
    color: '#7788A3',
  },

  actions: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  heartButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FBF7',
  },

  emptyState: {
    paddingVertical: 35,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#081B3A',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#7788A3',
  },

  buy: {
    color: '#08A66D',
    fontWeight: '600',
  },

  sell: {
    color: '#D64545',
    fontWeight: '600',
  },
});
