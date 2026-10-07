import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PortfolioCreateForm } from './components/PortfolioCreateForm';
import { Button, Feedback, PortfolioScreen, s } from './components/PortfolioUI';
import { money } from './domain/format';
import { normalizedCurrency, stockSummary } from './domain/investments';
import type { PortfolioStackParamList } from './domain/navigation';
import type { PortfolioMeta } from './domain/portfolio';
import { usePortfolioResource } from './hooks/usePortfolioResource';
import { portfolioRepository } from './infrastructure/HttpPortfolioRepository';

type Props = NativeStackScreenProps<PortfolioStackParamList, 'PortfoliosHome'>;

export default function Portfolios({ navigation, route }: Props) {
  const draft = route.params?.draft;
  const [creating, setCreating] = useState(route.params?.creating ?? false);
  const [showArchived, setShowArchived] = useState(false);
  const load = useCallback((signal: AbortSignal) => portfolioRepository.list(showArchived, signal), [showArchived]);
  const resource = usePortfolioResource(load, `portfolios-${showArchived}`);

  useEffect(() => {
    if (route.params?.creating) setCreating(true);
  }, [route.params?.creating, draft]);

  const created = (portfolio: PortfolioMeta) => {
    setCreating(false);
    if (draft) {
      navigation.replace('PortfolioTransaction', { draft, portfolioId: portfolio.id });
    } else {
      navigation.setParams({ creating: false });
      navigation.navigate('PortfolioDetail', { portfolioId: portfolio.id });
    }
  };

  const cancel = () => {
    setCreating(false);
    if (draft) navigation.replace('PortfolioTransaction', { draft });
    else navigation.setParams({ creating: false });
  };

  return (
    <PortfolioScreen
      title="Portfolios"
      action={(
        <TouchableOpacity
          style={s.iconButton}
          onPress={() => setCreating(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Create portfolio"
        >
          <Ionicons name="add" size={27} color="#079B73" />
        </TouchableOpacity>
      )}
    >
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={resource.loading && !!resource.data} onRefresh={resource.reload} />}
      >
        {creating ? <PortfolioCreateForm
          defaultCurrency={normalizedCurrency(draft?.stock.currency) ?? 'USD'}
          onCreated={created}
          onCancel={cancel}
        /> : null}
        {draft ? <Text style={s.caption}>Choose a portfolio for {draft.stock.symbol}, or create a new one above.</Text> : null}
        {resource.loading && !resource.data ? <Feedback loading /> : null}
        {resource.error ? <Feedback error={resource.error} onRetry={resource.reload} /> : null}
        {resource.data?.items.map(({ portfolio, analysis }) => {
          const summary = stockSummary(analysis);
          const compatible = !draft || !portfolio.deleting;
          return (
            <TouchableOpacity
              key={portfolio.id}
              style={[styles.row, !compatible && s.disabled]}
              disabled={!compatible}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${portfolio.name}, ${portfolio.currency}${portfolio.archived ? ', archived' : ''}`}
              onPress={() => {
                if (portfolio.archived || portfolio.deleting) navigation.navigate('PortfolioSettings', { portfolioId: portfolio.id });
                else if (draft) navigation.replace('PortfolioTransaction', { draft, portfolioId: portfolio.id });
                else navigation.navigate('PortfolioDetail', { portfolioId: portfolio.id });
              }}
            >
              <View style={styles.icon}><Ionicons name="briefcase-outline" size={22} color="#079B73" /></View>
              <View style={s.flex}>
                <Text style={styles.name} numberOfLines={1}>{portfolio.name}</Text>
                <Text style={s.caption}>{portfolio.deleting ? 'Deletion pending · retry in settings' : `${analysis.holdings.length} holdings · totals in ${portfolio.currency}${portfolio.archived ? ' · Archived' : ''}`}</Text>
              </View>
              <View style={styles.valueBlock}>
                <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{portfolio.deleting ? '—' : money(summary.value, portfolio.currency)}</Text>
                <Text style={s.caption}>{portfolio.deleting ? 'Not available' : summary.value === null ? 'Partially valued' : 'Stock value'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#7788A3" />
            </TouchableOpacity>
          );
        })}
        {resource.data?.items.length === 0 && !creating ? (
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={32} color="#079B73" />
            <Text style={s.sectionTitle}>Your investments, in one place</Text>
            <Text style={s.caption}>Create a portfolio, then add stocks from search or filtered lists.</Text>
            <Button label="Create portfolio" onPress={() => setCreating(true)} />
          </View>
        ) : null}
        <Text style={s.caption}>Portfolio values include recorded stocks only. Saved prices are not live.</Text>
        {!draft ? (
          <TouchableOpacity
            style={styles.archiveLink}
            onPress={() => setShowArchived((value) => !value)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={s.caption}>{showArchived ? 'Hide archived portfolios' : 'Show archived portfolios'}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </PortfolioScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 78,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EBF0',
  },

  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EAF8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#081B3A',
    marginBottom: 4,
  },

  valueBlock: {
    maxWidth: '35%',
    alignItems: 'flex-end',
    gap: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#081B3A',
  },

  empty: {
    paddingVertical: 26,
    gap: 14,
  },

  archiveLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
