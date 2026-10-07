import {Ionicons} from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {ProfileStackParamList} from '../../';
import {deleteAccount, signOut} from '../Auth/state/authSlice';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import SecurityRow from './components/SecurityRow';
import {typography} from '../../styles/typography';
import Header from '../components/Header';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Security'>;

export default function SecurityScreen({navigation}: Props) {
  const dispatch = useAppDispatch();

  const loading = useAppSelector((state) => state.auth.loading);

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
    } catch (error) {
      console.error('Could not sign out:', error);

      Alert.alert('Could not log out', 'Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and your saved data. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              await dispatch(deleteAccount()).unwrap();
            } catch (error) {
              console.error('Could not delete account:', error);

              Alert.alert('Could not delete account', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleTwoFactorAuthentication = () => {
    Alert.alert('Two-factor authentication', 'Two-factor authentication will be available soon.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={30} color="#062653" />
        </Pressable>
        <Header title="Security" subtitle="Password and account security" />

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#05B883" />
        ) : (
          <View style={styles.rows}>
            <SecurityRow
              icon="shield-checkmark-outline"
              iconColor="#183A66"
              iconBackgroundColor="#F0F4F8"
              title="Change password"
              subtitle="Update your password regularly"
              onPress={() => {
                navigation.navigate('ChangePassword');
              }}
            />

            <SecurityRow
              icon="lock-closed-outline"
              iconColor="#00A878"
              iconBackgroundColor="#DDF8EE"
              title="Two-factor authentication"
              subtitle="Add an extra layer of protection to your account"
              badge="Off"
              onPress={handleTwoFactorAuthentication}
            />

            <SecurityRow
              icon="log-out-outline"
              iconColor="#F59E0B"
              iconBackgroundColor="#FFF2D8"
              title="Log out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
            />

            <SecurityRow
              icon="trash-outline"
              iconColor="#E32626"
              iconBackgroundColor="#FFE5E5"
              title="Delete account"
              subtitle="Permanently delete your account"
              danger
              onPress={handleDeleteAccount}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 140,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 10,
  },

  rows: {
    marginTop: 26,

    gap: 12,
  },

  loader: {
    marginTop: 60,
  },
});
