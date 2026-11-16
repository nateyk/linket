import {AdminSidebar} from '@common/admin/admin-sidebar';
import {DashboardLayout as LinketDashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Trans} from '@ui/i18n/trans';
import {Link} from 'react-router';
import {HelpdeskDashboardSidebar} from '@app/dashboard/helpdesk-dashboard-layout/helpdesk-dashboard-sidebar';
import {MobileBottomNavbar} from '@app/dashboard/dashboard-layout/mobile-bottom-navbar';
import {dashboardChatUpdatesNotifier} from '@app/dashboard/websockets/dashboard-websocket-updates-notifier';
import {useDashboardWebsocketListener} from '@app/dashboard/websockets/use-dashboard-websocket-listener';
import {useAuth} from '@common/auth/use-auth';
import {DashboardLayout} from '@common/ui/dashboard-layout/dashboard-layout';
import {DashboardSidenav} from '@common/ui/dashboard-layout/dashboard-sidenav';
import {useCompactAgents} from '@livechat/widget/agents/use-widget-compact-agents';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {Fragment, useEffect} from 'react';
import {Outlet, useMatch, useMatches} from 'react-router';

/**
 * Admins keep the same Linket navigation on /admin and /agent. Agent-only
 * staff retain their permission-scoped sidebar and existing inbox routes.
 * The legacy dashboard context stays inside both shells for BeDesk panels,
 * conversation details, and mobile inbox behavior.
 */
export function Component() {
  const {hasPermission} = useAuth();
  const adminShell = hasPermission('admin.access');

  return (
    <Fragment>
      <GlobalDashboardHooks />
      {adminShell ? (
        <LinketDashboardLayout.Root name="admin">
          <LinketDashboardLayout.Content>
            <AdminSidebar />
            <AgentDashboardContent adminShell />
          </LinketDashboardLayout.Content>
        </LinketDashboardLayout.Root>
      ) : (
        <AgentDashboardContent />
      )}
    </Fragment>
  );
}

function AgentDashboardContent({adminShell = false}: {adminShell?: boolean}) {
  const isCompactLayout = useMediaQuery('(max-width: 1024px)');
  const matches = useMatches();
  const customDashboardLayout = matches.some(
    m => (m.handle as {customDashboardLayout?: boolean} | undefined)
      ?.customDashboardLayout,
  );

  return (
    <DashboardLayout
      name="linket-agent"
      leftSidenavCanBeCompact
      compactByDefault
      height={adminShell ? 'h-full' : 'h-screen'}
      className={
        adminShell
          ? 'min-w-0 min-h-0 flex-1'
          : 'dashboard-layout-with-spacing'
      }
    >
      {!adminShell && (
        <DashboardSidenav position="left" size="sm">
          <HelpdeskDashboardSidebar />
        </DashboardSidenav>
      )}
      {adminShell && (
        <div className="dashboard-grid-navbar flex h-12 items-center gap-2 border-b bg-card px-3">
          <LinketDashboardLayout.SidebarToggle />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            <Trans message="Support inbox" />
          </span>
          <Link
            to="/admin/support"
            className="shrink-0 rounded-button px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Trans message="Support" />
          </Link>
        </div>
      )}
      {customDashboardLayout ? (
        <Outlet />
      ) : (
        <div className="dashboard-grid-content dashboard-rounded-panel min-h-0">
          <Outlet />
        </div>
      )}
      {isCompactLayout ? <MobileBottomNavbar /> : null}
    </DashboardLayout>
  );
}

function GlobalDashboardHooks() {
  const {user} = useAuth();
  useDashboardWebsocketListener();

  const compactAgentQuery = useCompactAgents();

  if (!dashboardChatUpdatesNotifier.isInitialized && compactAgentQuery.agents) {
    const agent = compactAgentQuery.agents.find(a => a.id === user?.id);
    if (agent) {
      dashboardChatUpdatesNotifier.init(agent);
    }
  }

  const match = useMatch('/agent/conversations/*');
  const isInboxOpen = !!match;
  const conversationId = match?.params['*'];

  useEffect(() => {
    dashboardChatUpdatesNotifier.setPageStatus({
      activeConversationId: conversationId ? +conversationId : null,
      isInboxOpen: isInboxOpen,
    });
  }, [isInboxOpen, conversationId]);

  return null;
}
