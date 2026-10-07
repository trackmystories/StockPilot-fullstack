import {useMemo} from 'react';

import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import Svg, {Circle, Defs, LinearGradient, Path, Stop} from 'react-native-svg';

import type {StockChartPoint} from '../../stocks/useFmpStockChart';

type Props = {
  points: StockChartPoint[];
  loading?: boolean;
  error?: string | null;
};

const CHART_WIDTH = 340;
const CHART_HEIGHT = 125;

function buildChart(points: StockChartPoint[]) {
  if (points.length < 2) {
    return null;
  }

  const prices = points.map((point) => point.price);

  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);

  const priceRange = Math.max(maximum - minimum, 0.01);

  const horizontalPadding = 4;
  const verticalPadding = 10;

  const drawableWidth = CHART_WIDTH - horizontalPadding * 2;

  const drawableHeight = CHART_HEIGHT - verticalPadding * 2;

  const coordinates = points.map((point, index) => {
    const x = horizontalPadding + (index / Math.max(points.length - 1, 1)) * drawableWidth;

    const normalized = (point.price - minimum) / priceRange;

    const y = CHART_HEIGHT - verticalPadding - normalized * drawableHeight;

    return {
      x,
      y,
    };
  });

  const first = coordinates[0];

  const last = coordinates[coordinates.length - 1];

  const linePath = coordinates
    .map((coordinate, index) => `${index === 0 ? 'M' : 'L'} ${coordinate.x} ${coordinate.y}`)
    .join(' ');

  const areaPath = [
    linePath,
    `L ${last.x} ${CHART_HEIGHT}`,
    `L ${first.x} ${CHART_HEIGHT}`,
    'Z',
  ].join(' ');

  return {
    linePath,
    areaPath,
    last,
  };
}

export function StockPriceChart({points, loading = false, error = null}: Props) {
  const validPoints = useMemo(
    () => points.filter((point) => Number.isFinite(point.price)),
    [points],
  );

  const chart = useMemo(() => buildChart(validPoints), [validPoints]);

  const isPositive =
    validPoints.length >= 2 && validPoints[validPoints.length - 1].price >= validPoints[0].price;

  const chartColor = isPositive ? '#079B73' : '#E15858';

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="small" color="#079B73" />
      </View>
    );
  }

  if (error || !chart) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>Chart unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="stockChartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chartColor} stopOpacity={0.2} />

            <Stop offset="1" stopColor={chartColor} stopOpacity={0.01} />
          </LinearGradient>
        </Defs>

        <Path d={chart.areaPath} fill="url(#stockChartGradient)" />

        <Path
          d={chart.linePath}
          fill="none"
          stroke={chartColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Circle cx={chart.last.x} cy={chart.last.y} r={7} fill={chartColor} opacity={0.14} />

        <Circle cx={chart.last.x} cy={chart.last.y} r={4} fill={chartColor} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: CHART_HEIGHT,
    overflow: 'hidden',
  },

  state: {
    width: '100%',
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateText: {
    fontSize: 12,
    color: '#7788A3',
  },
});
