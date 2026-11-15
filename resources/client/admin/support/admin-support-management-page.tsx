import {useAuth} from '@common/auth/use-auth';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  ChartNoAxesCombinedIcon,
  ChevronRightIcon,
  InboxIcon,
  MessageCircleMoreIcon,
  MessagesSquareIcon,
  SearchIcon,
  Settings2Icon,
  UsersIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import {Link} from 'react-router';

type SupportDestination = {
  label: string;
  description: string;
  href: string;
  permission: string;
  icon: LucideIcon;
  separateWorkspace?: boolean;
};

const inboxDestinations: SupportDestination[] = [
  {
    label: 'All conversations',
    description: 'Review and reply to customer tickets and live chats.',
    href: '/agent/conversations?viewId=all',
    permission: 'conversations.update',
    icon: InboxIcon,
    separateWorkspace: true,
  },
  {
    label: 'Assigned to me',
    description: 'Open conversations assigned to your account.',
    href: '/agent/conversations?viewId=mine',
    permission: 'conversations.update',
    icon: MessageCircleMoreIcon,
    separateWorkspace: true,
  },
  {
    label: 'Search conversations',
    description: 'Find tickets by customer, subject, status, or date.',
    href: '/agent/conversations/search',
    permission: 'conversations.update',
    icon: SearchIcon,
    separateWorkspace: true,
  },
];

const managementDestinations: SupportDestination[] = [
  {
    label: 'Help Center',
    description: 'Manage published articles, sections, and categories.',
    href: '/admin/help',
    permission: 'articles.update',
    icon: BookOpenIcon,
  },
  {
    label: 'Customers',
    description: 'Review customer profiles and conversation history.',
    href: '/agent/customers',
    permission: 'users.update',
    icon: UsersIcon,
    separateWorkspace: true,
  },
  {
    label: 'Agents and groups',
    description: 'Manage support team members and assignments.',
    href: '/agent/team/members',
    permission: 'agents.update',
    icon: UsersRoundIcon,
    separateWorkspace: true,
  },
  {
    label: 'Inbox views',
    description: 'Configure the filters and queues used by agents.',
    href: '/agent/views',
    permission: 'views.update',
    icon: MessagesSquareIcon,
    separateWorkspace: true,
  },
  {
    label: 'Saved replies',
    description: 'Create reusable responses for support conversations.',
    href: '/agent/saved-replies',
    permission: 'conversations.update',
    icon: MessageCircleMoreIcon,
    separateWorkspace: true,
  },
  {
    label: 'Support reports',
    description: 'Review ticket volume and agent performance.',
    href: '/agent/reports',
    permission: 'reports.view',
    icon: ChartNoAxesCombinedIcon,
    separateWorkspace: true,
  },
  {
    label: 'Live chat settings',
    description: 'Configure the customer-facing support widget.',
    href: '/admin/settings/livechat',
    permission: 'settings.update',
    icon: Settings2Icon,
  },
];

export function getVisibleSupportDestinations(
  canAccess: (permission: string) => boolean,
): {inbox: SupportDestination[]; management: SupportDestination[]} {
  return {
    inbox: inboxDestinations.filter(item => canAccess(item.permission)),
    management: managementDestinations.filter(item => canAccess(item.permission)),
  };
}

export function Component() {
  const {hasPermission} = useAuth();
  const destinations = getVisibleSupportDestinations(hasPermission);
  const hasInbox = destinations.inbox.length > 0;
  const hasManagement = destinations.management.length > 0;

  return (
    <>
      <StaticPageTitle>
        <Trans message="Support management" />
      </StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="Support" />
          </DashboardLayout.SectionTitle>
          {hasInbox && (
            <Button
              color="primary"
              size="sm"
              nativeButton={false}
              render={<Link to="/agent/conversations?viewId=all" />}
            >
              <InboxIcon aria-hidden="true" />
              <span className="hidden sm:inline">
                <Trans message="Open inbox" />
              </span>
              <span className="sm:hidden">
                <Trans message="Inbox" />
              </span>
            </Button>
          )}
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="min-w-0">
          <div className="flex max-w-3xl min-w-0 flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              <Trans message="Find customer conversations, tickets, support agents, and Help Center tools in one place." />
            </p>

            {hasInbox && (
              <SupportGroup
                title="Inbox and conversations"
                description="Tickets and live chats open in the dedicated agent inbox, which supports replying, assignment, and status changes."
                items={destinations.inbox}
              />
            )}
            {hasManagement && (
              <SupportGroup
                title="Manage support"
                description="Configure the people, knowledge, replies, and reporting used by the support team."
                items={destinations.management}
              />
            )}
            {!hasInbox && !hasManagement && (
              <p className="text-sm text-muted-foreground">
                <Trans message="Your account does not have access to support management tools." />
              </p>
            )}
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

function SupportGroup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: SupportDestination[];
}) {
  return (
    <section className="min-w-0 space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">
          <Trans message={title} />
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans message={description} />
        </p>
      </div>
      <nav aria-label={title} className="divide-y overflow-hidden rounded-card border">
        {items.map(item => (
          <SupportDestinationRow key={item.href} item={item} />
        ))}
      </nav>
    </section>
  );
}

function SupportDestinationRow({item}: {item: SupportDestination}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className="group flex min-w-0 items-center gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:px-4"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-card-sm border bg-muted/40 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          <Trans message={item.label} />
        </span>
        <span className="block text-xs text-muted-foreground">
          <Trans message={item.description} />
        </span>
      </span>
      {item.separateWorkspace ? (
        <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : (
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
    </Link>
  );
}
