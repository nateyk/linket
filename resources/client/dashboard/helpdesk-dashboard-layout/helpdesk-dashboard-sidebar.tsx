import {AgentAvatarWithIndicator} from '@app/dashboard/conversations/avatars/agent-avatar';
import {dashboardIcons} from '@app/dashboard/dashboard-icons';
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
import {NotificationsIcon} from '@ui/icons/material/Notifications';
import {SettingsIcon} from '@ui/icons/material/Settings';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import {Fragment, useCallback} from 'react';
import {Link} from 'react-router';

const defaultIcons = {
  '/agent/conversations': dashboardIcons.inbox,
  '/agent/campaigns': dashboardIcons.campaigns,
  '/agent/ai-agent/settings': dashboardIcons.aiAgent,
  '/agent/ai-agent': dashboardIcons.aiAgent,
  '/agent/ai-agents': dashboardIcons.aiAgent,
  '/agent/archive': dashboardIcons.archive,
  '/agent/team': dashboardIcons.team,
  '/agent/reports': dashboardIcons.reports,
  '/agent/hc/arrange': dashboardIcons.library,
  '/agent/customers': dashboardIcons.users,
  '/agent/saved-replies': dashboardIcons.saveReplies,
};

export function HelpdeskDashboardSidebar(props: DashboardSidenavChildrenProps) {
  const {isCompactMode = false} = props;

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
      <DashboardLeftSidebarItem
        elementType={Link}
        target="_blank"
        to="/admin/settings/general"
        isCompact={isCompactMode}
      >
        <SettingsIcon />
        <Trans message="Settings" />
      </DashboardLeftSidebarItem>
      <NotificationsItem isCompact={isCompactMode} />
      <AdminSidebarAuthUserItem
        isCompact={isCompactMode}
        avatar={AgentAvatarWithIndicator}
        accountSettingsLink="/agent/team/members/me/details"
      />
    </Fragment>
  );

  return (
    <DashboardLeftSidebar
      {...props}
      variant="withoutNavbar"
      matchDescendants={to => to === '/agent'}
      menuName="agent-dashboard-sidebar"
      customMenuRender={customMenuRender}
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
        <NotificationsIcon />
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
