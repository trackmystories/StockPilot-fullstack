import { useCallback, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Feedback, Field, PortfolioScreen, s } from './components/PortfolioUI';
import { money, today } from './domain/format';
import { saleInput, salePreview, type SaleDraft } from './domain/holdingManagement';
import type { PortfolioStackParamList } from './domain/navigation';
import { usePortfolioAction } from './hooks/usePortfolioAction';
import { usePortfolioResource } from './hooks/usePortfolioResource';
import { portfolioRepository } from './infrastructure/HttpPortfolioRepository';

type Props = NativeStackScreenProps<PortfolioStackParamList, 'PortfolioSale'>;

export default function PortfolioSale(props: Props) {
  return <SaleForm key={`${props.route.params.portfolioId}-${props.route.params.instrumentId}`} {...props} />;
}

function SaleForm({ navigation, route }: Props) {
  const { portfolioId, instrumentId } = route.params;
  const load = useCallback((signal: AbortSignal) => portfolioRepository.ledger(portfolioId, signal), [portfolioId]);
  const resource = usePortfolioResource(load, portfolioId);
  const action = usePortfolioAction();
  const [draft, setDraft] = useState<SaleDraft>({ quantity: '', unitPrice: '', fees: '', date: today() });
  const [formError, setFormError] = useState<string | null>(null);
  const portfolio = resource.data?.portfolio;
  const position = resource.data?.ledger.positions.find((item) => item.instrument.id === instrumentId);
  const currency = position?.instrument.currency;
  const preview = salePreview(draft);
  const editable = !!position && !!portfolio && !portfolio.archived && !portfolio.deleting;
  const busy = action.pending || resource.loading;

  const change = (field: keyof SaleDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError(null);
  };

  const save = () => {
    if (!position || !editable || busy || resource.error) return;
    try {
      const checked = saleInput(draft, position, 'validation-only');
      setFormError(null);
      void action.run(
        JSON.stringify({ portfolioId, ...checked }),
        (requestId) => portfolioRepository.transaction(portfolioId, { ...checked, requestId }),
        () => navigation.canGoBack() ? navigation.goBack() : navigation.replace('PortfolioDetail', { portfolioId }),
      );
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Check the sale details.');
    }
  };

  return (
    <PortfolioScreen title="Record sale" back footer={(
      <>
        {formError || action.error ? <Text style={s.error} accessibilityLiveRegion="polite">{formError ?? action.error}</Text> : null}
        <Button label="Save sale" onPress={save} pending={action.pending} disabled={!editable || resource.loading || !!resource.error || !preview} />
      </>
    )}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        {resource.loading && !resource.data ? <Feedback loading /> : null}
        {resource.error ? <Feedback error={resource.error} onRetry={resource.reload} /> : null}
        {portfolio ? <Text style={s.caption}>{portfolio.name}</Text> : null}
        {portfolio?.archived || portfolio?.deleting ? <Text style={s.error}>This portfolio is not active. Restore it before recording a sale.</Text> : null}
        {resource.data && !position ? <Text style={s.caption}>This holding is no longer in the portfolio. Return to Holdings to see the latest positions.</Text> : null}
        {position && currency ? (
          <>
            <View style={s.card}>
              <Text style={s.sectionTitle}>{position.instrument.symbol}</Text>
              <Text style={s.caption}>{position.instrument.companyName}</Text>
              <Text style={s.text}>{position.quantity} shares held · {currency}</Text>
            </View>
            <View style={styles.quantityHeading}>
              <Text style={s.sectionTitle}>Shares to sell</Text>
              <TouchableOpacity
                style={styles.sellAll}
                activeOpacity={0.7}
                disabled={!editable || busy}
                onPress={() => change('quantity', position.quantity)}
                accessibilityRole="button"
                accessibilityLabel={`Sell all ${position.quantity} ${position.instrument.symbol} shares`}
              >
                <Text style={s.link}>Sell all</Text>
              </TouchableOpacity>
            </View>
            <Field
              label="Shares sold"
              value={draft.quantity}
              onChangeText={(value) => change('quantity', value)}
              keyboardType="decimal-pad"
              placeholder="e.g. 10.5"
              maxLength={24}
              editable={editable && !busy}
            />
            <Field
              label={`Sale price per share (${currency})`}
              value={draft.unitPrice}
              onChangeText={(value) => change('unitPrice', value)}
              keyboardType="decimal-pad"
              placeholder="Your actual sale price"
              maxLength={24}
              editable={editable && !busy}
            />
            <Field
              label="Sale date"
              value={draft.date}
              onChangeText={(value) => change('date', value)}
              placeholder="YYYY-MM-DD"
              autoCorrect={false}
              maxLength={10}
              editable={editable && !busy}
            />
            <Field
              label={`Fees (${currency}, optional)`}
              value={draft.fees}
              onChangeText={(value) => change('fees', value)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              maxLength={24}
              editable={editable && !busy}
            />
            <View style={s.card}>
              <View style={s.between}><Text style={s.caption}>Sale value</Text><Text style={s.text}>{money(preview?.gross, currency)}</Text></View>
              <View style={s.between}><Text style={s.caption}>Fees</Text><Text style={s.text}>{money(preview?.fees, currency)}</Text></View>
              <View style={s.between}><Text style={s.label}>Net proceeds</Text><Text style={styles.total}>{money(preview?.net, currency)}</Text></View>
            </View>
            <Text style={s.caption}>Record a sale you already completed with your broker. StockPilot does not execute trades. A full sale removes the holding from this list; its transaction history remains in Activity.</Text>
            <Text style={s.caption}>Prices and fees are recorded in {currency}, not the portfolio display currency. The backend checks available shares again before saving.</Text>
          </>
        ) : null}
      </ScrollView>
    </PortfolioScreen>
  );
}

const styles = StyleSheet.create({
  quantityHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellAll: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  total: {
    fontSize: 17,
    fontWeight: '700',
    color: '#081B3A',
    fontVariant: ['tabular-nums'],
  },
});
