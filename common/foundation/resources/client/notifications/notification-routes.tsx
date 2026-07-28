import {queryClient} from '@common/http/query-client';
import {
  listNotificationsOptions,
  listNotificationSubscriptionsOptions,
} from '@common/notifications/notifications-queries';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {replace, RouteObject} from 'react-router';
import {authGuard} from '../auth/guards/auth-route';

export const notificationRoutes: RouteObject[] = [
  {
    path: '/notifications',
    loader: async () => {
      const redirect = authGuard();
      if (redirect) return redirect;

      await queryClient.ensureQueryData(
        listNotificationsOptions({perPage: 30}),
      );
    },
    lazy: () => import('@common/notifications/notifications-page'),
  },
  {
    path: '/notifications/settings',
    loader: async () => {
      const redirect = authGuard();
      if (redirect) return redirect;

      if (!getBootstrapData()?.settings.notif.subs.integrated) {
        return replace('/');
      }

      await queryClient.ensureQueryData(listNotificationSubscriptionsOptions());
    },
    lazy: () => import('@common/notifications/notification-settings-page'),
  },
];
