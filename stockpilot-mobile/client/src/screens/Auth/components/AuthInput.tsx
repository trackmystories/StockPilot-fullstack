import {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import type {TextInputProps} from 'react-native';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export default function AuthInput({
  label,
  error,
  secureTextEntry = false,
  editable = true,
  style,
  onFocus,
  onBlur,
  accessibilityLabel,
  placeholderTextColor = '#858C98',
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={accessibilityLabel ?? label ?? props.placeholder}
          placeholderTextColor={placeholderTextColor}
          editable={editable}
          secureTextEntry={secureTextEntry && !passwordVisible}
          style={[styles.input, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityState={{disabled: !editable}}
            disabled={!editable}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.visibilityButton}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={21}
              color="#747B86"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: '#151515',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  inputContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 10,
    backgroundColor: '#F7F8FA',
  },
  inputFocused: {
    borderColor: '#079B73',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#C84545',
  },
  inputDisabled: {
    opacity: 0.65,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#151515',
    fontSize: 16,
  },
  visibilityButton: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: 6,
    color: '#C84545',
    fontSize: 12,
    lineHeight: 18,
  },
});
