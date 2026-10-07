import { useId, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import type { PortfolioDetail } from '../domain/portfolio';
import { money } from '../domain/format';
import {
  buildPortfolioValueHistory,
  createValueGraph,
  selectValueHistory,
  VALUE_HISTORY_RANGES,
  type ValueHistoryRange,
} from '../domain/portfolioValueHistory';

type Props = {
  detail: PortfolioDetail;
};

const CHART_HEIGHT = 144;
const GREEN = '#079B73';

function dateLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export function PortfolioValueChart({ detail }: Props) {
  const [range, setRange] = useState<ValueHistoryRange>('ALL');
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const id = useId();
  const gradientId = `portfolio-value-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = measuredWidth > 0 ? measuredWidth : Math.max(32, screenWidth - 40);
  const history = useMemo(() => buildPortfolioValueHistory(detail), [detail]);
  const points = useMemo(() => selectValueHistory(history, range), [history, range]);
  const graph = useMemo(() => createValueGraph(points, width, CHART_HEIGHT), [points, width]);
  const valid = points.filter((point) => point.value !== null);
  const first = valid[0];
  const last = valid[valid.length - 1];
  const currency = detail.portfolio.currency;
  const latestMissing = !!points.length && points[points.length - 1].value === null;
  const description = first && last
    ? `${valid.length} recorded stock values in ${currency}. ${dateLabel(first.date)}: ${money(String(first.value), currency)}. ${dateLabel(last.date)}: ${money(String(last.value), currency)}. Changes include purchases and sales; this is not an investment return.${latestMissing ? ' Latest valuation unavailable.' : ''}`
    : 'No complete saved stock values in this range.';
  const note = !valid.length
    ? 'A chart appears when a complete stock valuation is available.'
    : valid.length === 1
      ? 'One recorded value. A trend needs another saved day.'
      : latestMissing
        ? 'Latest valuation unavailable. Gaps are not treated as zero.'
        : 'Stock value history · purchases and sales also change the value.';

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>Value history</Text>
        <Text style={styles.currency} maxFontSizeMultiplier={1.3}>{currency}</Text>
      </View>

      <View
        style={styles.plot}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          if (Number.isFinite(next) && next > 0) setMeasuredWidth(next);
        }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={description}
      >
        <Svg
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          accessible={false}
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={GREEN} stopOpacity={0.18} />
              <Stop offset="1" stopColor={GREEN} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>
          {[8, CHART_HEIGHT / 2, CHART_HEIGHT - 8].map((y) => (
            <Line
              key={y}
              x1={8}
              x2={width - 8}
              y1={y}
              y2={y}
              stroke="#EAF0F3"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          ))}
          {graph.segments.map((segment, index) => (
            <Path key={`area-${index}`} d={segment.area} fill={`url(#${gradientId})`} />
          ))}
          {graph.segments.map((segment, index) => (
            <Path
              key={`line-${index}`}
              d={segment.line}
              fill="none"
              stroke={GREEN}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {graph.dots.map((point, index) => (
            <Circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={GREEN}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}
        </Svg>
        {!valid.length ? (
          <View style={styles.empty} pointerEvents="none">
            <Text style={styles.emptyText}>No value history yet</Text>
          </View>
        ) : null}
      </View>

      {first && last ? (
        <View style={[styles.dates, first.date === last.date && styles.singleDate]}>
          <Text style={styles.date} maxFontSizeMultiplier={1.3}>{dateLabel(first.date)}</Text>
          {first.date !== last.date ? (
            <Text style={styles.date} maxFontSizeMultiplier={1.3}>{dateLabel(last.date)}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.ranges}>
        {VALUE_HISTORY_RANGES.map((item) => (
          <TouchableOpacity
            key={item}
            style={styles.rangeTarget}
            activeOpacity={0.7}
            onPress={() => setRange(item)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${item === 'ALL' ? 'all recorded history' : item === '1W' ? 'last 7 days' : item === '1M' ? 'last 30 days' : item === '3M' ? 'last 90 days' : 'last 365 days'}`}
            accessibilityState={{ selected: range === item }}
          >
            <View style={[styles.rangePill, range === item && styles.activePill]}>
              <Text
                style={[styles.rangeLabel, range === item && styles.activeLabel]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.3}
              >
                {item}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },

  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },

  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7788A3',
  },

  currency: {
    fontSize: 11,
    color: '#7788A3',
  },

  plot: {
    height: CHART_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },

  empty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    fontSize: 13,
    color: '#7788A3',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 4,
  },

  singleDate: {
    justifyContent: 'center',
  },

  date: {
    fontSize: 10,
    color: '#7788A3',
  },

  ranges: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },

  rangeTarget: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    justifyContent: 'center',
  },

  rangePill: {
    minHeight: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  activePill: {
    backgroundColor: '#EAF8F2',
  },

  rangeLabel: {
    color: '#7788A3',
    fontSize: 11,
    fontWeight: '600',
  },

  activeLabel: {
    color: GREEN,
  },

  note: {
    fontSize: 11,
    lineHeight: 16,
    color: '#7788A3',
    marginTop: 2,
  },
});
