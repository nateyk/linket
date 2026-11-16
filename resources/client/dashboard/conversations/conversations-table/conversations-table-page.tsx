import {ConversationListLayoutToggle} from '@app/dashboard/conversations/conversation-list-layout-toggle';
import {useAgentInboxLayout} from '@app/dashboard/conversations/conversation-page/use-agent-inbox-layout';
import {ConversationsListItem} from '@app/dashboard/conversations/conversations-list/conversations-list-item';
import {ColumnSelector} from '@app/dashboard/conversations/conversations-table/columns/column-selector';
import {ConversationsTableActions} from '@app/dashboard/conversations/conversations-table/conversations-table-actions';
import {GenericConversationsTable} from '@app/dashboard/conversations/conversations-table/generic-conversations-table';
import {useActiveViewConversations} from '@app/dashboard/conversations/utils/use-active-view-converstions';
import {useActiveViewName} from '@app/dashboard/conversations/utils/use-active-view-name';
import {useNavigateToConversationPage} from '@app/dashboard/conversations/utils/use-navigate-to-conversation-page';
import {helpdeskQueries} from '@app/dashboard/helpdesk-queries';
import {InboxViewsPanel} from '@app/dashboard/inbox/inbox-views-panel';
import {InboxViewsSidebar} from '@app/dashboard/inbox/inbox-views-sidebar';
import {useAuth} from '@common/auth/use-auth';
import {GlobalLoadingProgress} from '@common/core/global-loading-progress';
import {DataTablePaginationFooter} from '@common/datatable/data-table-pagination-footer';
import {DatatablePageHeaderBar} from '@common/datatable/page/datatable-page-with-header-layout';
import {queryClient} from '@common/http/query-client';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayoutContext} from '@common/ui/dashboard-layout/dashboard-layout-context';
import {Button} from '@ui/buttons/button';
import {IconButton} from '@ui/buttons/icon-button';
import {Trans} from '@ui/i18n/trans';
import {MessagesSquareIcon} from '@ui/icons/lucide/messages-square-icon';
import {DashboardIcon} from '@ui/icons/material/Dashboard';
import {ToggleLeftSidebarIcon} from '@ui/icons/toggle-left-sidebar-icon';
import {Dialog} from '@ui/overlays/dialog/dialog';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import {Tooltip} from '@ui/tooltip/tooltip';
import clsx from 'clsx';
import {Fragment, useContext, useState} from 'react';
import {Link} from 'react-router';
import {useActiveColumns} from './columns/use-active-columns';

export function Component() {
  const {isMobileMode} = useContext(DashboardLayoutContext);
  const view = isMobileMode ? (
    <ConversationsMobileView />
  ) : (
    <ConversationsDesktopView />
  );

  return (
    <Fragment>
      <InboxViewsSidebar location="conversationsTable" />
      {view}
    </Fragment>
  );
}

function ConversationsDesktopView() {
  const navigateToConversation = useNavigateToConversationPage();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const {query, items, isEmpty, mergeIntoSearchParams, sortDescriptor} =
    useActiveViewConversations();

  const tableName = 'conversationsPage';
  const defaultColumns = query.data?.columns;

  const [activeColumns] = useActiveColumns(tableName, defaultColumns);

  return (
    <div className="dashboard-grid-content dashboard-rounded-panel flex min-h-0 flex-col lg:ms-2">
      <GlobalLoadingProgress query={query} />
      <DatatablePageHeaderBar
        title={<ViewName />}
        toggleButton={<ToggleViewsSidebarButton />}
        padding="p-3"
        rightContent={
          <div>
            <ColumnSelector
              tableName={tableName}
              defaultColumns={defaultColumns}
            />
            <ConversationListLayoutToggle size="sm" />
          </div>
        }
        leftContent={
          selectedIds.length ? (
            <ConversationsTableActions
              className="ml-3"
              conversationIds={selectedIds}
              onActionCompleted={() => {
                setSelectedIds([]);
                queryClient.invalidateQueries({
                  queryKey: helpdeskQueries.conversations.invalidateKey,
                });
              }}
            />
          ) : null
        }
      />
      <div
        className={clsx(
          'flex-auto overflow-y-auto',
          isEmpty && 'flex items-center justify-center',
        )}
      >
        {isEmpty ? (
          <EmptyStateMessage />
        ) : (
          <GenericConversationsTable
            data={items}
            activeColumns={activeColumns}
            selectedTickets={selectedIds}
            onSelectionChange={setSelectedIds}
            sortDescriptor={sortDescriptor}
            onSortChange={mergeIntoSearchParams}
            onRowAction={conversation => {
              navigateToConversation(conversation.id);
            }}
          />
        )}
      </div>
      <DataTablePaginationFooter
        hideIfOnlyOnePage
        className="flex-shrink-0"
        onPageChange={page => mergeIntoSearchParams({page})}
        query={query}
      />
    </div>
  );
}

function ConversationsMobileView() {
  const {hasPermission} = useAuth();
  const {query, items, isEmpty, mergeIntoSearchParams} =
    useActiveViewConversations();

  return (
    <div className="dashboard-grid-content flex min-h-0 flex-col">
      <GlobalLoadingProgress query={query} />
      <DatatablePageHeaderBar
        title={<ViewName />}
        showSidebarToggleButton={!hasPermission('admin.access')}
        padding="p-3"
        rightContent={<ViewsTriggerButton />}
      />
      <div className="flex flex-col gap-3 overflow-y-auto px-3">
        {items.map(conversation => (
          <ConversationsListItem
            key={conversation.id}
            conversation={conversation}
          />
        ))}
      </div>
      {isEmpty && <EmptyStateMessage />}
      <DataTablePaginationFooter
        hideIfOnlyOnePage
        className="flex-shrink-0"
        onPageChange={page => mergeIntoSearchParams({page})}
        query={query}
      />
    </div>
  );
}

function ViewsTriggerButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DialogTrigger type="modal" isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" startIcon={<DashboardIcon />} size="xs">
        <Trans message="Views" />
      </Button>
      <Dialog
        onClick={e => {
          if (e.target instanceof HTMLElement && e.target.closest('button,a')) {
            setIsOpen(false);
          }
        }}
      >
        <InboxViewsPanel />
      </Dialog>
    </DialogTrigger>
  );
}

function EmptyStateMessage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-5 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-card border bg-muted/40 text-muted-foreground">
        <MessagesSquareIcon size="lg" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-medium">
          <Trans message="There are no conversations in this view" />
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans message="Tickets and chats matching this view will appear here." />
        </p>
      </div>
      <Button variant="outline" size="xs" elementType={Link} to="/agent/conversations/search">
        <Trans message="Search conversations" />
      </Button>
    </div>
  );
}

function ViewName() {
  const viewName = useActiveViewName();
  const label = viewName ? (
    <Trans message={viewName} />
  ) : (
    <Trans message="All" />
  );
  return (
    <Fragment>
      {label}
      <StaticPageTitle>{label}</StaticPageTitle>
    </Fragment>
  );
}

function ToggleViewsSidebarButton() {
  const {
    conversationsTableViewsSidebarOpen,
    toggleConversationsTableViewsSidebar,
  } = useAgentInboxLayout();
  return (
    <Tooltip
      placement="bottom"
      label={
        conversationsTableViewsSidebarOpen ? (
          <Trans message="Hide views sidebar" />
        ) : (
          <Trans message="Show views sidebar" />
        )
      }
    >
      <IconButton
        size="xs"
        onClick={() => toggleConversationsTableViewsSidebar()}
      >
        <ToggleLeftSidebarIcon />
      </IconButton>
    </Tooltip>
  );
}
