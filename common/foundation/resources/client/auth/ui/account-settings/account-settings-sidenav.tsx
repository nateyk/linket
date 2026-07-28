import {useAllSocialLoginsDisabled} from '@common/auth/ui/use-all-social-logins-disabled';
import {useAuth} from '@common/auth/use-auth';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {
  CodeIcon,
  CreditCardIcon,
  FingerprintPatternIcon,
  GlobeIcon,
  LockIcon,
  LogInIcon,
  MonitorSmartphoneIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react';
import {ReactElement, ReactNode} from 'react';

export enum AccountSettingsId {
  AccountDetails = 'account-details',
  SocialLogin = 'social-login',
  Password = 'password',
  TwoFactor = 'two-factor',
  LocationAndLanguage = 'location-and-language',
  Developers = 'developers',
  DeleteAccount = 'delete-account',
  Sessions = 'sessions',
}

interface Props {
  items: ReactNode;
}
export function AccountSettingsSidenav({items}: Props) {
  const p = AccountSettingsId;

  const {hasPermission, isSubscribed} = useAuth();
  const settings = useSettings();

  const allSocialsDisabled = useAllSocialLoginsDisabled();

  const baseUrl = `${settings.base_url}/account-settings`;

  return (
    <aside className="sticky top-18.5 hidden shrink-0 flex-col gap-2 lg:flex">
      {items}

      <AccountSettingsSidenavItem
        icon={<UserIcon />}
        to={`${baseUrl}#${p.AccountDetails}`}
      >
        <Trans message="Account details" />
      </AccountSettingsSidenavItem>
      {isSubscribed ? (
        <AccountSettingsSidenavItem icon={<CreditCardIcon />} to="/billing">
          <Trans message="Billing" />
        </AccountSettingsSidenavItem>
      ) : null}
      {!allSocialsDisabled && (
        <AccountSettingsSidenavItem
          icon={<LogInIcon />}
          to={`${baseUrl}#${p.SocialLogin}`}
        >
          <Trans message="Social login" />
        </AccountSettingsSidenavItem>
      )}
      <AccountSettingsSidenavItem
        icon={<LockIcon />}
        to={`${baseUrl}#${p.Password}`}
      >
        <Trans message="Password" />
      </AccountSettingsSidenavItem>
      <AccountSettingsSidenavItem
        icon={<FingerprintPatternIcon />}
        to={`${baseUrl}#${p.TwoFactor}`}
      >
        <Trans message="Two factor authentication" />
      </AccountSettingsSidenavItem>
      <AccountSettingsSidenavItem
        icon={<MonitorSmartphoneIcon />}
        to={`${baseUrl}#${p.Sessions}`}
      >
        <Trans message="Active sessions" />
      </AccountSettingsSidenavItem>
      <AccountSettingsSidenavItem
        icon={<GlobeIcon />}
        to={`${baseUrl}#${p.LocationAndLanguage}`}
      >
        <Trans message="Location and language" />
      </AccountSettingsSidenavItem>
      {settings.api?.integrated && hasPermission('api.access') ? (
        <AccountSettingsSidenavItem
          icon={<CodeIcon />}
          to={`${baseUrl}#${p.Developers}`}
        >
          <Trans message="Developers" />
        </AccountSettingsSidenavItem>
      ) : null}
      <AccountSettingsSidenavItem
        icon={<Trash2Icon />}
        to={`${baseUrl}#${p.DeleteAccount}`}
      >
        <Trans message="Delete account" />
      </AccountSettingsSidenavItem>
    </aside>
  );
}

interface ItemProps {
  children: ReactNode;
  icon: ReactElement;
  to: string;
}
export function AccountSettingsSidenavItem({children, icon, to}: ItemProps) {
  return (
    <LinkButton variant="ghost" className="justify-start" to={to}>
      {icon}
      {children}
    </LinkButton>
  );
}
