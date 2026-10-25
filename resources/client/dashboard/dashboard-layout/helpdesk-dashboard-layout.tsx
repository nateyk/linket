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
 * BeDesk agent shell: CSS grid + card panels. Required for ported inbox, HC,
 * AI agent, campaigns, and saved-replies layouts.
 */
export function Component() {
  const isCompactLayout = useMediaQuery('(max-width: 1024px)');
  const matches = useMatches();
  const customDashboardLayout = matches.some(
    m => (m.handle as {customDashboardLayout?: boolean} | undefined)
      ?.customDashboardLayout,
  );

  return (
    <Fragment>
      <GlobalDashboardHooks />
      <DashboardLayout
        name="linket-agent"
        leftSidenavCanBeCompact
        compactByDefault
        className="dashboard-layout-with-spacing"
      >
        <DashboardSidenav position="left" size="sm">
          <HelpdeskDashboardSidebar />
        </DashboardSidenav>
        {customDashboardLayout ? (
          <Outlet />
        ) : (
          <div className="dashboard-grid-content dashboard-rounded-panel min-h-0">
            <Outlet />
          </div>
        )}
        {isCompactLayout ? <MobileBottomNavbar /> : null}
      </DashboardLayout>
    </Fragment>
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
