import {useState} from 'react';

import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Ionicons} from '@expo/vector-icons';

type MetricTone = 'positive' | 'negative' | 'neutral' | 'unavailable';

type Props = {
  label: string;
  value: string;
  description?: string;
  tone?: MetricTone;
};

function getToneColor(tone: MetricTone) {
  switch (tone) {
    case 'positive':
      return '#079B73';

    case 'negative':
      return '#D64545';

    case 'unavailable':
      return '#7788A3';

    default:
      return '#142947';
  }
}

function getValueStyle(tone: MetricTone) {
  switch (tone) {
    case 'positive':
      return styles.positive;

    case 'negative':
      return styles.negative;

    case 'unavailable':
      return styles.unavailable;

    default:
      return styles.neutral;
  }
}

export function MetricInfoRow({label, value, description, tone = 'neutral'}: Props) {
  const [expanded, setExpanded] = useState(false);

  const toneColor = getToneColor(tone);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>

          {description ? (
            <Pressable
              style={styles.infoButton}
              onPress={() => setExpanded((current) => !current)}
              hitSlop={8}
            >
              <Ionicons name="information-circle-outline" size={16} color={toneColor} />

              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={toneColor}
              />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.value, getValueStyle(tone)]}>{value}</Text>
      </View>

      {description && expanded ? (
        <View style={[styles.infoBox, tone === 'negative' && styles.infoBoxNegative]}>
          <Text style={styles.description}>{description}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5ECEA',
  },

  row: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },

  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  label: {
    fontSize: 14,
    lineHeight: 19,
    color: '#667792',
  },

  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  value: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },

  positive: {
    color: '#079B73',
  },

  negative: {
    color: '#D64545',
  },

  neutral: {
    color: '#142947',
  },

  unavailable: {
    color: '#7788A3',
  },

  description: {
    fontSize: 12,
    lineHeight: 17,
    color: '#71819B',
  },
});
