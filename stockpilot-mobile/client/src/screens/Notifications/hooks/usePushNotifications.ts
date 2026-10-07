import {useCallback, useEffect, useRef} from 'react';

import {Alert, AppState, DeviceEventEmitter} from 'react-native';

import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

import {notificationRepository} from '../infrastructure/HttpNotificationRepository';

import {registerPush, setPushSession} from '../infrastructure/pushSession';

import {openNotification} from '../notificationNavigation';

export const NOTIFICATIONS_CHANGED = 'stockpilot:notifications-changed';

export function usePushNotifications(token: string | null) {
  const currentToken = useRef(token);

  currentToken.current = token;

  const pending = useRef<FirebaseMessagingTypes.RemoteMessage | null>(null);

  const handled = useRef(new Set<string>());

  const handleOpen = useCallback(async (message: FirebaseMessagingTypes.RemoteMessage) => {
    const auth = currentToken.current;

    if (!auth) {
      return;
    }

    const id = message.data?.notificationId;

    if (typeof id !== 'string') {
      return;
    }

    const key = message.messageId || id;

    if (handled.current.has(key)) {
      return;
    }

    const articleId =
      typeof message.data?.articleId === 'string' ? message.data.articleId : undefined;

    if (!openNotification(articleId)) {
      pending.current = message;
      return;
    }

    handled.current.add(key);
    pending.current = null;

    try {
      await notificationRepository.markRead(auth, id);

      if (currentToken.current === auth) {
        DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED);
      }
    } catch {
      if (currentToken.current === auth) {
        Alert.alert(
          'Notification opened',
          'Could not save read status. You can mark it read from Notifications when connected.',
        );
      }
    }
  }, []);

  const onReady = useCallback(() => {
    if (pending.current) {
      void handleOpen(pending.current);
    }
  }, [handleOpen]);

  useEffect(() => {
    setPushSession(token);

    pending.current = null;
    handled.current.clear();

    if (!token) {
      return;
    }

    let active = true;

    const messaging = getMessaging();

    const register = () =>
      registerPush(token).catch(() => {
        if (active) {
          DeviceEventEmitter.emit('stockpilot:push-error');
        }
      });

    void register();

    const offRefresh = onTokenRefresh(messaging, (value) => {
      void registerPush(token, false, value).catch(() => {
        DeviceEventEmitter.emit('stockpilot:push-error');
      });
    });

    const offMessage = onMessage(messaging, async (message) => {
      if (!active) {
        return;
      }

      DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED);

      Alert.alert(
        message.notification?.title || 'Stock Pilot',

        message.notification?.body || 'New notification',

        [
          {
            text: 'Later',
            style: 'cancel',
          },
          {
            text: 'Open',

            onPress: () => {
              if (active) {
                void handleOpen(message);
              }
            },
          },
        ],
      );
    });

    const offOpen = onNotificationOpenedApp(messaging, (message) => {
      if (active) {
        void handleOpen(message);
      }
    });

    void getInitialNotification(messaging)
      .then((message) => {
        if (active && message) {
          void handleOpen(message);
        }
      })
      .catch(() => undefined);

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void register();
      }
    });

    return () => {
      active = false;

      setPushSession(null);

      offRefresh();
      offMessage();
      offOpen();

      appState.remove();
    };
  }, [token, handleOpen]);

  return onReady;
}
