import {
  listNotificationsOptions,
  markNotificationsAsReadOptions,
} from '@common/notifications/notifications-queries';
import {Footer} from '@common/ui/footer/footer';
import {Button, LinkButton} from '@shadcn/button/button';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {CheckCheckIcon, SettingsIcon} from 'lucide-react';
import {Fragment} from 'react';
import {useAuth} from '../auth/use-auth';
import {StaticPageTitle} from '../seo/static-page-title';
import {Navbar} from '../ui/navigation/navbar/navbar';
import {NotificationEmptyState} from './notification-empty-state';
import {NotificationList} from './notification-list';

export function Component() {
  const {user} = useAuth();
  const query = useSuspenseQuery(listNotificationsOptions({perPage: 30}));
  const notifications = query.data?.data || [];
  const hasUnread = !!user?.unread_notifications_count;
  const markAsRead = useMutation(markNotificationsAsReadOptions());
  const {notif} = useSettings();

  const handleMarkAsRead = () => {
    if (!notifications.length) return;
    markAsRead.mutate({
      markAllAsUnread: true,
    });
  };

  const markAsReadButton = (
    <Button
      variant="outline"
      color="primary"
      size="sm"
      onClick={handleMarkAsRead}
      disabled={markAsRead.isPending}
      className="ml-auto"
    >
      <CheckCheckIcon />
      <Trans message="Mark all as read" />
    </Button>
  );

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="Notifications" />
      </StaticPageTitle>

      <Navbar.Root className="sticky top-0 z-10 border-b bg-background">
        <Navbar.Logo />
        <Navbar.Menu position="notifications-page" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <div className="mx-auto min-h-250 max-w-6xl p-4 md:p-6">
        <div className="mb-7.5 flex items-center gap-6">
          <h1 className="text-3xl">
            <Trans message="Notifications" />
          </h1>
          {hasUnread && markAsReadButton}
          {notif.subs.integrated && (
            <LinkButton
              size="icon"
              className="ml-auto text-muted-foreground"
              to="/notifications/settings"
              target="_blank"
            >
              <SettingsIcon />
            </LinkButton>
          )}
        </div>
        {notifications.length ? (
          <NotificationList
            className="overflow-hidden rounded-card border"
            notifications={notifications}
          />
        ) : (
          <NotificationEmptyState />
        )}
      </div>
      <Footer className="mx-auto mt-12 max-w-6xl p-4 md:p-6" />
    </Fragment>
  );
}
