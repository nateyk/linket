import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {UpgradeButton} from '@app/dashboard/layout/sidenav/upgrade-button';
import {getAccountSettingsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {BasicInfoPanel} from '@common/auth/ui/account-settings/basic-info-panel';
import {ChangePasswordPanel} from '@common/auth/ui/account-settings/change-password-panel';
import {DangerZonePanel} from '@common/auth/ui/account-settings/danger-zone-panel/danger-zone-panel';
import {LocalizationPanel} from '@common/auth/ui/account-settings/localization-panel';
import {SessionsPanel} from '@common/auth/ui/account-settings/sessions-panel';
import {SocialLoginPanel} from '@common/auth/ui/account-settings/social-login-panel';
import {TwoFactorPanel} from '@common/auth/ui/account-settings/two-factor-panel';
import {ConfirmPasswordDialogProvider} from '@common/auth/ui/confirm-password/confirm-password-dialog';
import {useAuth} from '@common/auth/use-auth';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {
  ChevronLeftIcon,
  KeyIcon,
  LockIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
  WebhookIcon,
} from 'lucide-react';
import {use} from 'react';
import {Link, NavLink, Outlet} from 'react-router';

export function Component() {
  const isCompactLayout = useMediaQuery('(max-width: 1024px)');
  const query = useSuspenseQuery(getAccountSettingsOptions());
  return (
    <ConfirmPasswordDialogProvider>
      <DashboardLayout.Root name="belink-accunt-settings">
        {!isCompactLayout ? <AppNavbar /> : null}
        <DashboardLayout.Content>
          <AccountSettingsSidebar />
          <Outlet context={query.data.data} />
        </DashboardLayout.Content>
      </DashboardLayout.Root>
    </ConfirmPasswordDialogProvider>
  );
}

function AppNavbar() {
  const {billing} = useSettings();
  const {leftSidebar} = use(DashboardLayoutContext);

  return (
    <DashboardLayout.Navbar className="h-11.5">
      <Navbar.Logo />
      <Navbar.Content className="ml-auto">
        {leftSidebar.status === 'collapsed' && billing?.enable && (
          <UpgradeButton variant="outline" color="primary" />
        )}
        <Navbar.Menu position="dashboard-navbar" />
        <Navbar.AuthContent />
      </Navbar.Content>
    </DashboardLayout.Navbar>
  );
}

export function GeneralSettingsPanel() {
  const query = useSuspenseQuery(getAccountSettingsOptions());
  return (
    <AccountSettingsPageLayout title={<Trans message="General" />}>
      <BasicInfoPanel user={query.data.data} />
      <SocialLoginPanel user={query.data.data} />
      <LocalizationPanel user={query.data.data} />
      <DangerZonePanel />
    </AccountSettingsPageLayout>
  );
}

export function SecuritySettingsPanel() {
  const query = useSuspenseQuery(getAccountSettingsOptions());
  return (
    <AccountSettingsPageLayout title={<Trans message="Security" />}>
      <ChangePasswordPanel />
      <TwoFactorPanel user={query.data.data} />
      <SessionsPanel />
    </AccountSettingsPageLayout>
  );
}

function AccountSettingsSidebar() {
  const {isMobileMode} = use(DashboardLayoutContext);
  const {hasPermission} = useAuth();
  const {billing} = useSettings();

  return (
    <Sidebar.Root
      collapsible="icon"
      width="w-54"
      className="data-[variant=floating]:bg-background/60 dark:data-[variant=floating]:bg-card/60"
    >
      <Sidebar.Header>
        {isMobileMode ? (
          <Sidebar.Item>
            <Logo color="auto" className="max-w-40" />
          </Sidebar.Item>
        ) : null}
        <Sidebar.MenuButton
          render={<Link to="/dashboard" />}
          icon={<ChevronLeftIcon />}
          className="text-base font-semibold"
        >
          <Trans message="Settings" />
        </Sidebar.MenuButton>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <Trans message="Account" />
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  render={<NavLink to="/account-settings/general" />}
                  icon={<SettingsIcon />}
                >
                  <Trans message="General" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  render={<NavLink to="/account-settings/security" />}
                  icon={<LockIcon />}
                >
                  <Trans message="Security" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  render={<NavLink to="/account-settings/workspaces" />}
                  icon={<UsersIcon />}
                >
                  <Trans message="Workspaces" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              {billing?.enable && (
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    render={<NavLink to="/account-settings/billing" />}
                    icon={<StoreIcon />}
                  >
                    <Trans message="Billing" />
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              )}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>

        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <Trans message="Developer" />
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {hasPermission('api.access') && (
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    render={<NavLink to="/account-settings/api-keys" />}
                    icon={<KeyIcon />}
                  >
                    <Trans message="API keys" />
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              )}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  render={<NavLink to="/account-settings/webhooks" />}
                  icon={<WebhookIcon />}
                >
                  <Trans message="Webhooks" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>
    </Sidebar.Root>
  );
}
