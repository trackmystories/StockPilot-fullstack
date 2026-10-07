import {StyleSheet, View} from 'react-native';
import type {ComponentProps} from 'react';
import {ReportChart} from './ReportChart';

type ReportChartData = ComponentProps<typeof ReportChart>['chart'];

type Props = {
  chart: ReportChartData | undefined;
};

export function AnalysisReportChart({chart}: Props) {
  if (!chart) {
    return null;
  }

  return (
    <View style={styles.card}>
      <ReportChart chart={chart} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EFEC',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});