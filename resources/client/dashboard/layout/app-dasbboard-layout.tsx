import {MobileBottomNavbar} from '@app/dashboard/layout/mobile-bottom-navbar';
import {UpgradeButton} from '@app/dashboard/layout/sidenav/upgrade-button';
import {GlobalSearchInput} from '@app/dashboard/search/global-search-input';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {WorkspaceSelector} from '@common/workspace/workspace-selector';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {use, useEffect} from 'react';
import {Outlet, useLocation} from 'react-router';
import {AppDashboardSidebar} from './sidenav/app-dashboard-sidebar';

export function Component() {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const isCompactLayout = useMediaQuery('(max-width: 1024px)');
  const {pathname, search} = useLocation();
  // Editor routes get the labelled main landmark (A-10); every other
  // dashboard page keeps an unlabelled main.
  const isStoreEditor = /^\/(dashboard|admin)\/stores\/[^/]+/.test(pathname);

  // navigate to dashboard root when active workspace changes — storefront-first: never land creator on hidden /links
  useEffect(
    () =>
      useWorkspaceStore.subscribe(
        state => state.activeWorkspace,
        () => {
          navigate(`/dashboard`);
        },
      ),
    [navigate],
  );

  return (
    <DashboardLayout.Root name="linket-dashboard">
      <a
        // Path-anchored: the SPA ships a <base href="/">, so a bare
        // "#main-content" would resolve to the site root (A-10).
        href={`${pathname}${search}#main-content`}
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-card focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid"
      >
        <Trans message="Skip to main content" />
      </a>
      {!isCompactLayout ? <AppNavbar /> : null}
      <DashboardLayout.Content>
        <AppDashboardSidebar />
        <main
          id="main-content"
          className="contents"
          aria-label={
            isStoreEditor ? trans(message('Store editor')) : undefined
          }
        >
          <Outlet />
        </main>
      </DashboardLayout.Content>
      {isCompactLayout ? <MobileBottomNavbar /> : null}
    </DashboardLayout.Root>
  );
}

function AppNavbar() {
  const {billing} = useSettings();
  const {leftSidebar} = use(DashboardLayoutContext);

  return (
    <DashboardLayout.Navbar>
      <div
        className={cn(
          'flex items-center',
          leftSidebar.status === 'expanded' && 'min-w-57',
        )}
      >
        <Navbar.Logo />
      </div>
      <GlobalSearchInput />
      <Navbar.Content>
        {leftSidebar.status === 'collapsed' && <WorkspaceSelector />}
      </Navbar.Content>
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
