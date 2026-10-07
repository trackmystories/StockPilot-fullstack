import {Ionicons} from '@expo/vector-icons';

import {StyleSheet, Text, View} from 'react-native';

export default function NotificationsEmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={48} color="#00A878" />
      </View>

      <Text style={styles.title}>No notifications yet</Text>

      <Text style={styles.description}>
        Market alerts, watchlist updates, and Stock Pilot research will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 40,
    paddingBottom: 100,
  },

  iconContainer: {
    width: 118,
    height: 118,

    borderRadius: 59,

    backgroundColor: '#E7FAF4',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',

    color: '#062653',

    marginBottom: 12,
  },

  description: {
    maxWidth: 310,

    textAlign: 'center',

    fontSize: 16,
    lineHeight: 23,

    color: '#7A8EAB',
  },
});
