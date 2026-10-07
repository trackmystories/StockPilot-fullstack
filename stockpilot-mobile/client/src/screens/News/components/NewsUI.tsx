import type {ReactNode} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

export const colors = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0B1F44',
  muted: '#7A8DAA',
  accent: '#0FB981',
  border: '#E3EAF2',
};

export function Page({children}: {children: ReactNode}) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && {opacity: 0.45}]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Feedback({loading, error}: {loading?: boolean; error?: string}) {
  return (
    <View style={{gap: 8}}>
      {loading && <ActivityIndicator color={colors.accent} />}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },

  text: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 25,
  },

  muted: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
  },

  error: {
    color: '#D14343',
    fontSize: 15,
    lineHeight: 23,
  },

  button: {
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 16,
  },

  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
