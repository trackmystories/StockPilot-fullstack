import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReportChart as ChartData } from '../types/companyReport';

type Props = { chart: ChartData; compact?: boolean };
const HEIGHT = 170;
const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const period = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime())
        ? date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
            timeZone: 'UTC',
        })
        : value;
};

export function ReportChart({ chart, compact = false }: Props) {
    const [showValues, setShowValues] = useState(false);
    const [line, setLine] = useState(false);
    const [width, setWidth] = useState(0);
    const points = chart.points.filter((point) => Number.isFinite(point.value));
    if (points.length < 2) return null;
    const min = Math.min(0, ...points.map((point) => point.value));
    const max = Math.max(0, ...points.map((point) => point.value));
    const range = max - min || 1;
    const y = (value: number) => ((max - value) / range) * HEIGHT;
    const baseline = y(0);
    const dates = points.map((point) =>
        /^\d{4}-\d{2}-\d{2}$/.test(point.label) ? Date.parse(point.label) : NaN,
    );
    const chronological =
        dates.every(Number.isFinite) &&
        dates.every((date, index) => index === 0 || date > dates[index - 1]);
    const x = (index: number) => {
        const position = chronological
            ? (dates[index] - dates[0]) / (dates[dates.length - 1] - dates[0])
            : index / (points.length - 1);
        return 12 + position * Math.max(0, width - 24);
    };
    const kind =
        chart.kind === 'forecast'
            ? 'ANALYST FORECAST'
            : 'MODEL COMPARISON';
    const color = chart.kind === 'forecast' ? '#6270B8' : '#07855F';
    return (
        <View style={styles.card}>
            <Text style={styles.kind}>{kind}</Text>
            <Text accessibilityRole="header" style={styles.title}>
                {chart.title}
            </Text>
            {!compact ? <Text style={styles.description}>{chart.description}</Text> : null}
            {chart.kind === 'reported' && chronological ? (
                <View style={styles.switchRow}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: !line }}
                        accessibilityLabel={`Bar chart for ${chart.title}`}
                        onPress={() => setLine(false)}
                        style={[styles.switch, !line && styles.selected]}
                    >
                        <Text style={styles.switchText}>Bars</Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: line }}
                        accessibilityLabel={`Line graph for ${chart.title}`}
                        onPress={() => setLine(true)}
                        style={[styles.switch, line && styles.selected]}
                    >
                        <Text style={styles.switchText}>Trend</Text>
                    </Pressable>
                </View>
            ) : null}
            <Text style={styles.unit}>
                {compact && chart.unit === 'Index' ? 'Index (first period = 100)' : chart.unit} · zero baseline
            </Text>
            <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${chart.title}. ${kind}. ${points.map((point) => `${point.label}: ${format(point.value)} ${chart.unit}`).join('; ')}.`}
            >
                <View style={styles.plotRow}>
                    <View style={styles.axis}>
                        <Text style={[styles.tick, { top: -7 }]}>{format(max)}</Text>
                        {min < 0 && max > 0 ? (
                            <Text style={[styles.tick, { top: baseline - 7 }]}>0</Text>
                        ) : null}
                        <Text style={[styles.tick, { top: HEIGHT - 7 }]}>{format(min)}</Text>
                    </View>
                    <View
                        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
                        style={styles.plot}
                    >
                        <View style={[styles.grid, { top: 0 }]} />
                        <View style={[styles.grid, { top: HEIGHT }]} />
                        <View style={[styles.zero, { top: baseline }]} />
                        {line ? (
                            points.map((point, index) => {
                                const left = x(index);
                                const top = y(point.value);
                                const next = points[index + 1];
                                const dx = next ? x(index + 1) - left : 0;
                                const dy = next ? y(next.value) - top : 0;
                                const length = Math.sqrt(dx * dx + dy * dy);
                                return (
                                    <View key={`${point.label}:${index}`}>
                                        {next && width > 0 ? (
                                            <View
                                                style={[
                                                    styles.segment,
                                                    {
                                                        backgroundColor: color,
                                                        width: length,
                                                        left: left + dx / 2 - length / 2,
                                                        top: top + dy / 2 - 1,
                                                        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                                                    },
                                                ]}
                                            />
                                        ) : null}
                                        <View
                                            style={[
                                                styles.dot,
                                                {
                                                    left: left - 4,
                                                    top: top - 4,
                                                    backgroundColor: point.value < 0 ? '#B94C46' : color,
                                                },
                                            ]}
                                        />
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.bars}>
                                {points.map((point, index) => (
                                    <View key={`${point.label}:${index}`} style={styles.column}>
                                        <View
                                            style={[
                                                styles.bar,
                                                {
                                                    top: Math.min(baseline, y(point.value)),
                                                    height: Math.max(
                                                        point.value === 0 ? 2 : 0,
                                                        Math.abs(y(point.value) - baseline),
                                                    ),
                                                    backgroundColor: point.value < 0 ? '#B94C46' : color,
                                                },
                                                chart.kind === 'forecast' && styles.forecastBar,
                                            ]}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
                <View style={[styles.labels, line && styles.lineLabels]}>
                    {(line ? [points[0], points[points.length - 1]] : points).map((point, index) => (
                        <Text
                            key={`${point.label}:${index}`}
                            style={[styles.label, line && styles.lineLabel]}
                        >
                            {period(point.label)}
                        </Text>
                    ))}
                </View>
            </View>
            {line && !compact ? (
                <Text style={styles.note}>
                    Dots are reported periods. Lines only connect those observations; they do not supply
                    results for the intervening dates.
                </Text>
            ) : null}
            {!compact ? <Text style={styles.note}>{chart.footnote}</Text> : null}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${showValues ? 'Hide' : 'Show'} values for ${chart.title}`}
                accessibilityState={{ expanded: showValues }}
                onPress={() => setShowValues(!showValues)}
                style={styles.valuesButton}
            >
                <Text style={styles.link}>
                    {showValues ? 'Hide exact values' : 'See exact values'}
                </Text>
            </Pressable>
            {showValues
                ? points.map((point, index) => (
                    <View key={`${point.label}:${index}`} style={styles.valueRow}>
                        <Text style={styles.valueLabel}>{period(point.label)}</Text>
                        <Text selectable style={styles.value}>
                            {format(point.value)} {chart.unit}
                        </Text>
                    </View>
                ))
                : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 9,
        gap: 10,
        backgroundColor: '#FFF',
    },
    kind: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#4C6358',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 24,
        color: '#162D23',
    },
    description: {
        fontSize: 13,
        lineHeight: 20,
        color: '#42584C',
    },
    unit: {
        fontSize: 11,
        lineHeight: 17,
        color: '#607467',
        marginTop: 4,
    },
    plotRow: {
        flexDirection: 'row',
        marginTop: 14,
    },
    axis: {
        width: 45,
        height: HEIGHT,
    },
    tick: {
        position: 'absolute',
        right: 7,
        fontSize: 9,
        color: '#607467',
    },
    plot: {
        flex: 1,
        height: HEIGHT,
        position: 'relative',
    },
    grid: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#DFE7E1',
    },
    zero: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#758E7E',
    },
    bars: {
        flexDirection: 'row',
        height: HEIGHT,
    },
    column: {
        flex: 1,
        height: HEIGHT,
        alignItems: 'center',
    },
    bar: {
        position: 'absolute',
        width: '55%',
        maxWidth: 58,
        borderRadius: 3,
    },
    forecastBar: {
        opacity: 0.65,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#35447B',
    },
    labels: {
        marginLeft: 45,
        flexDirection: 'row',
        marginTop: 10,
    },
    label: {
        flex: 1,
        textAlign: 'center',
        fontSize: 10,
        lineHeight: 15,
        color: '#52685A',
        paddingHorizontal: 2,
    },
    lineLabels: {
        justifyContent: 'space-between',
    },
    lineLabel: {
        flex: 0,
        maxWidth: '48%',
    },
    segment: {
        position: 'absolute',
        height: 2,
    },
    dot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    note: {
        fontSize: 11,
        lineHeight: 17,
        color: '#637668',
    },
    valuesButton: {
        minHeight: 44,
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    link: {
        fontSize: 12,
        fontWeight: '600',
        color: '#087758',
    },
    valueRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#E0E8E2',
        paddingTop: 8,
    },
    valueLabel: {
        fontSize: 12,
        color: '#42584C',
    },
    value: {
        fontSize: 12,
        fontWeight: '600',
        color: '#162D23',
    },
    switchRow: {
        flexDirection: 'row',
        gap: 6,
    },
    switch: {
        paddingHorizontal: 13,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: 8,
    },
    selected: {
        backgroundColor: '#DCEEE3',
    },
    switchText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A654A',
    },
});