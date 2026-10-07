import {StyleSheet, Text, TouchableOpacity} from 'react-native';
type Props = {
  title: string;
  compact?: boolean;
  active?: boolean;
  onPress: () => void;
};
export function AlgorithmButton({title, active = false, onPress}: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{selected: active}}
      activeOpacity={0.75}
      delayPressIn={50}
      onPress={onPress}
      style={[styles.button, active && styles.buttonActive]}
    >
      <Text numberOfLines={2} style={[styles.text, active && styles.textActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  button: {
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7E0EC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: '#0F9D67',
    borderColor: '#0F9D67',
  },
  text: {
    color: '#0B2A5B',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  textActive: {
    color: '#FFFFFF',
  },
});
