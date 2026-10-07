import type {StockPilotNotification} from '../types/notification';
import {authenticatedRequest} from '../../Auth/infrastructure/authenticatedRequest';
import {requestJson} from '../../Auth/infrastructure/http';

export type NotificationPage = {
  items: StockPilotNotification[];
  nextCursor: string | null;
};

export class HttpNotificationRepository {
  list(_token: string, cursor?: string | null) {
    return authenticatedRequest<NotificationPage>(
      `/api/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
  }

  markRead(_token: string, id: string) {
    return authenticatedRequest<{read: boolean}>(
      `/api/notifications/${encodeURIComponent(id)}/read`,
      {
        method: 'PATCH',
      },
    );
  }

  markAllRead(_token: string) {
    return authenticatedRequest<{
      readAllBefore: string;
    }>('/api/notifications/read-all', {
      method: 'PATCH',
    });
  }

  registerDevice(_token: string, deviceToken: string) {
    return authenticatedRequest('/api/notifications/devices/current', {
      method: 'PUT',
      body: JSON.stringify({
        token: deviceToken,
      }),
    });
  }

  unregisterDevice(token: string, deviceToken: string) {
    // Logout may have already cleared the stored session.
    return requestJson('/api/notifications/devices/current', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        token: deviceToken,
      }),
    });
  }
}

export const notificationRepository = new HttpNotificationRepository();
