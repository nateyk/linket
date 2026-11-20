import {useAgentInboxLayout} from '@app/dashboard/conversations/conversation-page/use-agent-inbox-layout';
import {InboxViewsPanel} from '@app/dashboard/inbox/inbox-views-panel';
import {DashboardLayoutContext} from '@common/ui/dashboard-layout/dashboard-layout-context';
import {Button} from '@ui/buttons/button';
import {Trans} from '@ui/i18n/trans';
import {SlidersHorizontalIcon} from 'lucide-react';
import {AnimatePresence, m} from 'framer-motion';
import {Fragment, useContext} from 'react';
import {Link, Outlet} from 'react-router';

interface Props {
  location: 'conversationsTable' | 'conversationPage';
}
export function InboxViewsSidebar({location}: Props) {
  const {isMobileMode} = useContext(DashboardLayoutContext);
  const {conversationsTableViewsSidebarOpen, conversationPageViewsSidebarOpen} =
    useAgentInboxLayout();

  const isOpen =
    location === 'conversationsTable'
      ? conversationsTableViewsSidebarOpen
      : conversationPageViewsSidebarOpen;

  return (
    <Fragment>
      {!isMobileMode && (
        <AnimatePresence initial={false} mode="wait">
          {isOpen && <DesktopInboxViews />}
        </AnimatePresence>
      )}
      <Outlet />
    </Fragment>
  );
}

function DesktopInboxViews() {
  return (
    <m.aside
      initial={{width: 0, opacity: 0}}
      animate={{width: 224, opacity: 1}}
      exit={{width: 0, opacity: 0}}
      transition={{duration: 0.15}}
      className="inbox-views-sidebar dashboard-grid-sidenav-left-2 dashboard-rounded-panel relative z-10 flex h-full w-56 min-h-0 min-w-0 flex-shrink-0 flex-col border-e border-border/70"
    >
      <InboxViewsPanel />
      <div className="mt-auto border-t px-3 py-2.5">
        <Button
          size="xs"
          elementType={Link}
          to="/agent/views"
          startIcon={<SlidersHorizontalIcon className="size-4" aria-hidden="true" />}
        >
          <Trans message="Manage views" />
        </Button>
      </div>
    </m.aside>
  );
}
