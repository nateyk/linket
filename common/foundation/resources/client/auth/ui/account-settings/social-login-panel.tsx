import {User} from '@app/gen/schemas/user';
import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {useAllSocialLoginsDisabled} from '@common/auth/ui/use-all-social-logins-disabled';
import {queryClient} from '@common/http/query-client';
import {SiEnvato, SiFacebook, SiX} from '@icons-pack/react-simple-icons';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {GoogleIcon} from '@ui/icons/social/google';
import {useSettings} from '@ui/settings/use-settings';
import clsx from 'clsx';
import {ReactElement} from 'react';
import {SocialService, useSocialLogin} from '../../requests/use-social-login';
import {AccountSettingsPanel} from './account-settings-panel';

interface PartialUser {
  id: number;
  social_profiles?: User['social_profiles'];
}

export function SocialLoginPanel({user}: {user: User}) {
  if (useAllSocialLoginsDisabled()) {
    return null;
  }

  return (
    <AccountSettingsPanel
      id={AccountSettingsId.SocialLogin}
      title={<Trans message="Manage social login" />}
    >
      <SocialLoginPanelRow
        icon={<SiEnvato className="text-envato" />}
        service="envato"
        user={user}
      />
      <SocialLoginPanelRow
        icon={<GoogleIcon viewBox="0 0 48 48" />}
        service="google"
        user={user}
      />
      <SocialLoginPanelRow
        icon={<SiFacebook className="text-facebook" />}
        service="facebook"
        user={user}
      />
      <SocialLoginPanelRow
        icon={<SiX className="text-twitter" />}
        service="twitter"
        user={user}
      />
      <div className="pt-4 pb-1.5 text-sm text-muted-foreground">
        <Trans message="If you disable social logins, you'll still be able to log in using your email and password." />
      </div>
    </AccountSettingsPanel>
  );
}

interface SocialLoginPanelRowProps {
  service: SocialService;
  user: PartialUser;
  className?: string;
  icon: ReactElement;
}

function SocialLoginPanelRow({
  service,
  user,
  className,
  icon,
}: SocialLoginPanelRowProps) {
  const {social} = useSettings();
  const {connectSocial, disconnectSocial} = useSocialLogin();
  const username = user?.social_profiles?.find(
    s => s.service_name === service,
  )?.username;

  if (!social?.[service]?.enable) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3.5 border-b px-2.5 py-5',
        className,
      )}
    >
      <div className="flex items-center justify-center rounded-card-xs border p-2 [&_svg]:size-4">
        {icon}
      </div>
      <div className="mr-auto overflow-hidden text-ellipsis whitespace-nowrap">
        <div className="overflow-hidden text-sm font-bold text-ellipsis first-letter:capitalize">
          <Trans message=":service account" values={{service}} />
        </div>
        <div className="mt-0.5 text-xs">
          {username || <Trans message="Disabled" />}
        </div>
      </div>
      <Button
        disabled={disconnectSocial.isPending}
        size="sm"
        variant="outline"
        color={username ? 'danger' : 'primary'}
        onClick={async () => {
          if (username) {
            disconnectSocial.mutate(
              {service},
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({queryKey: ['users']});
                  toast.success(
                    <Trans
                      message="Disabled :service account"
                      values={{service}}
                    />,
                  );
                },
              },
            );
          } else {
            const e = await connectSocial(service);
            if (e?.status === 'SUCCESS') {
              queryClient.invalidateQueries({queryKey: ['users']});
              toast.success(
                <Trans message="Enabled :service account" values={{service}} />,
              );
            }
          }
        }}
      >
        {username ? <Trans message="Disable" /> : <Trans message="Enable" />}
      </Button>
    </div>
  );
}
