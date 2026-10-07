import type { ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import type { PortfolioStackParamList } from '../domain/navigation';

export const palette = { green: '#079B73', navy: '#081B3A', muted: '#7788A3', border: '#DDE7E4', pale: '#EAF8F2', red: '#D9534F' };

export function PortfolioScreen({ children, title, back = false, action, footer }: {
  children: ReactNode;
  title: string;
  back?: boolean;
  action?: ReactNode;
  footer?: ReactNode;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<PortfolioStackParamList>>();
  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <AppHeader
        onSearchPress={() => navigation.navigate('StockSearch')}
        onNotificationsPress={() => navigation.navigate('Notifications')}
      />
      <View style={s.header}>
        {back ? (
          <TouchableOpacity
            style={s.iconButton}
            activeOpacity={0.7}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PortfoliosHome')}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={palette.navy} />
          </TouchableOpacity>
        ) : null}
        <Text
          style={s.title}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.3}
        >{title}</Text>
        {action}
      </View>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {children}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Button({ label, onPress, pending = false, disabled = false, secondary = false }: {
  label: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={pending || disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: pending || disabled, busy: pending }}
      style={[s.button, secondary && s.secondaryButton, (pending || disabled) && s.disabled]}
    >
      {pending ? <ActivityIndicator color={secondary ? palette.green : '#FFFFFF'} /> : <Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={palette.muted}
        style={[s.input, props.style]}
      />
    </View>
  );
}

export function Notice({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <View style={[s.notice, warning && s.warningNotice]}><Text style={[s.noticeText, warning && s.warningText]}>{children}</Text></View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

export function Feedback({ loading, error, onRetry }: { loading?: boolean; error?: string | null; onRetry?: () => void }) {
  return (
    <View style={s.feedback}>
      {loading ? <ActivityIndicator color={palette.green} /> : null}
      <Text style={s.caption}>{error ?? (loading ? 'Loading…' : '')}</Text>
      {error && onRetry ? <Button label="Try again" onPress={onRetry} secondary /> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  flex: {
    flex: 1,
    minWidth: 0,
  },

  page: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 18,
  },

  header: {
    paddingHorizontal: 12,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#081B3A',
    marginHorizontal: 8,
  },

  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#081B3A',
  },

  text: {
    fontSize: 14,
    color: '#081B3A',
    lineHeight: 21,
  },

  muted: {
    fontSize: 14,
    color: '#7788A3',
    lineHeight: 21,
  },

  caption: {
    fontSize: 12,
    color: '#7788A3',
    lineHeight: 18,
  },

  error: {
    fontSize: 13,
    lineHeight: 20,
    color: '#B25148',
  },

  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  field: {
    gap: 8,
  },

  label: {
    fontSize: 14,
    color: '#081B3A',
    fontWeight: '600',
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDE5EF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#081B3A',
    fontSize: 16,
  },

  button: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#079B73',
  },

  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: '#DDE7E4',
    backgroundColor: '#FFFFFF',
  },

  secondaryText: {
    color: '#079B73',
  },

  disabled: {
    opacity: 0.45,
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EBF0',
    backgroundColor: '#FFFFFF',
  },

  card: {
    padding: 14,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4EBF0',
    backgroundColor: '#FFFFFF',
  },

  notice: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EAF8F2',
  },

  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#087A61',
  },

  warningNotice: {
    backgroundColor: '#FFF7E8',
  },

  warningText: {
    color: '#8E641E',
  },

  feedback: {
    padding: 24,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  link: {
    color: '#079B73',
    fontWeight: '600',
    fontSize: 14,
  },
});
