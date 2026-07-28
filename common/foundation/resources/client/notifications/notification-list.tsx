import {Notification} from '@app/gen/schemas/notification';
import {NotificationData} from '@app/gen/schemas/notification-data';
import {SiteConfigContext} from '@common/core/settings/site-config-context';
import {NotificationLine} from '@common/notifications/notification-line';
import {markNotificationsAsReadOptions} from '@common/notifications/notifications-queries';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Button, LinkButton} from '@shadcn/button/button';
import {useMutation} from '@tanstack/react-query';
import {MixedImage} from '@ui/images/mixed-image';
import {useSettings} from '@ui/settings/use-settings';
import {isAbsoluteUrl} from '@ui/utils/urls/is-absolute-url';
import clsx from 'clsx';
import {DownloadIcon, UserRoundPlus, UsersRound} from 'lucide-react';
import React, {ComponentProps, JSXElementConstructor, use} from 'react';

const iconMap = {
  'group-add': UserRoundPlus,
  people: UsersRound,
  'export-csv': DownloadIcon,
} as Record<string, JSXElementConstructor<ComponentProps<'svg'>>>;

interface NotificationListProps {
  notifications: Notification[];
  className?: string;
}
export function NotificationList({
  notifications,
  className,
}: NotificationListProps) {
  const {notifications: config} = use(SiteConfigContext);

  return (
    <div className={className}>
      {notifications.map((notification, index) => {
        const isLast = notifications.length - 1 === index;
        const Renderer =
          config?.renderMap?.[notification.type] || NotificationListItem;
        return (
          <Renderer
            key={notification.id}
            notification={notification}
            isLast={isLast}
          />
        );
      })}
    </div>
  );
}

export interface NotificationListItemProps {
  notification: Notification;
  onActionButtonClick?: ButtonActionsProps['onActionClick'];
  lineIconRenderer?: JSXElementConstructor<{icon: string}>;
  isLast: boolean;
}
export function NotificationListItem({
  notification,
  onActionButtonClick,
  lineIconRenderer,
  isLast,
}: NotificationListItemProps) {
  const markAsRead = useMutation(markNotificationsAsReadOptions());
  const navigate = useNavigate();
  const mainAction = notification.data.mainAction;

  const showUnreadIndicator = !notification.data.image && !notification.read_at;

  return (
    <div
      onClick={() => {
        if (!markAsRead.isPending && !notification.read_at) {
          markAsRead.mutate({ids: [notification.id]});
        }
        if (mainAction?.action) {
          if (isAbsoluteUrl(mainAction.action)) {
            window.open(mainAction.action, '_blank')?.focus();
          } else {
            navigate(mainAction.action);
          }
        }
      }}
      className={clsx(
        'relative flex items-start gap-3.5 bg-muted px-8 py-5',
        !isLast && 'border-b',
        mainAction?.action && 'cursor-pointer',
        !notification.read_at
          ? 'bg-background hover:bg-primary/10'
          : 'hover:bg-muted/50',
      )}
      title={mainAction?.label ? mainAction.label : undefined}
    >
      {showUnreadIndicator && (
        <div className="absolute top-6.5 left-4 size-2 shrink-0 rounded-full bg-primary shadow-sm" />
      )}
      {notification.data.image && (
        <MixedImage
          className="size-5 shrink-0 text-muted-foreground"
          src={iconMap[notification.data.image] || notification.data.image}
        />
      )}
      <div className="min-w-0">
        {notification.data.lines.map((line, index) => (
          <NotificationLine
            iconRenderer={lineIconRenderer}
            notification={notification}
            line={line}
            index={index}
            key={index}
          />
        ))}
        <ButtonActions
          onActionClick={onActionButtonClick}
          notification={notification}
        />
      </div>
    </div>
  );
}

interface ButtonActionsProps {
  notification: Notification;
  onActionClick?: (
    e: React.MouseEvent,
    action: NonNullable<NotificationData['buttonActions']>[number],
  ) => void;
}
function ButtonActions({notification, onActionClick}: ButtonActionsProps) {
  const {base_url} = useSettings();
  if (!notification.data.buttonActions) return null;

  // if there's no action handler provided, assume action is internal url and render a link
  return (
    <div className="mt-3 flex items-center gap-3">
      {notification.data.buttonActions.map((action, index) => {
        const variant = index === 0 ? 'default' : 'outline';
        const color = index === 0 ? 'primary' : undefined;

        if (!onActionClick) {
          return (
            <LinkButton
              key={index}
              size="xs"
              variant={variant}
              color={color}
              to={action.action.replace(base_url, '')}
            >
              {action.label}
            </LinkButton>
          );
        }

        return (
          <Button
            key={index}
            size="xs"
            variant={variant}
            color={color}
            onClick={e => {
              onActionClick(e, action);
            }}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
