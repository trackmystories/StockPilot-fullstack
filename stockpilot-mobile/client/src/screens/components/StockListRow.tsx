import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  formatMarketCap,
  formatPrice,
  getMomentumColor,
  getMomentumScore,
  type StockListLayout,
  type StockListItem,
} from './stockListPresentation';
type Props = {
  stock: StockListItem;
  priceLabel?: string;
  layout: StockListLayout;
  onPress: () => void;
  onAddToPortfolio?: () => void;
  isFavorite: boolean;
  watchlistBusy: boolean;
  watchlistDisabled: boolean;
  onToggleWatchlist: () => void;
};
export function StockListRow({
  stock,
  priceLabel = 'Price',
  layout,
  onPress,
  onAddToPortfolio,
  isFavorite,
  watchlistBusy,
  watchlistDisabled,
  onToggleWatchlist,
}: Props) {
  const momentum = getMomentumScore(stock.momentumScore);
  const price = formatPrice(stock.price);
  const marketCap = formatMarketCap(stock.marketCap);
  const favoriteDisabled = watchlistDisabled || watchlistBusy;
  const fitText = {
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.75,
    maxFontSizeMultiplier: layout.maxFontSizeMultiplier,
  } as const;
  const metrics = [
    {
      label: 'Price',
      value: price,
      detail: stock.currency ?? 'Currency unknown',
      width: layout.priceWidth,
      color: '#081B3A',
    },
    // The response has no separate market-cap currency. Do not invent one or convert values.
    {
      label: 'Market cap',
      value: marketCap,
      detail: null,
      width: layout.marketCapWidth,
      color: '#081B3A',
    },
    {
      label: 'Momentum',
      value: momentum === null ? '—' : momentum.toFixed(1),
      detail: momentum === null ? null : '/ 10',
      width: layout.momentumWidth,
      color: getMomentumColor(momentum),
    },
  ];
  return (
    <View style={[styles.row, { marginHorizontal: layout.padding, gap: layout.gap }]}>
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={onPress}
        style={[styles.details, { gap: layout.gap }]}
        accessibilityRole="button"
        accessibilityLabel={`View ${stock.companyName}. ${priceLabel} ${price} ${stock.currency ?? 'currency unknown'}. Market cap ${marketCap}. Momentum ${momentum === null ? 'unavailable' : `${momentum.toFixed(1)} out of 10`}.${stock.stale ? ' Older saved data.' : ''}`}
      >
        <View style={[styles.company, { gap: layout.gap, width: layout.companyWidth }]}>
          <View style={[styles.logoBox, { width: layout.logoSize, height: layout.logoSize }]}>
            {stock.logoUrl ? (
              <Image
                source={{ uri: stock.logoUrl }}
                style={{ width: layout.logoSize - 4, height: layout.logoSize - 4 }}
                resizeMode="contain"
              />
            ) : (
              <Text {...fitText} style={[styles.fallback, { fontSize: layout.symbolFontSize }]}>
                {stock.symbol[0]}
              </Text>
            )}
          </View>
          <View style={styles.nameBlock}>
            <Text {...fitText} style={[styles.symbol, { fontSize: layout.symbolFontSize }]}>
              {stock.symbol}
            </Text>
            <Text
              style={[styles.name, { fontSize: layout.detailFontSize }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={layout.maxFontSizeMultiplier}
            >
              {stock.companyName}
            </Text>
            {stock.stale ? (
              <Text {...fitText} style={[styles.stale, { fontSize: layout.detailFontSize }]}>
                Older saved data
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.metrics, { gap: layout.gap }]}>
          {metrics.map((metric) => (
            <View key={metric.label} style={[styles.metric, { width: metric.width }]}>
              <Text
                style={[
                  styles.value,
                  { fontSize: layout.valueFontSize, color: metric.color, textAlign: metric.label === 'Momentum' ? 'right' : 'center' },
                  metric.label === 'Momentum' && styles.momentum,
                ]}
                {...fitText}
              >
                {metric.value}
              </Text>
              <Text
                style={[styles.detail, { fontSize: layout.detailFontSize, textAlign: metric.label === 'Momentum' ? 'right' : 'center' }]}
                {...fitText}
                accessible={metric.detail !== null}
              >
                {metric.detail ?? '\u00A0'}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
      <View style={[styles.actions, { width: layout.actionsWidth }]}>
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={onToggleWatchlist}
          disabled={favoriteDisabled}
          style={[styles.heartButton, favoriteDisabled && styles.heartButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite
              ? `Remove ${stock.symbol} from watchlist`
              : `Add ${stock.symbol} to watchlist`
          }
          accessibilityState={{ selected: isFavorite, disabled: favoriteDisabled, busy: watchlistBusy }}
        >
          {watchlistBusy ? (
            <ActivityIndicator size="small" color="#079B73" />
          ) : (
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={21}
              color={isFavorite ? '#079B73' : '#7788A3'}
            />
          )}
        </TouchableOpacity>
        {onAddToPortfolio ? (
          <TouchableOpacity
            activeOpacity={0.65}
            onPress={onAddToPortfolio}
            style={styles.portfolioButton}
            accessibilityRole="button"
            accessibilityLabel={`Add ${stock.symbol} to a portfolio`}
          >
            <Ionicons name="bag-add-outline" size={21} color="#079B73" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.65}
          onPress={onPress}
          style={styles.chevronButton}
          accessibilityRole="button"
          accessibilityLabel={`Open ${stock.symbol} scorecard`}
        >
          <Ionicons name="chevron-forward" size={16} color="#A2AFBD" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 74,
    paddingVertical: 11,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EBF0',
  },

  details: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },

  company: {
    minWidth: 0,
    minHeight: 44,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoBox: {
    flexShrink: 0,
    borderRadius: 8,
    backgroundColor: '#F4F8FB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  fallback: {
    fontSize: 15,
    color: '#079B73',
    fontWeight: '700',
  },

  nameBlock: {
    flex: 1,
    minWidth: 0,
  },

  symbol: {
    fontWeight: '700',
    color: '#081B3A',
  },

  name: {
    color: '#7788A3',
    marginTop: 3,
  },

  stale: {
    color: '#A86613',
    marginTop: 3,
  },

  metrics: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    flexShrink: 0,
    alignItems: 'flex-start',
  },

  metric: {
    minWidth: 0,
    flexShrink: 0,
  },

  value: {
    width: '100%',
    textAlign: 'right',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  momentum: {
    fontWeight: '700',
  },

  detail: {
    width: '100%',
    color: '#7788A3',
    marginTop: 3,
    textAlign: 'right',
  },

  actions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heartButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heartButtonDisabled: {
    opacity: 0.5,
  },

  portfolioButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chevronButton: {
    width: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
