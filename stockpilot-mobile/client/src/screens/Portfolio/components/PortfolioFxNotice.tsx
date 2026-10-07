import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioAnalysis } from '../domain/portfolio';

export function PortfolioFxNotice({ analysis }: { analysis: PortfolioAnalysis }) {
  const fx = analysis.fx;
  if (!fx?.required || !analysis.holdings.some((holding) => holding.instrument.currency !== analysis.currency)) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.text, (fx.unavailable || fx.stale) && styles.warning]}>
        {fx.unavailable
          ? 'USD/EUR conversion is unavailable. Foreign-currency holdings are excluded from the subtotal, not valued at zero.'
          : `${fx.stale ? 'Older ' : ''}ECB reference rate · ${fx.asOf} · 1 EUR = ${fx.eurUsd} USD. Totals shown in ${analysis.currency}.`}
      </Text>
      <Text style={styles.text}>Costs and price gains use the same reference rate as current values. Currency gains/losses since purchase are not included. This is an indicative valuation, not a broker exchange quote.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },

  text: {
    color: '#7788A3',
    fontSize: 11,
    lineHeight: 16,
  },

  warning: {
    color: '#A86613',
  },
});
