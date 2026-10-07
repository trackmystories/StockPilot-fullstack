import {ActivityIndicator, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import type {SelectStock} from '../types/stockPilot';

export type StockListMetric = {
  label: string;
  getScore: (stock: SelectStock) => number | null | undefined;
  direction: 'higher_is_better' | 'higher_is_riskier';
};

export const DEFAULT_STOCK_METRIC: StockListMetric = {
  label: 'Risk',
  getScore: (stock) => stock.riskScore,
  direction: 'higher_is_riskier',
};

type Props = {
  stock: SelectStock;
  onPress: () => void;
  showDivider?: boolean;
  metric?: StockListMetric;
  isFavorite?: boolean;
  watchlistBusy?: boolean;
  watchlistDisabled?: boolean;
  onToggleWatchlist?: () => void;
};

export function isAvailableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getScoreColor(score: number, direction: StockListMetric['direction']) {
  if (direction === 'higher_is_riskier') {
    if (score <= 3) return '#079B6D';
    if (score <= 6) return '#D99420';
    return '#D9534F';
  }

  if (score >= 7) return '#079B6D';
  if (score >= 4) return '#D99420';
  return '#D9534F';
}

function formatPrice(value: unknown) {
  return isAvailableNumber(value) ? `$${value.toFixed(2)}` : '—';
}

function formatChange(value: unknown) {
  if (!isAvailableNumber(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function MarketStockRow({
  stock,
  onPress,
  showDivider = true,
  metric = DEFAULT_STOCK_METRIC,
  isFavorite = false,
  watchlistBusy = false,
  watchlistDisabled = false,
  onToggleWatchlist,
}: Props) {
  const score = metric.getScore(stock);
  const hasScore = isAvailableNumber(score);
  const changeColor = !isAvailableNumber(stock.changePercentage)
    ? '#71819B'
    : stock.changePercentage >= 0
      ? '#079B6D'
      : '#D9534F';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${stock.companyName || stock.symbol}`}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        showDivider && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[stockColumns.company, styles.company]}>
        <View style={styles.logoWrapper}>
          {stock.logoUrl ? (
            <Image
              source={{uri: stock.logoUrl}}
              style={styles.logo}
              resizeMode="contain"
              accessible={false}
            />
          ) : (
            <Text style={styles.logoFallback}>{stock.symbol.charAt(0).toUpperCase()}</Text>
          )}
        </View>

        <View style={styles.companyText}>
          <Text style={styles.symbol} numberOfLines={1}>
            {stock.symbol}
          </Text>
          <Text style={styles.companyName} numberOfLines={1}>
            {stock.companyName}
          </Text>
        </View>
      </View>

      <View style={stockColumns.price}>
        <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {formatPrice(stock.price)}
        </Text>
        <Text style={[styles.change, {color: changeColor}]} numberOfLines={1}>
          {formatChange(stock.changePercentage)}
        </Text>
      </View>

      <View style={stockColumns.metric}>
        <Text
          style={[
            styles.score,
            {color: hasScore ? getScoreColor(score, metric.direction) : '#71819B'},
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          accessibilityLabel={`${metric.label}: ${hasScore ? `${score} out of 10` : 'unavailable'}`}
        >
          {hasScore ? score.toFixed(1) : '—'}
          {hasScore ? <Text style={styles.scoreMax}> /10</Text> : null}
        </Text>
      </View>

      <View style={stockColumns.chevron}>
        {onToggleWatchlist ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite
                ? `Remove ${stock.symbol} from watchlist`
                : `Add ${stock.symbol} to watchlist`
            }
            accessibilityState={{
              selected: isFavorite,
              disabled: watchlistDisabled || watchlistBusy,
              busy: watchlistBusy,
            }}
            disabled={watchlistDisabled || watchlistBusy}
            onPress={(event) => {
              event.stopPropagation();
              onToggleWatchlist();
            }}
            style={({pressed}) => [
              styles.heartButton,
              (pressed || watchlistDisabled) && styles.heartButtonDimmed,
            ]}
          >
            {watchlistBusy ? (
              <ActivityIndicator size="small" color="#079B6D" />
            ) : (
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={21}
                color={isFavorite ? '#079B6D' : '#71819B'}
              />
            )}
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#71819B" />
        )}
      </View>
    </Pressable>
  );
}

export const stockColumns = StyleSheet.create({
  company: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    width: '26%',
    paddingLeft: 6,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  metric: {
    width: '24%',
    paddingHorizontal: 4,
    alignItems: 'center',
    minWidth: 0,
  },
  chevron: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  heartButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButtonDimmed: {
    opacity: 0.5,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE5EF',
  },
  rowPressed: {
    backgroundColor: '#F2FAF7',
  },
  company: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#F4F8FB',
  },
  logo: {
    width: 26,
    height: 26,
  },
  logoFallback: {
    color: '#079B6D',
    fontSize: 16,
    fontWeight: '700',
  },
  companyText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  symbol: {
    color: '#071B43',
    fontSize: 14,
    fontWeight: '800',
  },
  companyName: {
    marginTop: 2,
    color: '#71819B',
    fontSize: 11,
  },
  price: {
    color: '#071B43',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  change: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  score: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  scoreMax: {
    color: '#71819B',
    fontSize: 10,
    fontWeight: '400',
  },
});
