import {useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppSelector} from '../store/hooks';
import Header from '../components/Header';
import NotificationCard from './components/NotificationCard';
import NotificationsEmptyState from './components/NotificationsEmptyState';
import {useNotifications} from './hooks/useNotifications';
import {openNotification} from './notificationNavigation';
import {registerPush} from './infrastructure/pushSession';
import {Ionicons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';

type Filter = 'all' | 'unread';
export default function NotificationsScreen() {
  const navigation = useNavigation();
  const token = useAppSelector((state) => state.auth.token);
  const [filter, setFilter] = useState<Filter>('all');
  const [saving, setSaving] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [message, setMessage] = useState('');
  const writeLock = useRef(false);
  const pushLock = useRef(false);
  const {items, loading, error, refresh, loadMore, hasMore, markRead, markAllRead} =
    useNotifications();
  const notifications = token ? items : [];
  const unread = useMemo(() => notifications.filter((item) => !item.read), [notifications]);
  const visible = filter === 'unread' ? unread : notifications;
  const displayError = token ? error : 'Please sign in to view notifications.';
  const fail = (title: string, cause: unknown) => {
    const detail = cause instanceof Error ? cause.message : 'Please try again.';
    setMessage(detail);
    Alert.alert(title, detail);
  };
  const selectFilter = (next: Filter) => {
    setFilter(next);
    setMessage('');
  };
  const handleMarkAllAsRead = async () => {
    if (!token || writeLock.current) return;
    writeLock.current = true;
    setSaving(true);
    setMessage('Saving read status…');
    try {
      await markAllRead();
      setMessage('Read status saved. Refreshing notifications…');
      await refresh();
      setMessage('Read status saved. Any refresh error is shown below.');
    } catch (cause) {
      fail('Could not mark all as read', cause);
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  };
  const handleNotificationPress = async (id: string) => {
    if (!token || writeLock.current) return;
    const item = notifications.find((notification) => notification.id === id);
    if (!item) return;
    writeLock.current = true;
    setSaving(true);
    setMessage('Opening notification…');
    try {
      if (!item.read) await markRead(id);
      if (item.articleId) {
        if (!openNotification(item.articleId)) {
          throw new Error('Article navigation is not ready. Check the NavigationContainer ref.');
        }
        setMessage('');
      } else {
        setMessage('Notification marked as read.');
        Alert.alert(item.title, item.message);
      }
    } catch (cause) {
      fail('Could not open notification', cause);
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  };
  const enablePush = async () => {
    if (!token || pushLock.current) return;
    pushLock.current = true;
    setEnablingPush(true);
    setMessage('Checking push permission and registering this device…');
    try {
      const enabled = await registerPush(token, true);
      if (enabled) {
        setMessage('Push notifications enabled for this device.');
        Alert.alert(
          'Notifications enabled',
          'This device has been registered for push notifications.',
        );
      } else {
        setMessage('Push registration did not complete.');
        Alert.alert(
          'Push not enabled',
          'Registration did not complete. Check notification permission and your signed-in push session.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Open settings',
              onPress: () =>
                void Linking.openSettings().catch((cause) =>
                  fail('Could not open settings', cause),
                ),
            },
          ],
        );
      }
    } catch (cause) {
      fail('Could not enable notifications', cause);
    } finally {
      pushLock.current = false;
      setEnablingPush(false);
    }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          navigation.goBack();
        }}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={30} color="#062653" />
      </Pressable>
      <View style={styles.header}>
        <Header title="Notifications" subtitle="Market alerts and updates" />
        <Pressable
          accessibilityRole="button"
          disabled={!token || enablingPush}
          onPress={() => void enablePush()}
          style={styles.pushButton}
        >
          {enablingPush && <ActivityIndicator size="small" color="#05A978" />}
          <Text style={styles.action}>
            {enablingPush ? 'Enabling push…' : 'Enable push notifications'}
          </Text>
        </Pressable>
        <View style={styles.controls}>
          <View style={styles.filters}>
            {(['all', 'unread'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{selected: filter === value}}
                onPress={() => selectFilter(value)}
                style={[styles.filter, filter === value && styles.activeFilter]}
              >
                <Text style={[styles.filterText, filter === value && styles.activeText]}>
                  {value === 'all' ? `All (${notifications.length})` : `Unread (${unread.length})`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!token || saving}
            onPress={() => void handleMarkAllAsRead()}
            style={styles.markButton}
          >
            {saving && <ActivityIndicator size="small" color="#05A978" />}
            <Text style={styles.action}>{saving ? 'Saving…' : 'Mark all as read'}</Text>
          </Pressable>
        </View>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {filter === 'unread'
            ? `Showing ${unread.length} unread notifications`
            : `Showing ${notifications.length} notifications`}
          {hasMore ? ' from loaded pages.' : '.'}
        </Text>
        {!!message && (
          <Text style={styles.status} accessibilityLiveRegion="polite">
            {message}
          </Text>
        )}
      </View>
      <FlatList
        data={visible}
        extraData={filter}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={token ? () => void refresh() : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, visible.length === 0 && styles.emptyList]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          displayError ? (
            <Pressable disabled={!token} onPress={() => void refresh()}>
              <Text style={styles.error}>
                {displayError}
                {token ? ' — Tap to retry' : ''}
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({item}) => (
          <NotificationCard
            notification={item}
            onPress={() => void handleNotificationPress(item.id)}
          />
        )}
        ListEmptyComponent={
          !loading && !displayError ? (
            filter === 'unread' ? (
              <Text style={styles.emptyText}>
                {hasMore
                  ? 'No unread notifications in the loaded pages. Load more to check older notifications.'
                  : 'No unread notifications.'}
              </Text>
            ) : (
              <NotificationsEmptyState />
            )
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.footer} color="#05A978" />
          ) : token && hasMore ? (
            <Pressable onPress={() => void loadMore()} style={styles.footer}>
              <Text style={styles.action}>Load more notifications</Text>
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 16,
  },
  pushButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  controls: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filter: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F0F3F7',
  },
  activeFilter: {
    backgroundColor: '#05B883',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#516580',
  },
  activeText: {
    color: '#FFFFFF',
  },
  markButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: '#05A978',
  },
  status: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#516580',
  },
  list: {
    paddingHorizontal: 22,
    paddingBottom: 30,
  },
  emptyList: {
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  emptyText: {
    paddingVertical: 24,
    fontSize: 16,
    lineHeight: 24,
    color: '#7A8EAB',
  },
  error: {
    color: '#B42318',
    paddingVertical: 12,
  },
  footer: {
    padding: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    marginLeft: 13,
    marginBottom: 12,
  },
});
