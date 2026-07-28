import {CompactUsageTrigger} from '@app/dashboard/layout/sidenav/compact-usage-trigger';
import {dashboardSidebarIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {WorkspaceSelector} from '@common/workspace/workspace-selector';
import {Trans} from '@ui/i18n/trans';
import {use} from 'react';
import {UsageMeter} from './usage-meter';

export function AppDashboardSidebar() {
  const {isMobileMode, leftSidebar} = use(DashboardLayoutContext);

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
          </Sidebar.GroupContent>
        </Sidebar.Group>

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

        {leftSidebar.status === 'expanded' && <UsageMeter />}
      </Sidebar.Content>
      <Sidebar.Footer>
        {leftSidebar.status === 'collapsed' ? (
          <CompactUsageTrigger className="mx-auto mb-2.5 shrink-0" />
        ) : (
          <WorkspaceSelector />
        )}
      </Sidebar.Footer>
    </Sidebar.Root>
  );
}
