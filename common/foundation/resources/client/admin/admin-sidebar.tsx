import {AdminSidebarIcons} from '@app/admin/admin-config';
import {useAuth} from '@common/auth/use-auth';
import {
  NotificationsDialog,
  NotificationsTriggerBadge,
} from '@common/notifications/notifications-dialog';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {NavbarAuthMenu} from '@common/ui/navigation/navbar/navbar-auth-menu';
import {Avatar} from '@shadcn/avatar/avatar';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {BellIcon, ChevronUpIcon} from 'lucide-react';
import {use} from 'react';

export function AdminSidebar() {
  const {isMobileMode, leftSidebar} = use(DashboardLayoutContext);
  const isCompactMode = !isMobileMode && leftSidebar.status === 'collapsed';

  return (
    <Sidebar.Root
      collapsible="icon"
      variant="floating"
      side="left"
      className="data-[variant=floating]:bg-background/50 dark:data-[variant=floating]:bg-card"
      width="w-56"
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
            <Sidebar.MenuFromConfig
              position="admin-sidebar"
              defaultIcons={AdminSidebarIcons}
              end={item => item.action === '/admin'}
            />
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>
      <AdminSidebarFooter />
    </Sidebar.Root>
  );
}

function AdminSidebarFooter() {
  const {user} = useAuth();
  if (!user) return null;

  const avatar = (
    <Avatar.Root size="sm">
      <Avatar.Image src={user.image ?? undefined} />
      <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
    </Avatar.Root>
  );

  return (
    <Sidebar.Footer>
      <Sidebar.Menu>
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
        <NavbarAuthMenu side="top" align="center">
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
