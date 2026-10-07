import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PortfolioActivity } from './components/PortfolioActivity';
import { PortfolioAnalysis } from './components/PortfolioAnalysis';
import { PortfolioFxNotice } from './components/PortfolioFxNotice';
import { PortfolioValueChart } from './components/PortfolioValueChart';
import { PortfolioHoldingActions } from './components/PortfolioHoldingActions';
import { buyMoreDraft, type HoldingAction } from './domain/holdingManagement';
import { PortfolioHoldings } from './components/PortfolioHoldings';
import { Feedback, PortfolioScreen, s } from './components/PortfolioUI';
import { gainColor, money, percent } from './domain/format';
import { stockSummary } from './domain/investments';
import type { PortfolioStackParamList } from './domain/navigation';
import { toScorecardStock } from './domain/toScorecardStock';
import { usePortfolioResource } from './hooks/usePortfolioResource';
import { portfolioRepository } from './infrastructure/HttpPortfolioRepository';

type Props = NativeStackScreenProps<PortfolioStackParamList, 'PortfolioDetail'>;
const TABS = ['Holdings', 'Analysis', 'Activity'] as const;

export default function PortfolioDetail({ navigation, route }: Props) {
  const { portfolioId } = route.params;
  const [managedId, setManagedId] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Holdings');
  const load = useCallback(
    (signal: AbortSignal) => portfolioRepository.detail(portfolioId, signal),
    [portfolioId],
  );
  const resource = usePortfolioResource(load, portfolioId);
  const detail = resource.data;
  const summary = detail ? stockSummary(detail.analysis) : null;
  const usesFx = detail?.analysis.holdings.some(
    (holding) => holding.instrument.currency !== detail.portfolio.currency,
  ) ?? false;
  const canManage = !!detail && !detail.portfolio.archived && !detail.portfolio.deleting
    && !resource.loading && !resource.error;
  const managed = canManage
    ? detail.analysis.holdings.find((holding) => holding.instrument.id === managedId)
    : undefined;
  const closeManagement = useCallback(() => setManagedId(null), []);

  useFocusEffect(useCallback(() => () => setManagedId(null), [portfolioId]));

  const manage = (action: HoldingAction) => {
    if (!managed) return;
    setManagedId(null);
    if (action === 'buy') {
      navigation.navigate('PortfolioTransaction', {
        portfolioId,
        draft: buyMoreDraft(managed.instrument),
        returnToPortfolio: true,
      });
    } else if (action === 'sell') {
      navigation.navigate('PortfolioSale', { portfolioId, instrumentId: managed.instrument.id });
    } else {
      navigation.navigate('PortfolioRemoveEntry', { portfolioId, instrument: managed.instrument });
    }
  };

  return (
    <View style={s.flex}>
      <View
        style={s.flex}
        accessibilityElementsHidden={!!managed}
        importantForAccessibility={managed ? 'no-hide-descendants' : 'auto'}
      >
        <PortfolioScreen
          title={detail?.portfolio.name ?? 'Portfolio'}
          back
          action={(
            <TouchableOpacity
              style={s.iconButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PortfolioSettings', { portfolioId })}
              accessibilityRole="button"
              accessibilityLabel="Portfolio settings"
            >
              <Ionicons name="settings-outline" size={22} color="#081B3A" />
            </TouchableOpacity>
          )}
        >
          {resource.loading && !detail ? <Feedback loading /> : null}
          {resource.error ? <Feedback error={resource.error} onRetry={resource.reload} /> : null}

          {detail && summary ? (
            <ScrollView
              key={portfolioId}
              style={s.flex}
              showsVerticalScrollIndicator={false}
              stickyHeaderIndices={[1]}
              refreshControl={(
                <RefreshControl refreshing={resource.loading} onRefresh={resource.reload} />
              )}
            >
              <View>
                <PortfolioValueChart
                  key={`${portfolioId}-${detail.portfolio.currency}-${detail.portfolio.historyEpoch}`}
                  detail={detail}
                />

                <View style={styles.summary}>
                  <Text style={s.caption}>Investment value · {detail.portfolio.currency}</Text>
                  <Text
                    style={styles.total}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {money(summary.value, detail.portfolio.currency)}
                  </Text>

                  <View style={s.between}>
                    <View style={s.flex}>
                      <Text style={s.caption}>
                        {usesFx ? 'Cost at latest FX' : 'Invested in current holdings'}
                      </Text>
                      <Text style={styles.amount}>
                        {money(summary.invested, detail.portfolio.currency)}
                      </Text>
                    </View>
                    <View style={styles.gain}>
                      <Text style={s.caption}>
                        {usesFx ? 'Price gain (FX excluded)' : 'Unrealised gain / loss'}
                      </Text>
                      <Text style={[styles.amount, { color: gainColor(summary.gain) }]}>
                        {money(summary.gain, detail.portfolio.currency)}
                        {summary.gainPercent !== null ? ` (${percent(summary.gainPercent)})` : ''}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.caption}>
                    {summary.unpriced
                      ? `${summary.unpriced} holdings without a converted value · priced subtotal ${money(summary.pricedSubtotal, detail.portfolio.currency)}.`
                      : 'Stocks only · saved prices are not live.'}
                  </Text>
                </View>
                <PortfolioFxNotice analysis={detail.analysis} />
              </View>

              <View>
                <View style={styles.tabs}>
                  {TABS.map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.tab, tab === value && styles.activeTab]}
                      onPress={() => setTab(value)}
                      activeOpacity={0.7}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: tab === value }}
                    >
                      <Text style={[styles.tabText, tab === value && s.link]}>{value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View key={`${portfolioId}-${tab}`}>
                {tab === 'Holdings' ? (
                  <PortfolioHoldings
                    analysis={detail.analysis}
                    onManage={canManage ? (holding) => setManagedId(holding.instrument.id) : undefined}
                    onPress={(holding) => navigation.navigate('StockPilotScoreCard', {
                      stock: toScorecardStock(holding),
                    })}
                    onSearch={() => navigation.navigate('StockSearch')}
                    onFilter={() => navigation.navigate('StockFilter')}
                  />
                ) : null}
                {tab === 'Analysis' ? <PortfolioAnalysis analysis={detail.analysis} /> : null}
                {tab === 'Activity' ? (
                  <PortfolioActivity
                    portfolioId={portfolioId}
                    currency={detail.portfolio.ledgerCurrency ?? detail.portfolio.currency}
                    initialItems={detail.activity}
                    initialCursor={detail.nextActivityCursor}
                  />
                ) : null}
              </View>
            </ScrollView>
          ) : null}
        </PortfolioScreen>
      </View>

      {managed ? (
        <PortfolioHoldingActions
          holding={managed}
          onSelect={manage}
          onClose={closeManagement}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },

  total: {
    fontSize: 30,
    fontWeight: '700',
    color: '#081B3A',
    fontVariant: ['tabular-nums'],
  },

  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#081B3A',
    marginTop: 3,
  },

  gain: {
    flex: 1,
    alignItems: 'flex-end',
  },

  tabs: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EBF0',
    paddingHorizontal: 16,
  },

  tab: {
    flex: 1,
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeTab: {
    borderBottomColor: '#079B73',
  },

  tabText: {
    fontSize: 14,
    color: '#7788A3',
    fontWeight: '600',
  },
});
