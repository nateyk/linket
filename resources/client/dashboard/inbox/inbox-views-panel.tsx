import {DashboardIcon, DashboardIconName} from '@app/dashboard/dashboard-icons';
import {InboxSectionHeader} from '@app/dashboard/dashboard-layout/inbox-section-header';
import {helpdeskQueries} from '@app/dashboard/helpdesk-queries';
import {InboxView} from '@app/dashboard/types/views';
import {useQuery} from '@tanstack/react-query';
import {IconButton} from '@ui/buttons/icon-button';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {ChevronRightIcon, PlusIcon, SearchIcon, SlidersHorizontalIcon, InboxIcon, MessageCircleIcon} from 'lucide-react';
import {Tooltip} from '@ui/tooltip/tooltip';
import {useLocalStorage} from '@ui/utils/hooks/local-storage';
import clsx from 'clsx';
import {Fragment, ReactElement, ReactNode, useMemo} from 'react';
import {Link, useSearchParams} from 'react-router';

export function InboxViewsPanel() {
  const {data} = useQuery(helpdeskQueries.conversations.inboxViews);

  const {views, pinnedViews, groupViews} = useMemo(() => {
    const pinnedViews: InboxView[] = [];
    const views: InboxView[] = [];
    const groupViews: InboxView[] = [];
    data?.views.forEach(view => {
      if (view.pinned) {
        pinnedViews.push(view);
      } else if (view.isGroupView) {
        groupViews.push(view);
      } else {
        views.push(view);
      }
    });
    return {views, pinnedViews, groupViews};
  }, [data?.views]);

  return (
    <Fragment>
      <Toolbar />
      <div className="compact-scrollbar flex-auto overflow-y-auto pl-3">
        <ViewList views={pinnedViews} />
        <Section
          name="views"
          actions={
            <IconButton
              size="xs"
              iconSize="sm"
              elementType={Link}
              to="/agent/views"
              aria-label="Manage conversation views"
            >
              <SlidersHorizontalIcon aria-hidden="true" />
            </IconButton>
          }
        >
          <Trans message="Views" />
          {views.length ? (
            <ViewList views={views} className="pl-2" />
          ) : pinnedViews.length === 0 ? (
            <DefaultInboxViews />
          ) : null}
        </Section>
        {groupViews.length > 0 && (
          <Section name="groups">
            <Trans message="Groups" />
            <ViewList views={groupViews} className="pl-2" />
          </Section>
        )}
      </div>
    </Fragment>
  );
}

function Toolbar() {
  return (
    <InboxSectionHeader
      showSeparator
      padding="px-3"
      className="min-w-0"
    >
      <span className="min-w-0 flex-1 truncate text-base font-semibold"><Trans message="Inbox" /></span>
      <Tooltip label={<Trans message="Search conversations" />}>
        <IconButton
          aria-label="Search conversations"
          elementType={Link}
          to="/agent/conversations/search"
          size="sm"
          radius="rounded-full"
          className="text-muted-foreground"
        >
          <SearchIcon className="size-4" aria-hidden="true" />
        </IconButton>
      </Tooltip>
      <Tooltip label={<Trans message="New conversation" />}>
        <IconButton
          aria-label="New conversation"
          elementType={Link}
          to="/agent/conversations/new"
          size="sm"
          radius="rounded-full"
          className="text-muted-foreground"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
        </IconButton>
      </Tooltip>
    </InboxSectionHeader>
  );
}

function DefaultInboxViews() {
  const [params] = useSearchParams();
  const current = params.get('viewId') ?? 'all';

  return (
    <nav aria-label="Default conversation views" className="flex flex-col gap-0.5 ps-2">
      <DefaultInboxView to="all" active={current === 'all'} icon={<InboxIcon className="size-4" />}>
        <Trans message="All conversations" />
      </DefaultInboxView>
      <DefaultInboxView to="mine" active={current === 'mine'} icon={<MessageCircleIcon className="size-4" />}>
        <Trans message="Assigned to me" />
      </DefaultInboxView>
    </nav>
  );
}

function DefaultInboxView({
  to,
  active,
  icon,
  children,
}: {
  to: string;
  active: boolean;
  icon: ReactElement;
  children: ReactNode;
}) {
  return (
    <Link
      to={`/agent/conversations?viewId=${to}`}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex min-h-9 items-center gap-2 rounded-button px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring',
        active
          ? 'bg-sidebar-accent font-medium text-accent-foreground'
          : 'hover:bg-sidebar-accent hover:text-accent-foreground',
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

interface SectionProps {
  name: string;
  children: [ReactElement, ReactElement | null];
  actions?: ReactNode;
}
function Section({name, children, actions}: SectionProps) {
  const [isExpanded, setIsExpanded] = useLocalStorage(
    `inbox-${name}-expanded`,
    true,
  );
  return (
    <Fragment>
      <div className="group mb-2 flex items-center gap-2 pl-2.5 pr-3.5 pt-5">
        <div className="mr-auto text-sm font-semibold">{children[0]}</div>
        {actions && (
          <div className="opacity-75 hover:opacity-100 focus-within:opacity-100">
            {actions}
          </div>
        )}
        <IconButton
          size="xs"
          iconSize="sm"
          aria-label={`Toggle ${name} views`}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronRightIcon
            className={clsx('size-4 transition-transform', isExpanded && 'rotate-90')}
            aria-hidden="true"
          />
        </IconButton>
      </div>
      {isExpanded && children[1]}
    </Fragment>
  );
}

interface ViewListProps {
  views: InboxView[];
  className?: string;
}
function ViewList({views, className}: ViewListProps) {
  return (
    <div className={clsx('flex flex-col gap-0.5 text-sm', className)}>
      {views.map(view => (
        <ViewListItem view={view} key={view.id} />
      ))}
    </div>
  );
}

interface ViewListItemProps {
  view: InboxView;
}
function ViewListItem({view}: ViewListItemProps) {
  const [searchParams] = useSearchParams();
  const activeId = searchParams.get('viewId');
  const isActive =
    `${view.id}` === activeId || (view.key && view.key === activeId);
  return (
    <Link
      className={clsx(
        'flex min-h-9 items-center justify-between gap-2 rounded-button px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        isActive
          ? 'bg-sidebar-accent font-medium text-accent-foreground'
          : 'text-foreground hover:bg-sidebar-accent hover:text-accent-foreground',
      )}
      to={`/agent/conversations?viewId=${view.key ?? view.id}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <DashboardIcon name={view.icon as DashboardIconName} size="xs" />
      <span className="text-overflow-ellipsis mr-3 block min-w-0 flex-auto overflow-hidden whitespace-nowrap">
        <Trans message={view.name} />
      </span>
      {view.count ? (
        <div className="ml-auto text-[11px] text-muted">
          <FormattedNumber value={view.count} />
        </div>
      ) : null}
    </Link>
  );
}
