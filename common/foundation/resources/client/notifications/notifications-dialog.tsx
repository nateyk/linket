import {useAuth} from '@common/auth/use-auth';
import {
  listNotificationsOptions,
  markNotificationsAsReadOptions,
} from '@common/notifications/notifications-queries';
import {Button, LinkButton} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {Spinner} from '@shadcn/spinner/spinner';
import {useMutation, useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {BellIcon, CheckCheckIcon, SettingsIcon} from 'lucide-react';
import {
  ComponentProps,
  createContext,
  ReactElement,
  useMemo,
  useState,
} from 'react';
import {NotificationEmptyState} from './notification-empty-state';
import {NotificationList} from './notification-list';

type Props = {
  className?: string;
  children?: ReactElement;
};

export const NotificationsDialogContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

export function NotificationsDialog({className, children}: Props) {
  const [open, setOpen] = useState(false);
  const contextValue = useMemo(() => ({open, setOpen}), [open, setOpen]);

  const trigger = children ?? (
    <Popover.Trigger
      aria-label="Notifications"
      className={cn('relative', className)}
      render={<Button variant="ghost" size="icon" />}
    >
      <BellIcon className="size-5" />
      <NotificationsTriggerBadge />
    </Popover.Trigger>
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {trigger}
      <Popover.Portal>
        <NotificationsDialogContext.Provider value={contextValue}>
          <NotificationsPopoverContent />
        </NotificationsDialogContext.Provider>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function NotificationsTriggerBadge({className}: {className?: string}) {
  const {user} = useAuth();
  const hasUnread = !!user?.unread_notifications_count;
  if (!hasUnread) return null;
  return (
    <div
      className={cn(
        'ring-bg-background absolute inset-e-0 top-0 z-10 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-1 text-xs font-semibold text-primary-foreground bg-blend-color ring-2 select-none max-md:hidden',
        className,
      )}
    >
      {user?.unread_notifications_count}
    </div>
  );
}

interface NotificationsDialogProps extends Omit<
  ComponentProps<typeof Popover.Content>,
  'children'
> {
  settingsLink?: string | null;
}

export function NotificationsPopoverContent({
  settingsLink,
  className,
  ...contentProps
}: NotificationsDialogProps) {
  const {user} = useAuth();
  const {notif} = useSettings();
  const query = useQuery(listNotificationsOptions());
  const markAsRead = useMutation(markNotificationsAsReadOptions());
  const hasUnread = !!user?.unread_notifications_count;

  const handleMarkAsRead = () => {
    if (!query.data?.data) return;
    markAsRead.mutate({
      markAllAsUnread: true,
    });
  };

  // "null" means that settings button should be hidden
  if (!settingsLink && settingsLink !== null) {
    settingsLink = '/notifications/settings';
  }

  return (
    <Popover.Content
      className={cn('w-md max-w-[calc(100vw-1rem)] gap-0 p-0', className)}
      {...contentProps}
    >
      <Popover.Header className="flex-row items-center border-b px-5 py-4">
        <Popover.Title>
          <Trans message="Notifications" />
        </Popover.Title>
        <div className="ml-auto flex items-center gap-1.5">
          {!hasUnread && settingsLink && notif.subs.integrated && (
            <LinkButton
              aria-label="Notification settings"
              variant="ghost"
              size="icon-sm"
              to={settingsLink}
              target="_blank"
            >
              <SettingsIcon />
            </LinkButton>
          )}
          {hasUnread && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleMarkAsRead}
              disabled={markAsRead.isPending}
              className="max-md:hidden"
            >
              <CheckCheckIcon />
              <Trans message="Mark all as read" />
            </Button>
          )}
        </div>
      </Popover.Header>
      <div className="compact-scrollbar max-h-170 min-h-41 overflow-y-auto overscroll-contain">
        <NotificationsList settingsLink={settingsLink} />
      </div>
    </Popover.Content>
  );
}

function NotificationsList({settingsLink}: {settingsLink?: string | null}) {
  const {data, isLoading} = useQuery(listNotificationsOptions());
  if (isLoading) {
    return (
      <div className="flex h-41 items-center justify-center">
        <Spinner aria-label="Loading notifications..." className="size-5" />
      </div>
    );
  }
  if (!data?.data.length) {
    return (
      <NotificationEmptyState
        settingsLink={settingsLink}
        className="px-0 py-6"
      />
    );
  }
  return (
    <div>
      <NotificationList notifications={data.data} />
    </div>
  );
}
