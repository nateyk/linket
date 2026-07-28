import {
  listNotifications,
  listNotificationSubscriptions,
  markNotificationsAsRead,
  updateNotificationSubscriptions,
} from '@app/gen/notifications';
import {ListNotificationsParams} from '@app/gen/schemas/list-notifications-params';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {
  getBootstrapData,
  mergeBootstrapData,
} from '@ui/bootstrap-data/bootstrap-data-store';
import {FirstParam} from '@ui/utils/ts/extract-params';

export const notificationsBaseKey = ['notifications'];

export const listNotificationsOptions = (params?: ListNotificationsParams) => {
  return queryOptions({
    queryKey: [...notificationsBaseKey, params],
    queryFn: () =>
      listNotifications({
        ...params,
      }),
  });
};

export const markNotificationsAsReadOptions = () => {
  return mutationOptions({
    mutationFn: (payload: FirstParam<typeof markNotificationsAsRead>) =>
      markNotificationsAsRead(payload),
    onSuccess: response => {
      queryClient.invalidateQueries({queryKey: notificationsBaseKey});
      if (response.unreadCount === 0) {
        mergeBootstrapData({
          user: {...getBootstrapData().user!, unread_notifications_count: 0},
        });
      }
    },
    onError: err => showHttpErrorToast(err),
  });
};

export const listNotificationSubscriptionsOptions = () => {
  return queryOptions({
    queryKey: ['notification-subscriptions'],
    queryFn: () => listNotificationSubscriptions(),
    staleTime: Infinity,
  });
};

export const updateNotificationSubscriptionsOptions = () => {
  return mutationOptions({
    mutationFn: (payload: FirstParam<typeof updateNotificationSubscriptions>) =>
      updateNotificationSubscriptions(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notification-subscriptions']});
    },
    onError: err => showHttpErrorToast(err),
  });
};
