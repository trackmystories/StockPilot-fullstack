import {Ionicons} from '@expo/vector-icons';
import {useMemo, useState} from 'react';

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {SafeAreaView} from 'react-native-safe-area-context';

import type {ProfileStackParamList} from '../../';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ChangePassword'>;

type PasswordInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function PasswordInput({label, value, onChangeText}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="••••••••"
          placeholderTextColor="#8295AF"
          style={styles.input}
        />

        <Pressable
          onPress={() => {
            setVisible((current) => !current);
          }}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={24} color="#7186A4" />
        </Pressable>
      </View>
    </View>
  );
}

type RequirementProps = {
  valid: boolean;
  children: string;
};

function PasswordRequirement({valid, children}: RequirementProps) {
  return (
    <View style={styles.requirement}>
      <View style={[styles.requirementIcon, !valid && styles.requirementIconInactive]}>
        <Ionicons name="checkmark" size={16} color={valid ? '#FFFFFF' : '#A5B3C5'} />
      </View>

      <Text style={[styles.requirementText, valid && styles.validRequirement]}>{children}</Text>
    </View>
  );
}

export default function ChangePasswordScreen({navigation}: Props) {
  const [currentPassword, setCurrentPassword] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const requirements = useMemo(
    () => ({
      length: newPassword.length >= 8,

      uppercase: /[A-Z]/.test(newPassword),

      number: /\d/.test(newPassword),
    }),
    [newPassword],
  );

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validPassword = requirements.length && requirements.uppercase && requirements.number;

  const canSubmit = currentPassword.length > 0 && validPassword && passwordsMatch;

  const handleUpdatePassword = async () => {
    if (!canSubmit) {
      return;
    }

    Alert.alert(
      'Password ready',
      'The form is valid. We can now connect this action to Firebase Authentication.',
    );
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot password', 'We can connect this to Firebase sendPasswordResetEmail().');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={30} color="#062653" />
          </Pressable>

          <Text style={styles.heading}>Change Password</Text>

          <Text style={styles.subtitle}>Keep your account secure</Text>

          <View style={styles.form}>
            <PasswordInput
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <PasswordInput label="New password" value={newPassword} onChangeText={setNewPassword} />

            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.requirementsCard}>
              <Text style={styles.requirementsTitle}>Password must include:</Text>

              <PasswordRequirement valid={requirements.length}>
                At least 8 characters
              </PasswordRequirement>

              <PasswordRequirement valid={requirements.uppercase}>
                One uppercase letter
              </PasswordRequirement>

              <PasswordRequirement valid={requirements.number}>One number</PasswordRequirement>
            </View>

            {!!confirmPassword && !passwordsMatch && (
              <Text style={styles.error}>Passwords do not match.</Text>
            )}

            <Pressable
              disabled={!canSubmit}
              onPress={handleUpdatePassword}
              style={({pressed}) => [
                styles.updateButton,

                !canSubmit && styles.disabledButton,

                pressed && canSubmit && styles.pressedButton,
              ]}
            >
              <Text style={styles.updateButtonText}>Update password</Text>
            </Pressable>

            <Pressable onPress={handleForgotPassword} style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 4,

    // important:
    // gives space above bottom tabs
    paddingBottom: 140,
  },

  backButton: {
    width: 42,
    height: 42,

    justifyContent: 'center',

    marginLeft: -8,
    marginBottom: 10,
  },

  heading: {
    fontSize: 34,
    lineHeight: 41,

    fontWeight: '800',

    color: '#062653',
  },

  subtitle: {
    marginTop: 4,

    fontSize: 18,
    lineHeight: 25,

    color: '#7A8EAB',
  },

  form: {
    marginTop: 38,

    gap: 22,
  },

  field: {
    gap: 9,
  },

  label: {
    fontSize: 16,
    fontWeight: '500',

    color: '#415C82',
  },

  inputContainer: {
    minHeight: 62,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,

    borderWidth: 1,
    borderColor: '#DCE6F1',

    borderRadius: 14,

    backgroundColor: '#FFFFFF',
  },

  input: {
    flex: 1,

    fontSize: 17,

    color: '#062653',

    paddingVertical: 16,
  },

  requirementsCard: {
    padding: 18,

    borderWidth: 1,
    borderColor: '#DFE8F1',

    borderRadius: 18,

    backgroundColor: '#FAFCFE',

    gap: 13,
  },

  requirementsTitle: {
    fontSize: 15,
    fontWeight: '600',

    color: '#496181',

    marginBottom: 2,
  },

  requirement: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 12,
  },

  requirementIcon: {
    width: 25,
    height: 25,

    borderRadius: 13,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#06B981',
  },

  requirementIconInactive: {
    backgroundColor: '#EEF2F6',
  },

  requirementText: {
    fontSize: 15,

    color: '#8999AF',
  },

  validRequirement: {
    color: '#536981',
  },

  error: {
    marginTop: -10,

    fontSize: 13,

    color: '#E32626',
  },

  updateButton: {
    minHeight: 60,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 16,

    backgroundColor: '#05B883',
  },

  disabledButton: {
    opacity: 0.4,
  },

  pressedButton: {
    opacity: 0.8,
  },

  updateButtonText: {
    fontSize: 18,
    fontWeight: '700',

    color: '#FFFFFF',
  },

  forgotButton: {
    alignItems: 'center',

    paddingVertical: 8,
  },

  forgotText: {
    fontSize: 15,
    fontWeight: '500',

    color: '#435C80',
  },
});
