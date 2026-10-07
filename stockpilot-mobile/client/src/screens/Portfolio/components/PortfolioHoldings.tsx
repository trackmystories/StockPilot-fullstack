import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PortfolioAnalysis, PortfolioHolding } from '../domain/portfolio';
import { gainColor, money, percent } from '../domain/format';
import { holdingReportingValue, holdingReportingGain } from '../domain/investments';
import { Button, s } from './PortfolioUI';

export function PortfolioHoldings({ analysis, onPress, onSearch, onFilter, onManage }: {
  analysis: PortfolioAnalysis;
  onPress: (holding: PortfolioHolding) => void;
  onSearch: () => void;
  onFilter: () => void;
  onManage?: (holding: PortfolioHolding) => void;
}) {
  if (!analysis.holdings.length) {
    return (
      <View style={s.page}>
        <Text style={s.sectionTitle}>Add your first investment</Text>
        <Text style={s.caption}>Find a stock, then tap its portfolio icon to record the shares you bought.</Text>
        <Button label="Search stocks" onPress={onSearch} />
        <Button label="Explore filters" onPress={onFilter} secondary />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.columns}>
        <Text style={[s.caption, styles.company]}>Company</Text>
        <Text style={[s.caption, styles.value]}>Value ({analysis.currency})</Text>
        <Text style={[s.caption, styles.gain]}>Price gain</Text>
        <View style={{ width: onManage ? 60 : 16 }} />
      </View>
      {analysis.holdings.map((holding) => (
        <View key={holding.instrument.id} style={styles.row}>
          <TouchableOpacity
            style={styles.details}
            activeOpacity={0.7}
            onPress={() => onPress(holding)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${holding.instrument.companyName} scorecard`}
          >
            <View style={[styles.identity, styles.company]}>
              {holding.instrument.logoUrl ? <Image source={{ uri: holding.instrument.logoUrl }} style={styles.logo} resizeMode="contain" /> : <View style={styles.logo}><Text style={s.link}>{holding.instrument.symbol[0]}</Text></View>}
              <View style={s.flex}>
                <Text
                  style={styles.symbol}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  maxFontSizeMultiplier={1.15}
                >{holding.instrument.symbol}</Text>
                <Text style={styles.caption} numberOfLines={1}>{holding.quantity} shares · {holding.instrument.currency}</Text>
              </View>
            </View>
            <View style={styles.value}>
              <Text
                style={styles.number}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                maxFontSizeMultiplier={1.15}
              >{money(holdingReportingValue(holding, analysis.currency), analysis.currency)}</Text>
              <Text style={styles.caption} numberOfLines={1}>{holdingReportingValue(holding, analysis.currency) === null ? 'Value unavailable' : holding.stale ? 'Older price' : ''}</Text>
            </View>
            <View style={styles.gain}>
              <Text
                style={[styles.number, { color: gainColor(holdingReportingGain(holding, analysis.currency)) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                maxFontSizeMultiplier={1.15}
              >{money(holdingReportingGain(holding, analysis.currency), analysis.currency)}</Text>
              <Text style={styles.caption} numberOfLines={1}>{percent(holding.unrealisedGainPercent)}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.actions}>
            {onManage ? (
              <TouchableOpacity
                style={styles.manageButton}
                activeOpacity={0.7}
                onPress={() => onManage(holding)}
                accessibilityRole="button"
                accessibilityLabel={`Manage ${holding.instrument.symbol} holding`}
                accessibilityHint="Buy more, record a sale, or remove an incorrect entry"
              >
                <View style={styles.manageIcon}>
                  <Ionicons name="ellipsis-horizontal" size={19} color="#081B3A" />
                </View>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.chevronButton}
              activeOpacity={0.7}
              onPress={() => onPress(holding)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${holding.instrument.symbol} scorecard`}
            >
              <Ionicons name="chevron-forward" size={15} color="#7788A3" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },

  row: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EBF0',
  },

  details: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  manageButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#F4F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronButton: {
    width: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  company: {
    flex: 1.3,
    minWidth: 0,
  },

  value: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    alignItems: 'flex-end',
  },

  gain: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    alignItems: 'flex-end',
  },

  logo: {
    width: 27,
    height: 27,
    borderRadius: 7,
    backgroundColor: '#F4F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  symbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#081B3A',
  },

  number: {
    fontSize: 13,
    fontWeight: '600',
    color: '#081B3A',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },

  caption: {
    fontSize: 10,
    color: '#7788A3',
    marginTop: 4,
  },
});
