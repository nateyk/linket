import {UserSession} from '@app/gen/schemas/user-session';
import {
  listUserSessionsOptions,
  logoutOtherSessionsOptions,
} from '@common/auth/ui/account-settings/account-settings-queries';
import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {usePasswordConfirmedAction} from '@common/auth/ui/confirm-password/use-password-confirmed-action';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {ComputerIcon, SmartphoneIcon, TabletIcon} from 'lucide-react';
import {ReactNode} from 'react';
import {AccountSettingsPanel} from './account-settings-panel';

export function SessionsPanel() {
  const query = useSuspenseQuery(listUserSessionsOptions());
  const {withConfirmedPassword, isLoading: confirmingPassword} =
    usePasswordConfirmedAction();
  const logoutOther = useMutation({
    ...logoutOtherSessionsOptions(),
    onError: r => showHttpErrorToast(r),
  });

  const handleLogoutOtherSessions = () => {
    withConfirmedPassword(password => {
      logoutOther.mutate(
        {password},
        {
          onSuccess: () => {
            toast.success(<Trans message="Logged out other sessions." />);
          },
        },
      );
    });
  };

  return (
    <AccountSettingsPanel
      id={AccountSettingsId.Sessions}
      title={<Trans message="Sessions" />}
    >
      <p className="text-sm">
        <Trans message="If necessary, you may log out of all of your other browser sessions across all of your devices. Your recent sessions are listed below. If you feel your account has been compromised, you should also update your password." />
      </p>
      <div className="my-7.5">
        <div className="max-h-100 overflow-y-auto overscroll-contain">
          {query.data.data.map(session => (
            <SessionItem key={session.id} session={session} />
          ))}
        </div>
      </div>
      <Button
        variant="outline"
        color="primary"
        disabled={confirmingPassword || logoutOther.isPending}
        onClick={() => handleLogoutOtherSessions()}
      >
        <Trans message="Logout other sessions" />
      </Button>
    </AccountSettingsPanel>
  );
}

interface SessionItemProps {
  session: UserSession;
}
function SessionItem({session}: SessionItemProps) {
  return (
    <div className="mb-3.5 flex items-start gap-3.5 text-sm">
      <div className="shrink-0 pt-1 text-muted-foreground [&_svg]:size-4">
        <DeviceIcon device={session.device} />
      </div>
      <div className="flex-auto">
        <div>
          <ValueOrUnknown>{session.platform}</ValueOrUnknown> -{' '}
          <ValueOrUnknown>{session.browser}</ValueOrUnknown>
        </div>
        <div className="my-1 text-xs">
          <ValueOrUnknown>{session.city}</ValueOrUnknown>,{' '}
          <ValueOrUnknown>{session.country}</ValueOrUnknown>
        </div>
        <div className="text-xs">
          <IpAddress session={session} /> - <LastActive session={session} />
        </div>
      </div>
    </div>
  );
}

interface DeviceIconProps {
  device: UserSession['device'];
}
function DeviceIcon({device}: DeviceIconProps) {
  switch (device) {
    case 'mobile':
      return <SmartphoneIcon />;
    case 'tablet':
      return <TabletIcon />;
    default:
      return <ComputerIcon />;
  }
}

interface LastActiveProps {
  session: UserSession;
}
function LastActive({session}: LastActiveProps) {
  if (session.is_current_device) {
    return (
      <span className="text-positive">
        <Trans message="This device" />
      </span>
    );
  }

  return <FormattedRelativeTime date={session.updated_at} />;
}

interface IpAddressProps {
  session: UserSession;
}
function IpAddress({session}: IpAddressProps) {
  if (session.ip_address) {
    return <span>{session.ip_address}</span>;
  }
  return <Trans message="Unknown IP" />;
}

interface ValueOrUnknownProps {
  children: ReactNode;
}
function ValueOrUnknown({children}: ValueOrUnknownProps) {
  return children ? <>{children}</> : <Trans message="Unknown" />;
}
