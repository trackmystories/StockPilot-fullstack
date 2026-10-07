import {useState, type ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export const analysisColors = {
  ink: '#142947',
  muted: '#667792',
  green: '#079B73',
  red: '#B54747',
  amber: '#A46A11',
  border: '#E4EFEC',
  mint: '#E2F5EC',
};

export function formatAmount(value: number | null | undefined, currency?: string | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  const options: Intl.NumberFormatOptions = {maximumFractionDigits: 2};
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    options.style = 'currency';
    options.currency = currency;
    options.currencyDisplay = 'code';
  }
  return new Intl.NumberFormat('en-US', options).format(value);
}

export function formatPercent(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
    : 'Unavailable';
}

export function confidenceLabel(value: 'low' | 'medium' | 'high') {
  return value === 'high' ? 'High' : value === 'medium' ? 'Moderate' : 'Low';
}

export function AnalysisCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={analysisStyles.card}>
      <View style={analysisStyles.header}>
        <Text accessibilityRole="header" style={analysisStyles.title}>
          {title}
        </Text>
        {badge}
      </View>
      {children}
    </View>
  );
}

export function AnalysisBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'positive' | 'negative' | 'neutral' | 'caution';
}) {
  const color =
    tone === 'positive'
      ? analysisColors.green
      : tone === 'negative'
        ? analysisColors.red
        : tone === 'caution'
          ? analysisColors.amber
          : analysisColors.muted;
  return (
    <View
      style={[
        analysisStyles.badge,
        {
          backgroundColor:
            tone === 'positive'
              ? '#E2F5EC'
              : tone === 'negative'
                ? '#FCEDED'
                : tone === 'caution'
                  ? '#FFF5E2'
                  : '#F1F4F6',
        },
      ]}
    >
      <Text style={[analysisStyles.badgeText, {color}]}>{label}</Text>
    </View>
  );
}

export function AnalysisMetric({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={analysisStyles.metric}>
      <Text style={analysisStyles.label}>{label}</Text>
      <Text
        style={[
          analysisStyles.value,
          {
            color: positive
              ? analysisColors.green
              : negative
                ? analysisColors.red
                : analysisColors.ink,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function AnalysisDetails({label, children}: {label: string; children: ReactNode}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={analysisStyles.details}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded}}
        accessibilityLabel={label}
        onPress={() => setExpanded((value) => !value)}
        style={analysisStyles.detailsButton}
      >
        <Text style={analysisStyles.detailsLabel}>{expanded ? 'Hide details' : label}</Text>
        <Text style={analysisStyles.chevron}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? <View style={analysisStyles.detailBody}>{children}</View> : null}
    </View>
  );
}

export const analysisStyles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: analysisColors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {fontSize: 19, fontWeight: '600', color: analysisColors.ink, flexShrink: 1},
  badge: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, maxWidth: '100%'},
  badgeText: {fontSize: 12, fontWeight: '600', flexShrink: 1},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  metric: {flexGrow: 1, flexShrink: 1, flexBasis: 125, minWidth: 0},
  label: {fontSize: 13, color: analysisColors.muted, lineHeight: 19},
  value: {fontSize: 23, fontWeight: '600', color: analysisColors.ink, marginTop: 5, flexShrink: 1},
  hero: {fontSize: 34, fontWeight: '700', color: analysisColors.ink, marginTop: 4, flexShrink: 1},
  divider: {borderTopWidth: 1, borderTopColor: analysisColors.border, marginVertical: 16},
  note: {fontSize: 12, lineHeight: 18, color: analysisColors.muted, marginTop: 12},
  body: {fontSize: 13, lineHeight: 20, color: analysisColors.muted},
  details: {marginTop: 16, borderTopWidth: 1, borderTopColor: analysisColors.border},
  detailsButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  detailsLabel: {fontSize: 13, color: analysisColors.ink, flex: 1},
  chevron: {fontSize: 22, color: analysisColors.muted},
  detailBody: {gap: 14, paddingTop: 12},
  detailTitle: {fontSize: 13, fontWeight: '600', color: analysisColors.ink, lineHeight: 20},
});
