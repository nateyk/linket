import {BroadcastNotification} from '@common/notifications/database-notification';
import {notificationsBaseKey} from '@common/notifications/notifications-queries';
import {queryClient} from '@common/http/query-client';
import {useAuth} from '@common/auth/use-auth';
import {bootEcho} from '@app/dashboard/websockets/boot-echo';
import {toast} from '@shadcn/toast/toast';
import {
  getBootstrapData,
  mergeBootstrapData,
} from '@ui/bootstrap-data/bootstrap-data-store';
import {useSettings} from '@ui/settings/use-settings';
import {useEffect} from 'react';

/**
 * Listen for Laravel database-notification broadcasts on App.User.{id}.
 * No-ops when notifications or websockets are disabled, or when the
 * broadcasting driver is log/null.
 */
export function useUserNotificationListener() {
  const {user, isLoggedIn} = useAuth();
  const {notifications, websockets, broadcasting} = useSettings();

  useEffect(() => {
    if (
      !isLoggedIn ||
      !user?.id ||
      !notifications?.integrated ||
      !websockets?.integrated ||
      !broadcasting?.driver ||
      broadcasting.driver === 'log' ||
      broadcasting.driver === 'null'
    ) {
      return;
    }

    const channelName = `App.User.${user.id}`;
    let cancelled = false;

    bootEcho().then(echo => {
      if (cancelled || !echo) {
        return;
      }

      echo.private(channelName).notification((payload: BroadcastNotification) => {
        queryClient.invalidateQueries({queryKey: notificationsBaseKey});

        const current = getBootstrapData().user;
        if (current) {
          mergeBootstrapData({
            user: {
              ...current,
              unread_notifications_count:
                (current.unread_notifications_count ?? 0) + 1,
            },
          });
        }

        const preview = payload.lines?.[0]?.content
          ?.replace(/<[^>]+>/g, '')
          .trim();
        if (preview) {
          toast(preview);
        }
      });
    });

    return () => {
      cancelled = true;
      bootEcho().then(echo => {
        echo?.leave(channelName);
      });
    };
  }, [
    isLoggedIn,
    user?.id,
    notifications?.integrated,
    websockets?.integrated,
    broadcasting?.driver,
  ]);
}
