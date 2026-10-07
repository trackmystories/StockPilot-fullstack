import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

type Props = {
  text: string;
  prefix?: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function AuthLink({text, prefix, onPress, disabled = false}: Props) {
  return (
    <View style={styles.container}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityState={{disabled}}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[styles.link, disabled && styles.disabled]}
      >
        <Text style={styles.text}>{text}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 5,
  },
  prefix: {
    color: '#6B7079',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  text: {
    color: '#079B73',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
