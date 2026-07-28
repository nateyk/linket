import {SiteConfigContextValue} from '@common/core/settings/site-config-context';
import {WorkspaceInviteNotificationRenderer} from '@common/workspace/notifications/workspace-invite-notification-renderer';

const workspaceInviteNotif =
  'Common\\Workspaces\\Notifications\\WorkspaceInvitation';

export const BaseSiteConfig: SiteConfigContextValue = {
  notifications: {
    renderMap: {
      [workspaceInviteNotif]: WorkspaceInviteNotificationRenderer,
    },
  },
  admin: {
    ads: [],
  },
};
