import {useEffect, useState} from 'react';
import {useTheme} from '@react-navigation/native';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../';
import Tape from '../Tape/Tape';
import {useAppSelector} from '../store/hooks';
import {useFmpCompanyProfile} from '../stocks/useFmpCompanyProfile';
import {useFmpFinancialMetrics} from '../stocks/useFmpFinancialMetrics';
import {useFmpQuote} from '../stocks/useFmpQuote';
import {useFmpStockChart, type StockChartRange} from '../stocks/useFmpStockChart';
import {useStockIntelligence} from '../stocks/useStockIntelligence';
import {HttpWatchlistRepository} from '../WatchList/infrastructure/HttpWatchlistRepository';
import {useOpenPortfolioTransaction} from '../Portfolio/hooks/useOpenPortfolioTransaction';
import AllScoreCards from './AllScoreCards';
import Analysis from './Analysis';
import Research from './Research';
import {ScoreCardHeader} from './components/ScoreCardHeader';
import {ScoreCardTabs, type ScoreCardTab} from './components/ScoreCardTabs';
import {buildHeaderStock, buildScoreCards} from './domain/scoreCardBuilders';

type Props = {
  route: {params: HomeStackParamList['StockPilotScoreCard']};
  navigation: Pick<NativeStackNavigationProp<HomeStackParamList>, 'goBack'>;
};

const watchlistRepository = new HttpWatchlistRepository();

export default function StockPilotScoreCard({route, navigation}: Props) {
  const {stock} = route.params;
  const openPortfolioTransaction = useOpenPortfolioTransaction();
  const {colors} = useTheme();
  const token = useAppSelector((state) => state.auth.token);
  const [activeTab, setActiveTab] = useState<ScoreCardTab>('analysis');
  const [chartRange, setChartRange] = useState<StockChartRange>('1D');

  const {
    quote,
    loading: quoteLoading,
    error: quoteError,
    refresh: refreshQuote,
  } = useFmpQuote(stock.symbol, token);

  const chart = useFmpStockChart(stock.symbol, chartRange, token);
  const financials = useFmpFinancialMetrics(stock.symbol, token);
  const companyProfile = useFmpCompanyProfile(stock.symbol, token);

  const {
    data: intelligence,
    loading: intelligenceLoading,
    error: intelligenceError,
    refresh: refreshIntelligence,
    fromCache: intelligenceFromCache,
    cachedAt: intelligenceCachedAt,
  } = useStockIntelligence(stock.symbol, token);

  const epsDilutedTtm = financials.metrics?.dilution.epsDilutedTtm ?? null;

  const headerStock = buildHeaderStock({
    stock,
    quote,
    companyProfile: companyProfile.profile,
    epsDilutedTtm,
  });

  const scoreCards = buildScoreCards({
    stock,
    intelligence,
  });

  const savedDataCachedAt =
    activeTab === 'analysis' && financials.fromCache
      ? financials.cachedAt
      : activeTab === 'scores' && intelligenceFromCache
        ? intelligenceCachedAt
        : null;

  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(true);

  useEffect(() => {
    const loadFavorite = async () => {
      if (!token) {
        setLoadingFavorite(false);
        return;
      }

      try {
        const tickers = await watchlistRepository.getTickers(token);
        setIsFavorite(tickers.includes(stock.symbol));
      } catch (error) {
        console.error('Could not load favorite:', error);
      } finally {
        setLoadingFavorite(false);
      }
    };

    void loadFavorite();
  }, [token, stock.symbol]);

  const handleFavoritePress = async () => {
    if (!token || loadingFavorite) {
      return;
    }

    try {
      if (isFavorite) {
        await watchlistRepository.removeStock(token, stock.symbol);
        setIsFavorite(false);
        return;
      }

      await watchlistRepository.addStock(token, stock.symbol);
      setIsFavorite(true);
    } catch (error) {
      console.error('Could not update favorite:', error);
    }
  };

  return (
     <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[1]}
      >
        <View>
          <ScoreCardHeader
            stock={headerStock}
            onBack={() => navigation.goBack()}
            isFavorite={isFavorite}
            onFavoritePress={handleFavoritePress}
            onAddToPortfolio={() => openPortfolioTransaction({
              symbol: stock.symbol,
              companyName: headerStock.companyName ?? stock.companyName ?? stock.symbol,
              logoUrl: headerStock.logoUrl ?? stock.logoUrl ?? null,
              currency: stock.quote?.currency ?? null,
              exchange: headerStock.exchange ?? null,
            })}
          />

          {quoteLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Loading market data…</Text>
            </View>
          ) : null}

          {quoteError ? (
            <View style={styles.error}>
              <Text style={styles.errorText}>{quoteError}</Text>

              <Pressable onPress={refreshQuote}>
                <Text style={styles.retry}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={[styles.stickyTabs, {backgroundColor: colors.background}]}>
          <ScoreCardTabs activeTab={activeTab} onChange={setActiveTab} />
        </View>

        {savedDataCachedAt ? (
          <View style={styles.savedDataNotice}>
            <Text style={styles.savedDataNoticeText}>
              Saved data · last refreshed {new Date(savedDataCachedAt).toLocaleString()}
            </Text>
          </View>
        ) : null}

        {activeTab === 'analysis' ? (
          <Analysis
            token={token}
            onViewFullReport={() => setActiveTab('report')}
            symbol={stock.symbol}
            chart={chart}
            chartRange={chartRange}
            onChartRangeChange={setChartRange}
            financials={financials}
            companyProfile={companyProfile}
          />
        ) : null}

        {activeTab === 'scores' ? (
          <>
            {intelligenceLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="small" color="#079B73" />
                <Text style={styles.loadingText}>Calculating stock scores…</Text>
              </View>
            ) : null}

            {intelligenceError ? (
              <View style={styles.error}>
                <Text style={styles.errorText}>{intelligenceError}</Text>

                <Pressable onPress={refreshIntelligence}>
                  <Text style={styles.retry}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {!intelligenceLoading && !intelligenceError ? (
              <AllScoreCards embedded scores={scoreCards} />
            ) : null}
          </>
        ) : null}

        {activeTab === 'tape' ? (
          <Tape
            embedded
            route={{params: {symbol: stock.symbol}}}
            navigation={{goBack: () => navigation.goBack()}}
          />
        ) : null}

        {activeTab === 'report' ? <Research symbol={stock.symbol} token={token} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  stickyTabs: {
    zIndex: 1,
  },
  savedDataNotice: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EAF8F2',
  },
  savedDataNoticeText: {
    fontSize: 12,
    color: '#087758',
  },
  loading: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#667792',
  },
  error: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B54747',
  },
  retry: {
    fontSize: 13,
    fontWeight: '600',
    color: '#079B73',
  },
});