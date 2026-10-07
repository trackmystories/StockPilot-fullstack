import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {ProfileStackParamList} from '../../';
import {useAppSelector} from '../store/hooks';
import ProfileHeader from './components/ProfileHeader';
import ProfileMenuItem from './components/ProfileMenuItem';
import ProfileUserCard from './components/ProfileUserCard';
import {AppHeader} from '../components/AppHeader';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

export default function Profile() {
  const navigation = useNavigation<NavigationProp>();
  const user = useAppSelector((state) => state.auth.user);
  const loading = useAppSelector((state) => state.auth.loading);
  const displayName = user?.nickname || user?.email || 'User';
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        onSearchPress={() => {
          navigation.navigate('StockSearch');
        }}
        onNotificationsPress={() => {
          navigation.navigate('Notifications');
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ProfileHeader />
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#079B73" />
          </View>
        ) : (
          <ProfileUserCard name={displayName} email={user?.email ?? ''} />
        )}
        <View style={styles.menu}>
          <ProfileMenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Alerts and market updates"
            tone="green"
            onPress={() => navigation.navigate('Notifications')}
          />
          <ProfileMenuItem
            icon="shield-checkmark-outline"
            title="Security"
            subtitle="Password and account security"
            tone="amber"
            onPress={() => navigation.navigate('Security')}
          />
          <ProfileMenuItem
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="Terms of service and privacy policy"
            tone="rose"
            onPress={() => navigation.navigate('TermsPrivacy')}
          />
        </View>
        <View style={styles.footer}>
          <Text style={styles.version}>StockPilot v1.0.0</Text>
          <Text style={styles.tagline}>Built for smarter investors.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {flex: 1,  backgroundColor: '#F7FCFB',},
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  loader: {minHeight: 150, alignItems: 'center', justifyContent: 'center'},
  menu: {marginTop: 22, gap: 14},
  footer: {marginTop: 28, paddingBottom: 12},
  version: {fontSize: 12, lineHeight: 18, fontWeight: '600', color: '#7B8BA5'},
  tagline: {marginTop: 2, fontSize: 12, lineHeight: 18, color: '#7B8BA5'},
});
