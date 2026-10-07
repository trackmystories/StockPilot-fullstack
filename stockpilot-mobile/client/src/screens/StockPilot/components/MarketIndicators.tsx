import {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {AppState, StyleSheet, Text, View} from 'react-native';
import {authenticatedRequest} from '../../Auth/infrastructure/authenticatedRequest';
import {useAppSelector} from '../../store/hooks';
import type {SelectStock} from '../types/stockPilot';
import {
  parseMarketIndicators,
  presentMarketIndicator,
  type MarketIndicator,
} from '../utils/marketIndicatorData';
import {MarketMarquee} from './MarketMarquee';

type WatchlistQuote = Pick<SelectStock, 'symbol' | 'price' | 'changePercentage'>;

type Props = {
  refreshKey?: number;
  watchlistStocks?: WatchlistQuote[];
};

type StripItem = {
  id: string;
  label: string;
  value: string;
  changeText: string;
  color: string;
  accessibilityLabel: string;
  watchlist: boolean;
};

const QUOTE_PATH = '/api/market/indicators';
const REFRESH_INTERVAL = 60_000;
const EMPTY_WATCHLIST: WatchlistQuote[] = [];
const numberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getChangeColor(change: number | null | undefined): string {
  if (!isNumber(change) || change === 0) {
    return '#71819B';
  }

  return change > 0 ? '#079B6D' : '#E34848';
}

function presentWatchlistStock(stock: WatchlistQuote): StripItem {
  const symbol = stock.symbol.trim().toUpperCase();
  const value = isNumber(stock.price) ? numberFormat.format(stock.price) : '—';
  const change = stock.changePercentage;
  const hasChange = isNumber(change);
  const arrow = hasChange ? (change > 0 ? '▲ ' : change < 0 ? '▼ ' : '') : '';
  const changeText = hasChange ? `${arrow}${Math.abs(change).toFixed(2)}%` : '—';
  const direction = hasChange ? (change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged') : '';
  const accessibleChange = hasChange
    ? `${direction} ${Math.abs(change).toFixed(2)} percent`
    : 'change unavailable';

  return {
    id: `watchlist:${symbol}`,
    label: symbol,
    value,
    changeText,
    color: getChangeColor(change),
    accessibilityLabel: `Watchlist, ${symbol}, price ${value}, ${accessibleChange}`,
    watchlist: true,
  };
}

export function MarketIndicators({refreshKey = 0, watchlistStocks = EMPTY_WATCHLIST}: Props) {
  const token = useAppSelector((state) => state.auth.token);
  const [items, setItems] = useState<MarketIndicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let pending = false;
      let controller: AbortController | null = null;

      setItems([]);
      setFailed(false);
      setLoading(false);

      if (!token) {
        return;
      }

      const load = async () => {
        if (!active || pending || AppState.currentState !== 'active') {
          return;
        }

        pending = true;
        controller = new AbortController();
        setLoading(true);

        try {
          const result = await authenticatedRequest<unknown>(QUOTE_PATH, {
            signal: controller.signal,
          });

          const next = parseMarketIndicators(result);

          if (!active) {
            return;
          }

          setItems(next);
          setFailed(next.length === 0 || next.some((item) => item.status === 'unavailable'));
        } catch {
          if (active) {
            setItems([]);
            setFailed(true);
          }
        } finally {
          pending = false;

          if (active) {
            setLoading(false);
          }
        }
      };

      void load();

      const timer = setInterval(() => void load(), REFRESH_INTERVAL);

      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          void load();
        }
      });

      return () => {
        active = false;
        clearInterval(timer);
        subscription.remove();
        controller?.abort();
      };
    }, [token, refreshKey]),
  );

  const marketItems: StripItem[] = items.map((item) => {
    const display = presentMarketIndicator(item);

    return {
      id: `market:${item.id}`,
      label: item.label,
      value: display.value,
      changeText: display.changeText,
      color: getChangeColor(item.change),
      accessibilityLabel: display.accessibilityLabel,
      watchlist: false,
    };
  });

  const seenSymbols = new Set<string>();
  const watchlistItems: StripItem[] = [];

  if (token) {
    for (const stock of watchlistStocks) {
      const symbol = stock.symbol.trim().toUpperCase();

      if (!symbol || seenSymbols.has(symbol)) {
        continue;
      }

      seenSymbols.add(symbol);
      watchlistItems.push(presentWatchlistStock(stock));
    }
  }

  const stripItems = [...marketItems, ...watchlistItems];

  return (
    <View style={styles.container}>
      <MarketMarquee>
        {stripItems.map((item, index) => (
          <View
            key={item.id}
            style={[styles.item, index < stripItems.length - 1 && styles.divider]}
            accessible
            accessibilityLabel={item.accessibilityLabel}
          >
            <View style={styles.values}>
              <Text style={styles.label}>
                {item.watchlist && <Text style={styles.heart}>♥ </Text>}
                {item.label}
              </Text>

              <Text style={styles.price}>{item.value}</Text>

              <Text style={[styles.change, {color: item.color}]}>{item.changeText}</Text>
            </View>
          </View>
        ))}
      </MarketMarquee>

      {failed ? (
        <Text style={styles.status}>Some market data is unavailable. Retrying automatically.</Text>
      ) : loading && items.length === 0 ? (
        <Text style={styles.status}>Loading market data…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 8,
  },

  divider: {
    borderRightWidth: 1,
    borderRightColor: '#D4D9DE',
  },

  label: {
    color: '#111111',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  heart: {
    color: '#079B6D',
    fontSize: 8,
  },

  item: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    justifyContent: 'center',
  },

  values: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  price: {
    color: '#111111',
    fontSize: 8,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },

  change: {
    fontSize: 8,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  status: {
    marginTop: 8,
    paddingHorizontal: 20,
    fontSize: 11,
    color: '#71819B',
  },
});
