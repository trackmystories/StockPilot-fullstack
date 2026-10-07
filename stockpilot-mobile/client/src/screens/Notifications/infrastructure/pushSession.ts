import {PermissionsAndroid, Platform} from 'react-native';

import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from '@react-native-firebase/messaging';

import {notificationRepository} from './HttpNotificationRepository';

let session: string | null = null;

let registered: {
  session: string;
  token: string;
} | null = null;

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);

  queue = result.catch(() => undefined);

  return result;
}

export function setPushSession(token: string | null) {
  session = token;
}

export async function registerPush(token: string, askPermission = false, refreshedToken?: string) {
  return enqueue(async () => {
    if (session !== token || Platform.OS === 'web') {
      return false;
    }

    let allowed = true;

    if (Platform.OS === 'ios') {
      const messaging = getMessaging();

      const status = askPermission
        ? await requestPermission(messaging)
        : await hasPermission(messaging);

      allowed =
        status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
    } else if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

      allowed = askPermission
        ? (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED
        : await PermissionsAndroid.check(permission);
    }

    if (session !== token) {
      return false;
    }

    if (!allowed) {
      if (registered?.session === token) {
        await notificationRepository.unregisterDevice(token, registered.token);

        registered = null;
      }

      return false;
    }

    const deviceToken = refreshedToken || (await getToken(getMessaging()));

    if (session !== token) {
      return false;
    }

    if (registered && registered.token !== deviceToken) {
      await notificationRepository.unregisterDevice(registered.session, registered.token);
    }

    await notificationRepository.registerDevice(token, deviceToken);

    registered = {
      session: token,
      token: deviceToken,
    };

    return true;
  });
}

export async function stopPushSession(token: string | null) {
  session = null;

  return enqueue(async () => {
    if (Platform.OS === 'web') {
      return;
    }

    if (token && registered) {
      await notificationRepository.unregisterDevice(token, registered.token).catch(() => undefined);
    }

    try {
      await deleteToken(getMessaging());

      registered = null;
    } catch (error) {
      // Restore the session if logout fails.
      if (session === null) {
        session = token;
      }

      throw error;
    }
  });
}
