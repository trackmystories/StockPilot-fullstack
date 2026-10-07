import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import type {SelectStock} from '../types/stockPilot';

type Props = {
  stock: SelectStock;
  onPress: () => void;
};

function formatPrice(value: number | null) {
  if (value === null) {
    return 'N/A';
  }

  return `$${value.toFixed(2)}`;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return 'N/A';
  }

  const sign = value >= 0 ? '+' : '';

  return `${sign}${value.toFixed(2)}%`;
}

function getRiskColor(riskLevel: SelectStock['riskLevel']) {
  switch (riskLevel) {
    case 'low':
      return '#079B6D';

    case 'medium':
      return '#D99420';

    case 'high':
      return '#D9534F';

    default:
      return '#71819B';
  }
}

export function MarketStockCard({stock, onPress}: Props) {
  const positive = (stock.changePercentage ?? 0) >= 0;

  const riskColor = getRiskColor(stock.riskLevel);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.companySection}>
        <View style={styles.logoWrapper}>
          {stock.logoUrl ? (
            <Image
              source={{
                uri: stock.logoUrl,
              }}
              style={styles.logo}
              resizeMode="contain"
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

      <View style={styles.priceSection}>
        <Text style={styles.price}>{formatPrice(stock.price)}</Text>

        <Text style={[styles.change, positive ? styles.positiveChange : styles.negativeChange]}>
          {formatPercentage(stock.changePercentage)}
        </Text>
      </View>

      <View style={styles.metricSection}>
        <Text style={styles.metricLabel}>Risk</Text>

        <View style={styles.metricValueRow}>
          <Text
            style={[
              styles.metricValue,
              {
                color: riskColor,
              },
            ]}
          >
            {stock.riskScore ?? 'N/A'}
          </Text>

          {typeof stock.riskScore === 'number' ? <Text style={styles.metricMax}>/10</Text> : null}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricSection}>
        <Text style={styles.metricLabel}>Volatility</Text>

        <View style={styles.metricValueRow}>
          <Text style={styles.volatilityValue}>{stock.volatilityScore ?? 'N/A'}</Text>

          {typeof stock.volatilityScore === 'number' ? (
            <Text style={styles.metricMax}>/10</Text>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#71819B" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 520,
    minHeight: 112,

    paddingHorizontal: 18,
    paddingVertical: 16,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#DDE5EF',
    borderRadius: 22,

    backgroundColor: '#FFFFFF',
  },

  companySection: {
    width: 205,

    flexDirection: 'row',
    alignItems: 'center',
  },

  logoWrapper: {
    width: 58,
    height: 58,

    borderWidth: 1,
    borderColor: '#E4EAF2',
    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',

    backgroundColor: '#F5F8FB',
  },

  logo: {
    width: 42,
    height: 42,
  },

  logoFallback: {
    color: '#079B6D',

    fontSize: 26,
    fontWeight: '700',
  },

  companyText: {
    flex: 1,

    marginLeft: 14,

    minWidth: 0,
  },

  symbol: {
    color: '#071B43',

    fontSize: 21,
    fontWeight: '800',
  },

  companyName: {
    marginTop: 4,

    color: '#71819B',

    fontSize: 13,
  },

  priceSection: {
    width: 92,

    marginLeft: 16,
  },

  price: {
    color: '#071B43',

    fontSize: 19,
    fontWeight: '800',
  },

  change: {
    marginTop: 4,

    fontSize: 13,
    fontWeight: '700',
  },

  positiveChange: {
    color: '#079B6D',
  },

  negativeChange: {
    color: '#D9534F',
  },

  metricSection: {
    width: 70,
  },

  metricLabel: {
    marginBottom: 5,

    color: '#71819B',

    fontSize: 12,
    fontWeight: '600',
  },

  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  metricValue: {
    fontSize: 22,
    fontWeight: '800',
  },

  volatilityValue: {
    color: '#071B43',

    fontSize: 22,
    fontWeight: '800',
  },

  metricMax: {
    marginLeft: 2,

    color: '#071B43',

    fontSize: 11,
    fontWeight: '600',
  },

  divider: {
    width: 1,
    height: 48,

    marginHorizontal: 14,

    backgroundColor: '#E7EDF4',
  },
});
