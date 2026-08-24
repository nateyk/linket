import {CompactUsageTrigger} from '@app/dashboard/layout/sidenav/compact-usage-trigger';
import {dashboardSidebarIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {WorkspaceSelector} from '@common/workspace/workspace-selector';
import {Trans} from '@ui/i18n/trans';
import {StoreIcon} from 'lucide-react';
import {use} from 'react';

// stores alias – canonical storefront icon, keep deprecated biolinks
if (!dashboardSidebarIcons['/dashboard/stores'] && dashboardSidebarIcons['/dashboard/biolinks']) {
  dashboardSidebarIcons['/dashboard/stores'] = dashboardSidebarIcons['/dashboard/biolinks'];
}
if (!dashboardSidebarIcons['stores'] && dashboardSidebarIcons['biolinks']) {
  (dashboardSidebarIcons as Record<string, unknown>)['stores'] = dashboardSidebarIcons['biolinks'];
}
import {NavLink} from 'react-router';
import {UsageMeter} from './usage-meter';

export function AppDashboardSidebar() {
  const {isMobileMode, leftSidebar} = use(DashboardLayoutContext);
  const primaryMenu = useCustomMenu('dashboard-primary');
  const secondaryMenu = useCustomMenu('dashboard-secondary');
  const hasDigitalProducts = primaryMenu?.items.some(
    item => item.action === '/dashboard/my-products',
  );
  const hasSecondaryItems = !!secondaryMenu?.items.length;

  return (
    <Sidebar.Root
      collapsible="icon"
      side="left"
      className="pt-1.5 data-[variant=floating]:bg-background/50 dark:data-[variant=floating]:bg-card"
    >
      {isMobileMode && (
        <Sidebar.Header>
          <Sidebar.Item>
            <Logo color="auto" className="max-w-40" />
          </Sidebar.Item>
        </Sidebar.Header>
      )}
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupContent>
            <Sidebar.MenuFromConfig
              position="dashboard-primary"
              defaultIcons={dashboardSidebarIcons}
              end={item => item.action === '/dashboard'}
            />
            {!hasDigitalProducts && (
              <Sidebar.Menu>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    render={<NavLink to="/dashboard/my-products" />}
                    icon={<StoreIcon />}
                  >
                    <Trans message="Digital Products" />
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
            )}
          </Sidebar.GroupContent>
        </Sidebar.Group>

        {hasSecondaryItems && (
          <Sidebar.Group>
            <Sidebar.GroupLabel>
              <Trans message="Resources" />
            </Sidebar.GroupLabel>
            <Sidebar.GroupContent>
              <Sidebar.MenuFromConfig
                position="dashboard-secondary"
                defaultIcons={dashboardSidebarIcons}
                end={item => item.action === '/dashboard'}
              />
            </Sidebar.GroupContent>
          </Sidebar.Group>
        )}
      </Sidebar.Content>
      <Sidebar.Footer>
        {leftSidebar.status === 'collapsed' ? (
          <CompactUsageTrigger className="mx-auto mb-2.5 shrink-0" />
        ) : (
          <>
            <UsageMeter />
            <WorkspaceSelector />
          </>
        )}
      </Sidebar.Footer>
    </Sidebar.Root>
  );
}
