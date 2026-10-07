import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioAnalysis as Analysis } from '../domain/portfolio';
import { percent } from '../domain/format';
import { holdingReportingValue, stockAllocations, stockSummary } from '../domain/investments';
import { AllocationChart } from './PortfolioCharts';
import { Notice, SectionTitle, s } from './PortfolioUI';

export function PortfolioAnalysis({ analysis }: { analysis: Analysis }) {
  const summary = stockSummary(analysis);
  const sectors = stockAllocations(analysis.holdings, 'sector', analysis.currency);
  const industries = stockAllocations(analysis.holdings, 'industry', analysis.currency);
  // Re-normalise the server's existing size buckets over stock value only.
  const equitySizes = analysis.companySizes.filter((item) => item.label !== 'Cash');
  const sizeTotal = equitySizes.reduce((total, item) => total + Number(item.value), 0);
  const sizes = equitySizes.map((item) => ({ ...item, weight: sizeTotal > 0 ? Number(item.value) / sizeTotal * 100 : 0 }));
  const priced = analysis.holdings.filter((holding) => holdingReportingValue(holding, analysis.currency) !== null);
  const equityValue = Number(summary.pricedSubtotal);
  const topThree = [...priced].sort((a, b) => Number(holdingReportingValue(b, analysis.currency)) - Number(holdingReportingValue(a, analysis.currency))).slice(0, 3);
  const topWeight = equityValue > 0 ? topThree.reduce((total, holding) => total + Number(holdingReportingValue(holding, analysis.currency)), 0) / equityValue * 100 : null;

  if (!analysis.holdings.length) return <View style={s.page}><Text style={s.caption}>Analysis appears after you add investments.</Text></View>;
  return (
    <View style={s.page}>
      <Text style={s.caption}>{priced.length} of {analysis.holdings.length} stocks valued in {analysis.currency}. Allocations use converted stock values only.</Text>
      {summary.unpriced ? <Notice warning>Some stocks cannot be priced. These allocations do not represent the complete portfolio.</Notice> : null}
      <SectionTitle>Sector allocation</SectionTitle>
      <AllocationChart items={sectors} title="Stock sector allocation" />
      <SectionTitle>Industry exposure</SectionTitle>
      {industries.map((item) => (
        <View key={item.label} style={styles.barRow}>
          <View style={s.between}><Text style={[s.text, s.flex]}>{item.label}</Text><Text style={s.caption}>{percent(item.weight)}</Text></View>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(100, item.weight))}%` }]} /></View>
        </View>
      ))}
      <SectionTitle>Company size</SectionTitle>
      <AllocationChart items={sizes} title="Company size allocation" />
      <Text style={s.caption}>Company-size classifications use supported USD market-cap data; other sizes remain unavailable.</Text>
      <View style={s.card}>
        <Text style={s.label}>Position concentration</Text>
        <Text style={s.text}>Your {Math.min(3, priced.length)} largest priced holdings represent {percent(topWeight)} of priced stock value.</Text>
      </View>
      <SectionTitle>Business characteristics</SectionTitle>
      {analysis.characteristics.map((item) => (
        <View key={item.id} style={s.card}>
          <View style={s.between}><Text style={[s.text, s.flex]}>{item.label}</Text><Text style={styles.percent}>{percent(item.matchingWeight)}</Text></View>
          <Text style={s.caption}>Data covers {percent(item.coverageWeight)} of priced stock value.</Text>
        </View>
      ))}
      <Text style={s.caption}>These are exposures to company characteristics, not a prediction or a portfolio risk score.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: {
    gap: 7,
  },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAF0F3',
    overflow: 'hidden',
  },

  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#63BDA5',
  },

  percent: {
    fontSize: 16,
    color: '#079B73',
    fontWeight: '600',
  },
});
