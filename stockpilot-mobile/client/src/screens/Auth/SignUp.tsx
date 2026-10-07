import {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch} from '../store/hooks';
import {establishSession} from './state/authSlice';
import {SignUpUser} from './application/SignUpUser';
import {HttpAuthRepository} from './infrastructure/HttpAuthRepository';
import AuthLayout from './components/AuthLayout';
import AuthHeading from './components/AuthHeading';
import AuthButton from './components/AuthButton';
import AuthInput from './components/AuthInput';
import AuthLink from './components/AuthLink';

const authRepository = new HttpAuthRepository();
const signUpUser = new SignUpUser(authRepository);

export default function SignUp() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (loading) {
      return;
    }
    if (!nickname.trim()) {
      Alert.alert('Error', 'Please enter a nickname');
      return;
    }
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please complete all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const result = await signUpUser.execute(nickname.trim(), email.trim(), password);
      await dispatch(establishSession(result)).unwrap();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not create your account';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading
        eyebrow="OWN TOMORROW"
        title={'Create your\naccount'}
        subtitle="Your next insight starts here."
      />
      <AuthInput
        label="Nickname"
        placeholder="Choose a nickname"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="nickname"
        value={nickname}
        onChangeText={setNickname}
        editable={!loading}
      />
      <AuthInput
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />
      <AuthInput
        label="Password"
        placeholder="Create a password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />
      <AuthInput
        label="Confirm password"
        placeholder="Repeat your password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!loading}
        returnKeyType="done"
        onSubmitEditing={() => void handleSignUp()}
      />
      <AuthButton title="Create account" loading={loading} onPress={handleSignUp} />
      <AuthLink
        prefix="Already have an account?"
        text="Sign in"
        disabled={loading}
        onPress={() => navigation.navigate('SignIn' as never)}
      />
    </AuthLayout>
  );
}
