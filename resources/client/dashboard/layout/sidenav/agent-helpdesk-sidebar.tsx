import {useAgentWasActiveRecently} from '@app/dashboard/agents/use-compact-agents';
import {dashboardIcons} from '@app/dashboard/dashboard-icons';
import {useUnseenConversationsStore} from '@app/dashboard/websockets/websocket-updates-notifier';
import {useAuth} from '@common/auth/use-auth';
import {MenuItemIcon} from '@common/menus/custom-menu';
import {MenuItemConfig} from '@common/menus/menu-config';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {
  NotificationsDialog,
  NotificationsTriggerBadge,
} from '@common/notifications/notifications-dialog';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {NavbarAuthMenu} from '@common/ui/navigation/navbar/navbar-auth-menu';
import {Badge} from '@shadcn/badge/badge';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {Avatar} from '@shadcn/avatar/avatar';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {OnlineStatusCircle} from '@ui/badge/online-status-circle';
import {BellIcon, ChevronUpIcon, SettingsIcon} from 'lucide-react';
import {ComponentType, use} from 'react';
import {NavLink} from 'react-router';

const agentDashboardSidebarIcons: Record<
  string,
  ComponentType<{className?: string}>
> = {
  '/agent/conversations': dashboardIcons.inbox,
  '/agent/campaigns': dashboardIcons.campaigns,
  '/agent/ai-agent/settings': dashboardIcons.aiAgent,
  '/agent/ai-agent': dashboardIcons.aiAgent,
  '/agent/reports/ai-agent': dashboardIcons.aiAgent,
  '/agent/team': dashboardIcons.team,
  '/agent/reports': dashboardIcons.reports,
  '/agent/hc/arrange': dashboardIcons.library,
  '/agent/customers': dashboardIcons.users,
  '/agent/saved-replies': dashboardIcons.saveReplies,
};

function navEnd(item: MenuItemConfig): boolean | undefined {
  const path = item.action.split('?')[0];
  if (path === '/agent/hc/arrange') {
    return false;
  }
  if (path === '/agent/conversations') {
    return false;
  }
  return undefined;
}

export function AgentHelpdeskSidebar() {
  const {isMobileMode, leftSidebar} = use(DashboardLayoutContext);
  const isCompactMode = !isMobileMode && leftSidebar.status === 'collapsed';
  const menu = useCustomMenu('agent-dashboard-sidebar');

  return (
    <Sidebar.Root
      collapsible="icon"
      variant="floating"
      side="left"
      width="w-56"
      className="data-[variant=floating]:bg-background/50 dark:data-[variant=floating]:bg-card"
    >
      <Sidebar.Header className="pt-0">
        <Sidebar.Item>
          <Logo
            color="auto"
            logoType={isCompactMode ? 'compact' : 'wide'}
            className="max-w-40"
          />
        </Sidebar.Item>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {menu?.items.map(item => (
                <Sidebar.MenuItem key={item.id}>
                  <Sidebar.MenuButton
                    render={
                      <NavLink to={item.action} end={navEnd(item)} />
                    }
                    icon={
                      <MenuItemIcon
                        item={item}
                        defaultIcons={agentDashboardSidebarIcons}
                      />
                    }
                  >
                    <Trans message={item.label} />
                    {item.action.startsWith('/agent/conversations') ? (
                      <ConversationsMenuItemBadge />
                    ) : null}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>
      <AgentHelpdeskSidebarFooter />
    </Sidebar.Root>
  );
}

function AgentHelpdeskSidebarFooter() {
  const {user, hasPermission} = useAuth();

  if (!user) {
    return null;
  }

  const avatar = (
    <AgentSidebarAvatar
      userId={user.id}
      name={user.name ?? ''}
      image={user.image}
    />
  );

  return (
    <Sidebar.Footer>
      <Sidebar.Menu>
        {hasPermission('admin') || hasPermission('settings.update') ? (
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              render={
                <NavLink to="/admin/settings/general" target="_blank" />
              }
              icon={<SettingsIcon />}
            >
              <Trans message="Settings" />
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        ) : null}
        <Sidebar.MenuItem>
          <NotificationsDialog>
            <Popover.Trigger
              render={
                <Sidebar.MenuButton
                  icon={
                    <span className="relative">
                      <BellIcon />
                      <NotificationsTriggerBadge className="-inset-e-1 -top-1.5" />
                    </span>
                  }
                />
              }
            >
              <Trans message="Notifications" />
            </Popover.Trigger>
          </NotificationsDialog>
        </Sidebar.MenuItem>
        <NavbarAuthMenu
          side="top"
          align="center"
          accountSettingsLink="/agent/team/members/me/details"
        >
          <Sidebar.MenuButton
            icon={avatar}
            rightIcon={<ChevronUpIcon />}
            render={<Dropdown.Trigger />}
          >
            {user.name}
          </Sidebar.MenuButton>
        </NavbarAuthMenu>
      </Sidebar.Menu>
    </Sidebar.Footer>
  );
}

function AgentSidebarAvatar({
  userId,
  name,
  image,
}: {
  userId: number;
  name: string;
  image?: string | null;
}) {
  const isOnline = useAgentWasActiveRecently(userId);

  return (
    <div className="relative">
      <Avatar.Root size="sm">
        <Avatar.Image src={image ?? undefined} />
        <Avatar.ColorFallback>{name}</Avatar.ColorFallback>
      </Avatar.Root>
      <OnlineStatusCircle
        isOnline={isOnline}
        className="absolute -left-0.5 -top-0.5"
      />
    </div>
  );
}

function ConversationsMenuItemBadge() {
  const unseenChats = useUnseenConversationsStore(s => s.unseenConversations);

  if (!unseenChats.length) {
    return null;
  }

  return (
    <Badge variant="secondary" className="ms-auto">
      {unseenChats.length}
    </Badge>
  );
}
