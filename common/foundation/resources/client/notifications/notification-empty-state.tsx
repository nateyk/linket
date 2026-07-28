import {NotificationsDialogContext} from '@common/notifications/notifications-dialog';
import {LinkButton} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {BellIcon} from 'lucide-react';
import {use} from 'react';

type Props = {
  settingsLink?: string | null;
  className?: string;
};
export function NotificationEmptyState({settingsLink, className}: Props) {
  const {notif} = useSettings();
  const ctx = use(NotificationsDialogContext);
  return (
    <Empty.Root className={className}>
      <Empty.Header>
        <Empty.Media variant="icon">
          <BellIcon />
        </Empty.Media>
        <Empty.Title>
          <Trans message="Hang tight!" />
        </Empty.Title>
        <Empty.Description>
          <Trans message="Notifications will start showing up here soon." />
        </Empty.Description>
      </Empty.Header>
      {notif.subs.integrated && (
        <Empty.Content>
          <LinkButton
            variant="outline"
            to={settingsLink || '/notifications/settings'}
            size="xs"
            color="primary"
            onClick={ctx ? () => ctx.setOpen(true) : undefined}
          >
            <Trans message="Notification settings" />
          </LinkButton>
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
