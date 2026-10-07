import {ActivityIndicator, StyleSheet, Text, TouchableOpacity} from 'react-native';

type Props = {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export default function AuthButton({title, loading = false, disabled = false, onPress}: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{disabled: isDisabled, busy: loading}}
      activeOpacity={0.8}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#079B73',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
});
