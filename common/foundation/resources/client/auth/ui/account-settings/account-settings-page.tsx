import {User} from '@app/gen/schemas/user';
import {AuthRoute} from '@common/auth/guards/auth-route';
import {getAccountSettingsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {AccountSettingsSidenav} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {SessionsPanel} from '@common/auth/ui/account-settings/sessions-panel';
import {TwoFactorPanel} from '@common/auth/ui/account-settings/two-factor-panel';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ReactNode} from 'react';
import {AccessTokenPanel} from './access-token-panel/access-token-panel';
import {BasicInfoPanel} from './basic-info-panel';
import {ChangePasswordPanel} from './change-password-panel';
import {DangerZonePanel} from './danger-zone-panel/danger-zone-panel';
import {LocalizationPanel} from './localization-panel';
import {SocialLoginPanel} from './social-login-panel';

interface Props {
  panels?: (user: User) => ReactNode;
  sidenavItems?: ReactNode;
}
export function AccountSettingsPage({panels, sidenavItems}: Props) {
  const query = useSuspenseQuery(getAccountSettingsOptions());
  return (
    <AuthRoute>
      <div className="min-h-screen bg-background">
        <StaticPageTitle>
          <Trans message="Account Settings" />
        </StaticPageTitle>

        <Navbar.Root className="border-b">
          <Navbar.Logo />
          <Navbar.Menu position="billing-page" />
          <Navbar.Content className="ml-auto">
            <Navbar.AuthContent />
          </Navbar.Content>
        </Navbar.Root>

        <div>
          <div className="mx-auto max-w-6xl px-6 py-6">
            <h1 className="text-3xl font-semibold">
              <Trans message="Account settings" />
            </h1>
            <div className="mb-10 text-base text-muted-foreground">
              <Trans message="View and update your account details, profile and more." />
            </div>
            <div className="flex items-start gap-6">
              <AccountSettingsSidenav items={sidenavItems} />
              <main className="flex-auto">
                {panels ? panels(query.data.data) : null}
                <BasicInfoPanel user={query.data.data} />
                <SocialLoginPanel user={query.data.data} />
                <ChangePasswordPanel />
                <TwoFactorPanel user={query.data.data} />
                <SessionsPanel />
                <LocalizationPanel user={query.data.data} />
                <AccessTokenPanel user={query.data.data} />
                <DangerZonePanel />
              </main>
            </div>
          </div>
        </div>
      </div>
    </AuthRoute>
  );
}
