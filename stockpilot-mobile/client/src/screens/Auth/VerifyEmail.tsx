import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, AppState, StyleSheet, Text, View} from 'react-native';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {ResendVerificationEmail} from './application/ResendVerificationEmail';
import AuthButton from './components/AuthButton';
import AuthHeading from './components/AuthHeading';
import AuthLayout from './components/AuthLayout';
import AuthLink from './components/AuthLink';
import {HttpAuthRepository} from './infrastructure/HttpAuthRepository';
import {refreshEmailVerification, signOut} from './state/authSlice';

const authRepository = new HttpAuthRepository();
const resendVerificationEmail = new ResendVerificationEmail(authRepository);

export default function VerifyEmail() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const checkingRef = useRef(false);

  const checkVerification = useCallback(
    async (showPendingMessage: boolean) => {
      if (checkingRef.current) {
        return;
      }

      checkingRef.current = true;
      setChecking(true);

      try {
        const session = await dispatch(refreshEmailVerification()).unwrap();

        if (!session.user.emailVerified && showPendingMessage) {
          Alert.alert(
            'Email not verified yet',
            'Open the verification link in your email, then return to StockPilot and try again.',
          );
        }
      } catch (error: unknown) {
        if (showPendingMessage) {
          const message = error instanceof Error ? error.message : 'Could not check your verification status.';
          Alert.alert('Could not verify email', message);
        }
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    void checkVerification(false);

    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkVerification(false);
      }
    });

    return () => {
      listener.remove();
    };
  }, [checkVerification]);

  const handleResend = async () => {
    if (resending) {
      return;
    }

    try {
      setResending(true);
      const result = await resendVerificationEmail.execute();

      if (result.alreadyVerified) {
        await checkVerification(false);
        return;
      }

      Alert.alert(
        'Verification email sent',
        `Check ${user?.email ?? 'your inbox'} for a new verification link.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not resend the verification email.';
      Alert.alert('Could not resend email', message);
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    try {
      setSigningOut(true);
      await dispatch(signOut()).unwrap();
    } finally {
      setSigningOut(false);
    }
  };

  const busy = checking || resending || signingOut;

  return (
    <AuthLayout>
      <AuthHeading
        eyebrow="VERIFY YOUR EMAIL"
        subtitle="Email verification is required before you can use StockPilot."
      />

      <View style={styles.card}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.copy}>We sent a verification link to:</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
        <Text style={styles.instructions}>
          Open the link in your email. When you return to StockPilot, we will check your verification status automatically.
        </Text>
      </View>

      <AuthButton
        title="I've verified my email"
        loading={checking}
        disabled={resending || signingOut}
        onPress={() => void checkVerification(true)}
      />

      <AuthLink
        prefix="Didn't receive it?"
        text={resending ? 'Sending…' : 'Resend verification email'}
        disabled={busy}
        onPress={() => void handleResend()}
      />

      <AuthLink
        text={signingOut ? 'Signing out…' : 'Sign out'}
        disabled={busy}
        onPress={() => void handleSignOut()}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E3ECE9',
    borderRadius: 14,
    backgroundColor: '#F8FBFA',
  },
  title: {
    marginBottom: 8,
    color: '#081B3A',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
  },
  copy: {
    color: '#6B7079',
    fontSize: 15,
    lineHeight: 23,
  },
  email: {
    marginTop: 4,
    color: '#079B73',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  instructions: {
    marginTop: 18,
    color: '#6B7079',
    fontSize: 14,
    lineHeight: 22,
  },
});