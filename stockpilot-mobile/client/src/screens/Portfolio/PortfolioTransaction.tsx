import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Feedback, Field, PortfolioScreen, s } from './components/PortfolioUI';
import { money } from './domain/format';
import { normalizedCurrency, investmentInput, investmentTotal, visiblePortfolios, type InvestmentDraft } from './domain/investments';
import type { PortfolioStackParamList } from './domain/navigation';
import { usePortfolioAction } from './hooks/usePortfolioAction';
import { usePortfolioResource } from './hooks/usePortfolioResource';
import { portfolioRepository } from './infrastructure/HttpPortfolioRepository';

type Props = NativeStackScreenProps<PortfolioStackParamList, 'PortfolioTransaction'>;

export default function PortfolioTransaction({ navigation, route }: Props) {
  const [draft, setDraft] = useState<InvestmentDraft>(route.params.draft);
  const [portfolioId, setPortfolioId] = useState(route.params.portfolioId ?? '');
  const [choosing, setChoosing] = useState(!route.params.portfolioId);
  const [formError, setFormError] = useState<string | null>(null);
  const load = useCallback((signal: AbortSignal) => portfolioRepository.list(false, signal), []);
  const resource = usePortfolioResource(load, 'transaction-portfolios');
  const items = visiblePortfolios(resource.data?.items ?? []);
  const selected = items.find((item) => item.portfolio.id === portfolioId);
  const action = usePortfolioAction();

  useEffect(() => {
    setDraft(route.params.draft);
    setPortfolioId(route.params.portfolioId ?? '');
    setChoosing(!route.params.portfolioId);
    setFormError(null);
  }, [route.params.draft, route.params.portfolioId]);

  const nativeCurrency = normalizedCurrency(draft.stock.currency);
  const reportingCurrency = selected?.portfolio.currency;
  const heldCandidates = selected?.analysis.holdings.filter((holding) => holding.instrument.symbol.toUpperCase() === draft.stock.symbol.toUpperCase() && (!nativeCurrency || holding.instrument.currency === nativeCurrency) && (!draft.stock.instrumentId || holding.instrument.id === draft.stock.instrumentId)) ?? [];
  const heldInstrument = heldCandidates.length === 1 ? heldCandidates[0].instrument : undefined;
  const resolve = useCallback(async (signal: AbortSignal) => {
    if (!portfolioId) return null;
    if (draft.stock.currency?.trim() && !nativeCurrency) throw new Error('Only USD and EUR stock listings are supported.');
    if (heldInstrument) return heldInstrument;
    return portfolioRepository.resolveInstrument(draft.stock.symbol, nativeCurrency, signal, draft.stock.exchange);
  }, [portfolioId, nativeCurrency, draft.stock.currency, draft.stock.symbol, draft.stock.exchange, heldInstrument]);
  const instrument = usePortfolioResource(resolve, `${portfolioId}-${draft.stock.symbol}-${nativeCurrency ?? ''}`);
  const currency = instrument.data?.currency ?? nativeCurrency;

  const change = (field: 'quantity' | 'unitPrice' | 'date', value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError(null);
  };
  const save = () => {
    if (!selected || !instrument.data || instrument.error || instrument.loading) return;
    try {
      // Submit native execution values and the exact saved instrument identity; the server converts valuations only.
      const checked = investmentInput({ ...draft, stock: { ...draft.stock, currency: instrument.data.currency, instrumentId: instrument.data.id } }, 'validation-only');
      setFormError(null);
      void action.run(JSON.stringify({ portfolioId, ...checked }), (requestId) => portfolioRepository.transaction(portfolioId, { ...checked, requestId }), () => {
        if (route.params.returnToPortfolio && route.params.portfolioId === portfolioId && navigation.canGoBack()) navigation.goBack();
        else navigation.replace('PortfolioDetail', { portfolioId });
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Check the investment details.');
    }
  };
  const total = investmentTotal(draft.quantity, draft.unitPrice);

  return (
    <PortfolioScreen title={route.params.returnToPortfolio ? "Buy more" : "Record investment"} back footer={(
      <>
        {action.error ? <Text style={s.error}>{action.error}</Text> : null}
        <Button
          label="Save investment"
          onPress={save}
          pending={action.pending}
          disabled={!selected || !instrument.data || instrument.loading || !!instrument.error || total === null}
        />
      </>
    )}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={styles.stock}>
          {draft.stock.logoUrl ? <Image source={{ uri: draft.stock.logoUrl }} style={styles.logo} resizeMode="contain" /> : <View style={styles.logo}><Ionicons name="business-outline" color="#079B73" size={25} /></View>}
          <View style={s.flex}>
            <Text style={styles.symbol}>{draft.stock.symbol}</Text>
            <Text style={s.caption}>{draft.stock.companyName}</Text>
          </View>
          <Text style={s.caption}>{draft.stock.currency}</Text>
        </View>
        <Text style={s.label}>Portfolio</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setChoosing((value) => !value)}
          disabled={action.pending}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select portfolio"
        >
          <Text style={[s.text, s.flex]}>{selected?.portfolio.name ?? 'Select a portfolio'}</Text>
          <Text style={s.caption}>{reportingCurrency ? `Totals in ${reportingCurrency}` : ''}</Text>
          <Ionicons name={choosing ? 'chevron-up' : 'chevron-down'} color="#7788A3" size={18} />
        </TouchableOpacity>
        {resource.loading && !resource.data ? <Feedback loading /> : null}
        {resource.error ? <Feedback error={resource.error} onRetry={resource.reload} /> : null}
        {choosing ? (
          <View style={styles.options}>
            {items.map(({ portfolio }) => {
              const compatible = !portfolio.deleting;
              return (
                <TouchableOpacity
                  key={portfolio.id}
                  style={styles.option}
                  activeOpacity={0.7}
                  disabled={!compatible || action.pending}
                  onPress={() => { setPortfolioId(portfolio.id); setChoosing(false); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: portfolioId === portfolio.id, disabled: !compatible || action.pending }}
                >
                  <View style={s.flex}>
                    <Text style={[s.text, !compatible && s.caption]}>{portfolio.name}</Text>
                    {!compatible ? <Text style={s.caption}>Deletion in progress.</Text> : null}
                  </View>
                  <Text style={s.caption}>Totals in {portfolio.currency}</Text>
                  {portfolioId === portfolio.id ? <Ionicons name="checkmark" color="#079B73" size={18} /> : null}
                </TouchableOpacity>
              );
            })}
            {!resource.loading && items.length === 0 ? <Text style={s.caption}>Create your first portfolio below.</Text> : null}
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.create}
          disabled={action.pending}
          activeOpacity={0.7}
          onPress={() => navigation.replace('PortfoliosHome', { creating: true, draft })}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={21} color="#079B73" />
          <Text style={s.link}>Create a new portfolio</Text>
        </TouchableOpacity>
        {selected && instrument.loading ? <Text style={s.caption}>Checking saved stock data…</Text> : null}
        {instrument.error && selected ? <Feedback error={instrument.error} onRetry={instrument.reload} /> : null}
        <Field
          label="Shares purchased"
          value={draft.quantity}
          onChangeText={(value) => change('quantity', value)}
          keyboardType="decimal-pad"
          placeholder="e.g. 10.5"
          editable={!action.pending}
          maxLength={24}
        />
        <Field
          label={`Purchase price per share${currency ? ` (${currency})` : ''}`}
          value={draft.unitPrice}
          onChangeText={(value) => change('unitPrice', value)}
          keyboardType="decimal-pad"
          placeholder="Your actual purchase price"
          editable={!action.pending}
          maxLength={24}
        />
        <Field
          label="Purchase date"
          value={draft.date}
          onChangeText={(value) => change('date', value)}
          placeholder="YYYY-MM-DD"
          autoCorrect={false}
          editable={!action.pending}
          maxLength={10}
        />
        <View style={s.card}>
          <Text style={s.caption}>Amount invested</Text>
          <Text style={styles.total}>{currency ? money(total, currency) : total ?? '—'}</Text>
        </View>
        {formError ? <Text style={s.error}>{formError}</Text> : null}
        <Text style={s.caption}>Enter the purchase price in the stock’s currency. Both USD and EUR stocks can share a portfolio. No cash deposit or trade execution is involved.</Text>
      </ScrollView>
    </PortfolioScreen>
  );
}

const styles = StyleSheet.create({
  stock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },

  logo: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8FB',
  },

  symbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#081B3A',
    marginBottom: 4,
  },

  selector: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DDE5EF',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  options: {
    gap: 6,
  },

  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EBF0',
  },

  create: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  total: {
    fontSize: 24,
    fontWeight: '700',
    color: '#081B3A',
  },
});
