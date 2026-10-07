import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {CompanyReportView} from './components/CompanyReportView';
import {useCompanyReport} from './hooks/useCompanyReport';

type Props = {
  symbol: string;
  token: string | null;
};

export default function Research({symbol, token}: Props) {
  const {data, loading, error, refresh} = useCompanyReport(symbol, token);

  if (loading) {
    return (
      <View style={styles.stateCard} accessibilityRole="progressbar">
        <ActivityIndicator color="#079B73" />
        <Text style={styles.body}>Loading {symbol} report…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.sectionTitle}>Report could not load</Text>
        <Text style={styles.body}>{error}</Text>

        <Pressable accessibilityRole="button" onPress={refresh} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!data?.report) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.sectionTitle}>{symbol} report is not available yet</Text>
        <Text style={styles.body}>
          A saved report is not available yet. It will appear here after the company is included in
          the next report update.
        </Text>

        <Pressable accessibilityRole="button" onPress={refresh} style={styles.button}>
          <Text style={styles.buttonText}>Check again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CompanyReportView
      key={`${symbol}:${data.report.fingerprint}`}
      report={data.report}
      stale={data.stale}
      onRefresh={refresh}
    />
  );
}

const styles = StyleSheet.create({
  stateCard: {
    marginTop: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1E7EF',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: '#142947',
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#364963',
  },
  button: {
    backgroundColor: '#087758',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});