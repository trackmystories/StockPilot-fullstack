import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {NotificationType, StockPilotNotification} from '../types/notification';

type Props = {
  notification: StockPilotNotification;
  onPress: () => void;
};

function getNotificationStyle(type: NotificationType) {
  switch (type) {
    case 'stock':
      return {
        icon: 'trending-up-outline' as const,
        backgroundColor: '#DCF7EE',
        iconColor: '#00A878',
      };

    case 'research':
      return {
        icon: 'document-text-outline' as const,
        backgroundColor: '#E8F1FF',
        iconColor: '#1677FF',
      };

    case 'watchlist':
      return {
        icon: 'heart-outline' as const,
        backgroundColor: '#FFE5E5',
        iconColor: '#F04444',
      };

    case 'system':
      return {
        icon: 'information-circle-outline' as const,
        backgroundColor: '#EDF2F7',
        iconColor: '#49627F',
      };
  }
}

function formatAge(date: string) {
  const difference = Date.now() - new Date(date).getTime();

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export default function NotificationCard({notification, onPress}: Props) {
  const notificationStyle = getNotificationStyle(notification.type);

  const label =
    notification.ticker ||
    (notification.type === 'research'
      ? 'Stock Pilot'
      : notification.type === 'watchlist'
        ? 'Watchlist Update'
        : 'System');

  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      {!notification.read && <View style={styles.unreadDot} />}

      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: notificationStyle.backgroundColor,
          },
        ]}
      >
        <Ionicons name={notificationStyle.icon} size={28} color={notificationStyle.iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>

          <Text style={styles.time}>{formatAge(notification.createdAt)}</Text>
        </View>

        <Text numberOfLines={1} style={styles.title}>
          {notification.title}
        </Text>

        <Text numberOfLines={3} style={styles.message}>
          {notification.message}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,
    paddingVertical: 18,

    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0E8F1',

    backgroundColor: '#FFFFFF',

    gap: 14,
  },

  pressed: {
    opacity: 0.7,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,

    backgroundColor: '#05B883',

    marginLeft: -8,
    marginRight: -2,
  },

  iconContainer: {
    width: 58,
    height: 58,

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    gap: 4,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    gap: 8,
  },

  label: {
    flex: 1,

    fontSize: 17,
    fontWeight: '700',

    color: '#062653',
  },

  time: {
    fontSize: 12,

    color: '#7A8EAB',
  },

  title: {
    fontSize: 15,
    fontWeight: '700',

    color: '#062653',
  },

  message: {
    fontSize: 14,
    lineHeight: 20,

    color: '#7A8EAB',
  },
});
