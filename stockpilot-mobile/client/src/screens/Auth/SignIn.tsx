import {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch} from '../store/hooks';
import {establishSession} from './state/authSlice';
import {SignInUser} from './application/SignInUser';
import {HttpAuthRepository} from './infrastructure/HttpAuthRepository';
import AuthLayout from './components/AuthLayout';
import AuthHeading from './components/AuthHeading';
import AuthButton from './components/AuthButton';
import AuthInput from './components/AuthInput';
import AuthLink from './components/AuthLink';

const authRepository = new HttpAuthRepository();
const signInUser = new SignInUser(authRepository);

export default function SignIn() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) {
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    try {
      setLoading(true);
      const result = await signInUser.execute(email.trim(), password);
      await dispatch(establishSession(result)).unwrap();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Incorrect email or password';
      Alert.alert('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading eyebrow="WELCOME BACK" subtitle="Sign in to your StockPilot account." />
      <AuthInput
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="username"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />
      <AuthInput
        label="Password"
        placeholder="Enter your password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
        returnKeyType="done"
        onSubmitEditing={() => void handleSignIn()}
      />
      <AuthButton title="Sign in" loading={loading} onPress={handleSignIn} />
      <AuthLink
        prefix="New to StockPilot?"
        text="Create account"
        disabled={loading}
        onPress={() => navigation.navigate('SignUp' as never)}
      />
    </AuthLayout>
  );
}
