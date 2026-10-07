import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Feedback, PortfolioScreen, s } from './components/PortfolioUI';
import { dateLabel, money } from './domain/format';
import { matchingHoldingEntries, salePreview } from './domain/holdingManagement';
import type { PortfolioStackParamList } from './domain/navigation';
import type { PortfolioTransaction, TransactionKind } from './domain/portfolio';
import { usePortfolioAction } from './hooks/usePortfolioAction';
import { usePortfolioResource } from './hooks/usePortfolioResource';
import { portfolioRepository } from './infrastructure/HttpPortfolioRepository';

type Props = NativeStackScreenProps<PortfolioStackParamList, 'PortfolioRemoveEntry'>;
const LABELS: Record<TransactionKind, string> = {
  opening: 'Investment added', buy: 'Stock purchase', sell: 'Stock sale',
  deposit: 'Cash deposit', withdrawal: 'Cash withdrawal', dividend: 'Dividend received',
  fee: 'Fee recorded', split: 'Stock split',
};

export default function PortfolioRemoveEntry(props: Props) {
  return <RemoveEntryList key={`${props.route.params.portfolioId}-${props.route.params.instrument.id}`} {...props} />;
}

function RemoveEntryList({ navigation, route }: Props) {
  const { portfolioId, instrument } = route.params;
  const [before, setBefore] = useState<number | null>(null);
  const [entries, setEntries] = useState<PortfolioTransaction[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const confirming = useRef(false);
  const action = usePortfolioAction();
  const load = useCallback((signal: AbortSignal) => portfolioRepository.activity(portfolioId, before, signal), [portfolioId, before]);
  const resource = usePortfolioResource(load, `${portfolioId}-${before ?? 'first'}`);

  useEffect(() => {
    if (!resource.data) return;
    const page = resource.data;
    setEntries((current) => {
      const combined = before === null ? page.items : [...current, ...page.items];
      return [...new Map(combined.map((item) => [item.id, item])).values()];
    });
    setNextCursor(page.nextCursor);
    setHasLoaded(true);
  }, [resource.data, before]);

  const matching = matchingHoldingEntries(entries, instrument.id);
  const remove = (entry: PortfolioTransaction) => {
    if (action.pending || resource.loading || confirming.current || entry.voidedAt) return;
    confirming.current = true;
    const cancel = () => { confirming.current = false; };
    Alert.alert(
      'Remove this entry?',
      `${LABELS[entry.kind]} · ${instrument.symbol} · ${dateLabel(entry.date)}${entry.quantity ? ` · ${entry.quantity} shares` : ''}.\n\nThis corrects your records; it does not record a sale. The entry remains marked as voided in Activity. Removal is blocked if it would invalidate a later transaction.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: cancel },
        {
          text: 'Remove entry',
          style: 'destructive',
          onPress: () => {
            confirming.current = false;
            setRemovingId(entry.id);
            void action.run(
              `void-${portfolioId}-${entry.id}`,
              () => portfolioRepository.voidTransaction(portfolioId, entry.id),
              () => navigation.canGoBack() ? navigation.goBack() : navigation.replace('PortfolioDetail', { portfolioId }),
            );
          },
        },
      ],
      { cancelable: true, onDismiss: cancel },
    );
  };

  return (
    <PortfolioScreen title="Remove entry" back>
      <ScrollView contentContainerStyle={s.page}>
        <View>
          <Text style={s.sectionTitle}>{instrument.symbol}</Text>
          <Text style={s.caption}>{instrument.companyName} · {instrument.currency}</Text>
        </View>
        <Text style={s.text}>Choose the incorrect entry to remove. To record shares you actually sold, use Sell instead.</Text>
        {resource.loading && !hasLoaded ? <Feedback loading /> : null}
        {resource.error ? <Feedback error={resource.error} onRetry={resource.reload} /> : null}
        {action.error ? <Text style={s.error} accessibilityLiveRegion="polite">{action.error}</Text> : null}
        {matching.map((entry) => {
          const nativeCurrency = entry.instrument?.currency ?? entry.currency ?? instrument.currency;
          const amount = entry.amount ?? salePreview({ quantity: entry.quantity ?? '', unitPrice: entry.unitPrice ?? '', fees: '0' })?.gross;
          const pending = action.pending && removingId === entry.id;
          return (
            <View key={entry.id} style={styles.entry}>
              <View style={s.flex}>
                <Text style={s.label}>{LABELS[entry.kind]}</Text>
                <Text style={s.caption}>{dateLabel(entry.date)}{entry.quantity ? ` · ${entry.quantity} shares` : ''}</Text>
                {entry.unitPrice !== null ? <Text style={s.caption}>{money(entry.unitPrice, nativeCurrency)} per share</Text> : null}
                {entry.note ? <Text style={s.caption}>{entry.note}</Text> : null}
              </View>
              <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {entry.kind === 'split' ? `${entry.splitRatio}×` : money(amount, nativeCurrency)}
              </Text>
              <TouchableOpacity
                style={[styles.remove, (action.pending || resource.loading) && s.disabled]}
                activeOpacity={0.7}
                disabled={action.pending || resource.loading}
                onPress={() => remove(entry)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${LABELS[entry.kind].toLowerCase()} for ${instrument.symbol} dated ${entry.date}`}
                accessibilityState={{ disabled: action.pending || resource.loading, busy: pending }}
              >
                {pending ? <ActivityIndicator size="small" color="#D9534F" /> : <Ionicons name="trash-outline" size={20} color="#D9534F" />}
              </TouchableOpacity>
            </View>
          );
        })}
        {hasLoaded && !matching.length && !resource.loading ? (
          <Text style={s.caption}>{nextCursor === null ? 'No active entries for this holding remain.' : 'No matching entries on the loaded pages. Load older entries to continue.'}</Text>
        ) : null}
        {nextCursor !== null ? (
          <Button
            label="Load older entries"
            secondary
            pending={resource.loading}
            disabled={action.pending || !!resource.error}
            onPress={() => setBefore(nextCursor)}
          />
        ) : null}
        <Text style={s.caption}>Only this entry in this portfolio is affected. Other portfolios and your watchlist are unchanged.</Text>
      </ScrollView>
    </PortfolioScreen>
  );
}

const styles = StyleSheet.create({
  entry: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EBF0',
  },

  amount: {
    maxWidth: '30%',
    color: '#081B3A',
    fontSize: 13,
    fontWeight: '600',
  },
  remove: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
