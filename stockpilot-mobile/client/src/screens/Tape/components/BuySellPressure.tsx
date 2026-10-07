import {Ionicons} from '@expo/vector-icons';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import type {TapePressure, TapePressureBar} from '../types/tape';

type Props = {
  pressure: TapePressure;
  bars: TapePressureBar[];
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function BuySellPressure({pressure, bars, onRefresh, refreshing = false}: Props) {
  const maxVolume = Math.max(...bars.map((bar) => bar.volume), 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Buy vs Sell Pressure</Text>
      </View>

      <View style={styles.pressureBar}>
        <View
          style={[
            styles.buyBar,
            {
              width: `${pressure.buy}%`,
            },
          ]}
        >
          <Text style={styles.pressureValue}>{pressure.buy}%</Text>
        </View>

        <View
          style={[
            styles.sellBar,
            {
              width: `${pressure.sell}%`,
            },
          ]}
        >
          <Text style={styles.pressureValue}>{pressure.sell}%</Text>
        </View>
      </View>

      <View style={styles.labels}>
        <Text style={styles.buyLabel}>
          Buy <Text style={styles.secondary}>{pressure.buy}%</Text>
        </Text>

        <Text style={styles.sellLabel}>
          Sell <Text style={styles.secondary}>{pressure.sell}%</Text>
        </Text>
      </View>

      <View style={styles.chart}>
        {bars.map((bar, index) => {
          const height = Math.max(8, (bar.volume / maxVolume) * 90);

          return (
            <View key={`${bar.time}-${index}`} style={styles.barWrapper}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height,
                  },
                  bar.direction === 'UP'
                    ? styles.up
                    : bar.direction === 'DOWN'
                      ? styles.down
                      : styles.neutral,
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.chartTimes}>
        <Text style={styles.chartTime}>{bars[0]?.time ?? ''}</Text>

        <Text style={styles.chartTime}>{bars[Math.floor(bars.length / 3)]?.time ?? ''}</Text>

        <Text style={styles.chartTime}>{bars[Math.floor((bars.length * 2) / 3)]?.time ?? ''}</Text>

        <Text style={styles.chartTime}>{bars[bars.length - 1]?.time ?? ''}</Text>
      </View>

      {onRefresh ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh tape"
          disabled={refreshing}
          onPress={onRefresh}
          style={({pressed}) => [
            styles.refreshButton,
            pressed && !refreshing ? styles.refreshButtonPressed : null,
            refreshing ? styles.refreshButtonDisabled : null,
          ]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#0FA97B" />
          ) : (
            <Ionicons name="refresh" size={16} color="#0FA97B" />
          )}

          <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5F0',
    borderRadius: 22,
    padding: 18,
    marginTop: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  title: {
    color: '#062451',
    fontSize: 23,
    fontWeight: '800',
  },

  pressureBar: {
    height: 28,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 5,
  },

  buyBar: {
    backgroundColor: '#0FB685',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sellBar: {
    backgroundColor: '#F45459',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pressureValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  buyLabel: {
    color: '#0FA97B',
    fontSize: 17,
    fontWeight: '700',
  },

  sellLabel: {
    color: '#F45459',
    fontSize: 17,
    fontWeight: '700',
  },

  secondary: {
    color: '#7184A1',
  },

  chart: {
    height: 110,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE5F0',
  },

  barWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },

  chartBar: {
    width: '100%',
    minWidth: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  up: {
    backgroundColor: '#48BE97',
  },

  down: {
    backgroundColor: '#F26368',
  },

  neutral: {
    backgroundColor: '#AAB7C8',
  },

  chartTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  chartTime: {
    color: '#7184A1',
    fontSize: 12,
  },

  refreshButton: {
    alignSelf: 'flex-start',
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBEFE4',
    backgroundColor: '#F2FCF8',
  },

  refreshButtonPressed: {
    opacity: 0.65,
  },

  refreshButtonDisabled: {
    opacity: 0.75,
  },

  refreshButtonText: {
    color: '#0FA97B',
    fontSize: 13,
    fontWeight: '700',
  },
});
