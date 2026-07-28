import {MobileBottomNavbar} from '@app/dashboard/layout/mobile-bottom-navbar';
import {UpgradeButton} from '@app/dashboard/layout/sidenav/upgrade-button';
import {GlobalSearchInput} from '@app/dashboard/search/global-search-input';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {WorkspaceSelector} from '@common/workspace/workspace-selector';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {use, useEffect} from 'react';
import {Outlet} from 'react-router';
import {AppDashboardSidebar} from './sidenav/app-dashboard-sidebar';

export function Component() {
  const navigate = useNavigate();
  const isCompactLayout = useMediaQuery('(max-width: 1024px)');

  // navigate to dashboard root when active workspace changes
  useEffect(
    () =>
      useWorkspaceStore.subscribe(
        state => state.activeWorkspace,
        () => {
          navigate(`/dashboard/links`);
        },
      ),
    [navigate],
  );

  return (
    <DashboardLayout.Root name="belink-dashboard">
      {!isCompactLayout ? <AppNavbar /> : null}
      <DashboardLayout.Content>
        <AppDashboardSidebar />
        <Outlet />
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
