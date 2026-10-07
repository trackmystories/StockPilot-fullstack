import {Ionicons} from '@expo/vector-icons';
import {Image, Pressable, Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {AddToPortfolioIcon} from '../../components/AddToPortfolioIcon';

type HeaderStock = {
  symbol: string;
  name?: string | null;
  companyName?: string | null;
  exchange?: string | null;
  logoUrl?: string | null;
  price?: number | null;
  change?: number | null;
  changePercentage?: number | null;
  asOf?: string | null;
  marketCap?: number | null;
  volume?: number | null;
  epsDilutedTtm?: number | null;
  peRatio?: number | null;
};

type Props = {
  stock: HeaderStock;
  onBack: () => void;
  isFavorite: boolean;
  onFavoritePress: () => void;
  onAddToPortfolio?: () => void;
};

type StatProps = {
  label: string;
  value: string;
};

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return value.toFixed(2);
}

function formatChange(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatAsOf(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `Today, ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatMarketCap(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (absolute >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (absolute >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  return `$${value.toFixed(0)}`;
}

function formatVolume(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(0);
}

function formatEps(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return value.toFixed(2);
}

function formatPe(value: number | null | undefined) {
  if (value === null || value === undefined || value <= 0) {
    return 'N/A';
  }

  return `${value.toFixed(2)}x`;
}

function Stat({label, value}: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>

      <Text numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

export function ScoreCardHeader({
  stock,
  onBack,
  isFavorite,
  onFavoritePress,
  onAddToPortfolio,
}: Props) {
  const isPositive = (stock.changePercentage ?? stock.change ?? 0) >= 0;
  const changeColor = isPositive ? '#05A978' : '#E15858';
  const companyName = stock.companyName ?? stock.name ?? stock.symbol;
  const formattedAsOf = formatAsOf(stock.asOf);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${stock.symbol} · ${companyName}`,
      });
    } catch (error) {
      console.error('Could not share stock:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Pressable style={styles.iconButton} onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={30} color="#062653" />
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, isFavorite && styles.favoriteActive]}
            onPress={onFavoritePress}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={23}
              color={isFavorite ? '#05A978' : '#062653'}
            />
          </Pressable>

          {onAddToPortfolio ? (
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={onAddToPortfolio}
              accessibilityRole="button"
              accessibilityLabel={`Add ${stock.symbol} to a portfolio`}
            >
              <AddToPortfolioIcon size={23} backgroundColor="#F4F8F7" />
            </TouchableOpacity>
          ) : null}

          <Pressable style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#062653" />
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.identitySection}>
          <View style={styles.logoContainer}>
            {stock.logoUrl ? (
              <Image source={{uri: stock.logoUrl}} style={styles.logo} resizeMode="contain" />
            ) : (
              <Text style={styles.logoFallback}>{stock.symbol.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          <View style={styles.identity}>
            <Text style={styles.symbol} numberOfLines={1}>
              {stock.symbol}
            </Text>

            <Text style={styles.companyName} numberOfLines={1}>
              {companyName}
            </Text>

            {stock.exchange ? (
              <View style={styles.exchangeBadge}>
                <Text style={styles.exchangeText}>{stock.exchange}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.priceSection}>
          <View style={styles.priceTopRow}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(stock.price)}</Text>

              {stock.price !== null && stock.price !== undefined ? (
                <Text style={styles.currency}>USD</Text>
              ) : null}
            </View>

            <View
              style={[
                styles.trendIcon,
                {
                  backgroundColor: isPositive ? '#EAF8F3' : '#FDEEEE',
                },
              ]}
            >
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={18}
                color={changeColor}
              />
            </View>
          </View>

          <Text style={[styles.change, {color: changeColor}]}>
            {formatChange(stock.change)}
            {stock.changePercentage !== null && stock.changePercentage !== undefined
              ? ` (${formatPercentage(stock.changePercentage)})`
              : ''}
          </Text>

          {formattedAsOf ? <Text style={styles.asOf}>{formattedAsOf}</Text> : null}
        </View>
      </View>

      <View style={styles.marketGrid}>
        <Stat label="Market Cap" value={formatMarketCap(stock.marketCap)} />

        <Stat label="Volume" value={formatVolume(stock.volume)} />

        <Stat label="EPS" value={formatEps(stock.epsDilutedTtm)} />

        <Stat label="P/E" value={formatPe(stock.peRatio)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 2,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  actionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8F7',
  },

  favoriteActive: {
    backgroundColor: '#EAF8F3',
  },

  summaryRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 108,
  },

  identitySection: {
    flex: 1.12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    minWidth: 0,
  },

  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4ECEA',
    backgroundColor: '#F5FAF8',
  },

  logo: {
    width: 56,
    height: 56,
  },

  logoFallback: {
    fontSize: 30,
    fontWeight: '700',
    color: '#05A978',
  },

  identity: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },

  symbol: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#062653',
  },

  companyName: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    color: '#7788A3',
  },

  exchangeBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#E7F6F1',
  },

  exchangeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#05A978',
  },

  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 104,
    backgroundColor: '#E2E9E8',
  },

  priceSection: {
    flex: 1,
    paddingLeft: 18,
    minWidth: 0,
  },

  priceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },

  price: {
    fontSize: 21,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: '#062653',
  },

  currency: {
    marginLeft: 6,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: '#7788A3',
  },

  trendIcon: {
    width: 32,
    height: 32,
    marginLeft: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  change: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },

  asOf: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#7788A3',
  },

  marketGrid: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E4EFEC',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },

  stat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  statLabel: {
    fontSize: 12,
    color: '#7788A3',
    textAlign: 'center',
  },

  statValue: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#062653',
    textAlign: 'center',
  },
});
