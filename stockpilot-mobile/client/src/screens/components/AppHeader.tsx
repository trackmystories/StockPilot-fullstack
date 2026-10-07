import {Ionicons} from '@expo/vector-icons';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNotifications} from '../Notifications/hooks/useNotifications';

type Props = {
  onSearchPress: () => void;
  onNotificationsPress: () => void;
  hasUnreadNotifications?: boolean;
};

export function AppHeader({onSearchPress, onNotificationsPress, hasUnreadNotifications}: Props) {
  const {items} = useNotifications({checkUnreadPages: true});
  const unread = hasUnreadNotifications ?? items.some((item) => !item.read);
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

      <Pressable
        style={({pressed}) => [styles.searchButton, pressed && styles.pressed]}
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Search stocks"
      >
        <Ionicons name="search-outline" size={21} color="#667085" />

        <Text style={styles.searchText} numberOfLines={1}>
          Search stocks, companies...
        </Text>
      </Pressable>

      <Pressable
        style={({pressed}) => [styles.notificationButton, pressed && styles.pressed]}
        onPress={onNotificationsPress}
        accessibilityRole="button"
        accessibilityLabel={
          unread ? 'Notifications, unread notifications' : 'Notifications, no unread notifications'
        }
      >
        <Ionicons name="notifications-outline" size={25} color="#081B3A" />

        <View style={[styles.notificationDot, {backgroundColor: unread ? '#E5484D' : '#08A66D'}]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 20,
    gap: 12,
  },

  logo: {
    width: 38,
    height: 38,
  },

  searchButton: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 9,
    borderRadius: 22,
    backgroundColor: '#EEF3F2',
  },

  searchText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#667085',
  },

  notificationButton: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#08A66D',
    borderWidth: 1.5,
    borderColor: '#F7FCFB',
  },

  pressed: {
    opacity: 0.65,
  },
});
