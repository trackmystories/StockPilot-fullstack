import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Allocation } from '../domain/portfolio';
import { percent } from '../domain/format';
import { s } from './PortfolioUI';

const COLORS = ['#079B73', '#37AD93', '#7ACEB9', '#174A70', '#547DA3', '#A8B9C9', '#DDE7E4'];
export function AllocationChart({ items, title }: {
  items: Allocation[];
  title: string;
}) {
  const positive = items.filter((item) => item.weight > 0);
  const shown = positive.length > 6 ? [...positive.slice(0, 5), {
    label: 'Other',
    value: '0',
    weight: positive.slice(5).reduce((total, item) => total + item.weight, 0)
  }] : positive;
  const size = 122, radius = 47, circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <View style={styles.allocation}>
    <View style={styles.donut}>
      <Svg width={size} height={size} accessibilityLabel={title}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EAF0F3" strokeWidth={17} />
        {shown.map((item, index) => {
          const dash = circumference * Math.min(100, item.weight) / 100;
          const start = offset;
          offset += dash;
          return <Circle
            key={item.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={17}
            strokeDasharray={`${dash} ${circumference}`}
            strokeDashoffset={-start}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />;
        })}
      </Svg>
      <View style={styles.donutLabel}>
        <Text style={styles.donutText}>Allocation</Text>
      </View>
    </View>
    <View style={s.flex}>
      {shown.map((item, index) => <View key={item.label} style={styles.legendRow}>
        <View style={[styles.dot, { backgroundColor: COLORS[index % COLORS.length] }]} />
        <Text style={[s.caption, s.flex]} numberOfLines={2}>
          {item.label}
        </Text>
        <Text style={s.caption}>
          {percent(item.weight)}
        </Text>
      </View>)}
      {!shown.length ? <Text style={s.caption}>Add priced holdings to see allocation.</Text> : null}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  allocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  donut: {
    width: 122,
    height: 122,
  },

  donutLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  donutText: {
    fontSize: 11,
    color: '#081B3A',
    fontWeight: '600',
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
