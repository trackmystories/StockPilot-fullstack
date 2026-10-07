import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioCurrency, PortfolioTransaction, TransactionKind } from '../domain/portfolio';
import { dateLabel, money } from '../domain/format';
import { investmentTotal } from '../domain/investments';
import { portfolioRepository } from '../infrastructure/HttpPortfolioRepository';
import { Button, s } from './PortfolioUI';

const LABELS: Record<TransactionKind, string> = {
  opening: 'Investment added',
  buy: 'Stock purchase',
  sell: 'Stock sale',
  deposit: 'Cash deposit',
  withdrawal: 'Cash withdrawal',
  dividend: 'Dividend received',
  fee: 'Fee recorded',
  split: 'Stock split',
};

export function PortfolioActivity({ portfolioId, currency, initialItems, initialCursor }: {
  portfolioId: string;
  currency: PortfolioCurrency;
  initialItems: PortfolioTransaction[];
  initialCursor: number | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setItems(initialItems);
    setCursor(initialCursor);
    setLoading(false);
    setError(null);
    return () => { request.current?.abort(); request.current = null; };
  }, [portfolioId, initialItems, initialCursor]);

  const loadMore = async () => {
    if (request.current || cursor === null) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await portfolioRepository.activity(portfolioId, cursor, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      setItems((current) => [...new Map([...current, ...response.items].map((item) => [item.id, item])).values()].sort((a, b) => b.sequence - a.sequence));
      setCursor(response.nextCursor);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load activities.');
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  };

  return (
    <View style={s.page}>
      {!items.length ? <Text style={s.caption}>Your recorded investments will appear here.</Text> : null}
      {items.map((item) => {
        const nativeCurrency = item.instrument?.currency ?? item.currency ?? currency;
        const amount = item.amount ?? investmentTotal(item.quantity ?? '', item.unitPrice ?? '');
        return (
          <View key={item.id} style={[styles.row, !!item.voidedAt && styles.voided]}>
            <View style={s.flex}>
              <Text style={s.label}>{LABELS[item.kind]}{item.instrument ? ` · ${item.instrument.symbol}` : ''}</Text>
              <Text style={s.caption}>{dateLabel(item.date)}{item.quantity ? ` · ${item.quantity} shares` : ''}</Text>
              {item.unitPrice !== null ? <Text style={s.caption}>At {money(item.unitPrice, nativeCurrency)} per share</Text> : null}
              {item.note ? <Text style={s.caption}>{item.note}</Text> : null}
              {item.voidedAt ? <Text style={s.caption}>Voided</Text> : null}
            </View>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{item.kind === 'split' ? `${item.splitRatio}×` : money(amount, nativeCurrency)}</Text>
          </View>
        );
      })}
      {error ? <Text style={s.error}>{error}</Text> : null}
      {cursor !== null ? <Button
        label={error ? 'Try again' : 'Load more activity'}
        onPress={() => void loadMore()}
        pending={loading}
        secondary
      /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 66,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EBF0',
  },

  amount: {
    maxWidth: '36%',
    color: '#081B3A',
    fontSize: 14,
    fontWeight: '600',
  },

  voided: {
    opacity: 0.55,
  },
});
