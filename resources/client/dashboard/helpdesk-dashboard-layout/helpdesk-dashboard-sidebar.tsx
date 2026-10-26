import {AgentAvatarWithIndicator} from '@app/dashboard/conversations/avatars/agent-avatar';
import {useUnseenConversationsStore} from '@app/dashboard/websockets/websocket-updates-notifier';
import {AdminSidebarAuthUserItem} from '@common/admin/admin-sidebar';
import {useAuth} from '@common/auth/use-auth';
import {CustomMenuItem, MenuItemProps} from '@common/menus/custom-menu';
import {MenuItemConfig} from '@common/menus/menu-config';
import {NotificationsDialog} from '@common/notifications/dialog/notification-dialog-trigger';
import {
  DashboardLeftSidebar,
  DashboardLeftSidebarItem,
} from '@common/ui/dashboard-layout/dashboard-left-sidebar';
import {DashboardSidenavChildrenProps} from '@common/ui/dashboard-layout/dashboard-sidenav';
import {Badge} from '@ui/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import {
  ArchiveIcon,
  BellIcon,
  BotIcon,
  ChartColumnBigIcon,
  InboxIcon,
  LibraryIcon,
  MessageSquareTextIcon,
  MousePointerClickIcon,
  SettingsIcon,
  UsersIcon,
  UsersRoundIcon,
} from 'lucide-react';
import {Fragment, useCallback} from 'react';
import {Link} from 'react-router';

// Keep the helpdesk icon language on lucide, matching the admin/dashboard
// shells instead of mixing Material and lucide glyphs.
const defaultIcons = {
  '/agent/conversations': InboxIcon,
  '/agent/campaigns': MousePointerClickIcon,
  '/agent/ai-agent/settings': BotIcon,
  '/agent/ai-agent': BotIcon,
  '/agent/ai-agents': BotIcon,
  '/agent/archive': ArchiveIcon,
  '/agent/team': UsersRoundIcon,
  '/agent/reports': ChartColumnBigIcon,
  '/agent/hc/arrange': LibraryIcon,
  '/agent/customers': UsersIcon,
  '/agent/saved-replies': MessageSquareTextIcon,
} as any;

export function HelpdeskDashboardSidebar(props: DashboardSidenavChildrenProps) {
  const {isCompactMode = false} = props;
  const {hasPermission} = useAuth();
  const canOpenSettings =
    hasPermission('admin') || hasPermission('settings.update');

  const customMenuRender = useCallback(
    (item: MenuItemConfig, menuItemProps: MenuItemProps) => (
      <CustomMenuItem
        key={item.id}
        {...menuItemProps}
        defaultIcons={defaultIcons}
        position="relative"
        extraContent={
          item.action.startsWith('/agent/conversations') ? (
            <ConversationsMenuItemBadge />
          ) : null
        }
      />
    ),
    [],
  );

  const bottomContent = (
    <Fragment>
      <NotificationsItem isCompact={isCompactMode} />
      <AdminSidebarAuthUserItem
        isCompact={isCompactMode}
        avatar={AgentAvatarWithIndicator}
        accountSettingsLink="/agent/team/members/me/details"
      />
    </Fragment>
  );

  const afterMenu = canOpenSettings ? (
    <DashboardLeftSidebarItem
      elementType={Link}
      target="_blank"
      to="/admin/settings/general"
      isCompact={isCompactMode}
    >
      <SettingsIcon />
      <Trans message="Settings" />
    </DashboardLeftSidebarItem>
  ) : null;

  return (
    <DashboardLeftSidebar
      {...props}
      variant="withoutNavbar"
      matchDescendants={to => to === '/agent'}
      menuName="agent-dashboard-sidebar"
      customMenuRender={customMenuRender}
      afterMenu={afterMenu}
      bottomContent={bottomContent}
      showToggleSidebarButton={false}
    />
  );
}

interface NotificationsItemProps {
  isCompact: boolean;
}
function NotificationsItem({isCompact}: NotificationsItemProps) {
  const {user} = useAuth();
  const hasUnread = !!user?.unread_notifications_count;
  return (
    <DialogTrigger type="popover" placement="top">
      <DashboardLeftSidebarItem isCompact={isCompact} className="relative">
        <BellIcon />
        <Trans message="Notifications" />
        {hasUnread ? (
          <Badge>{user?.unread_notifications_count}</Badge>
        ) : undefined}
      </DashboardLeftSidebarItem>
      <NotificationsDialog settingsLink="/agent/notifications" />
    </DialogTrigger>
  );
}

function ConversationsMenuItemBadge() {
  const unseenChats = useUnseenConversationsStore(s => s.unseenConversations);

  if (!unseenChats.length) return null;

  return (
    <Badge top="top-2" right="right-2">
      {unseenChats.length}
    </Badge>
  );
}
