import {AdminSidebarIcons} from '@app/admin/admin-config';
import {
  isObsoleteAdminSidebarItem,
  isSettingsNavOnlyAdminItem,
  shouldEndMatchSidebarItem,
} from '@common/admin/admin-sidebar-nav-end';
import {UserAvatar, UserAvatarProps} from '@common/auth/user-avatar';
import {useAuth} from '@common/auth/use-auth';
import {useCustomMenu} from '@common/menus/use-custom-menu';
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
import {BanknoteArrowUpIcon, BellIcon, ChevronUpIcon, ShieldCheckIcon, StoreIcon, LandmarkIcon, WalletCardsIcon} from 'lucide-react';
import {JSXElementConstructor, use} from 'react';
import {NavLink, useLocation} from 'react-router';

const DIGITAL_PRODUCTS_PATH = '/admin/items';

export function AdminSidebar() {
  const {isMobileMode, leftSidebar} = use(DashboardLayoutContext);
  const isCompactMode = !isMobileMode && leftSidebar.status === 'collapsed';
  const adminMenu = useCustomMenu('admin-sidebar');
  const {pathname} = useLocation();
  const hasFinancial = adminMenu?.items.some(
    item =>
      item.action === '/admin/financial' ||
      item.action === '/admin/financial/general',
  );
  const hasKyc = adminMenu?.items.some(
    item => item.action === '/admin/kyc-verifications',
  );
  const visibleMenuItems = (adminMenu?.items ?? []).filter(
    item =>
      !isSettingsNavOnlyAdminItem(item.action) &&
      !isObsoleteAdminSidebarItem(item.action),
  );

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
              end={item =>
                shouldEndMatchSidebarItem(item, pathname, visibleMenuItems)
              }
              filter={item =>
                item.action !== DIGITAL_PRODUCTS_PATH &&
                !isSettingsNavOnlyAdminItem(item.action) &&
                !isObsoleteAdminSidebarItem(item.action)
              }
            />
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  render={<NavLink to={DIGITAL_PRODUCTS_PATH} />}
                  icon={<StoreIcon />}
                >
                  <Trans message="Items" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  render={<NavLink to="/admin/withdrawals" />}
                  icon={<BanknoteArrowUpIcon />}
                >
                  <Trans message="Withdrawals" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  render={<NavLink to="/admin/payout-accounts" />}
                  icon={<WalletCardsIcon />}
                >
                  <Trans message="Payout accounts" />
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
            {(!hasFinancial || !hasKyc) && (
              <Sidebar.Menu>
                {!hasFinancial && (
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<NavLink to="/admin/financial" />}
                      icon={<LandmarkIcon />}
                    >
                      <Trans message="Financial" />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                )}
                {!hasKyc && (
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<NavLink to="/admin/kyc-verifications" />}
                      icon={<ShieldCheckIcon />}
                    >
                      <Trans message="Verification" />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                )}
              </Sidebar.Menu>
            )}
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
        <NavbarAuthMenu side="top" align="end">
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

/** BeDesk agent sidebar auth chip — kept for helpdesk layout (old dashboard-layout). */
interface AuthUserItemProps {
  isCompact: boolean;
  avatar?: JSXElementConstructor<UserAvatarProps>;
  accountSettingsLink?: string;
}
export function AdminSidebarAuthUserItem({
  isCompact,
  avatar: propsAvatar,
  accountSettingsLink,
}: AuthUserItemProps) {
  const {user} = useAuth();
  if (!user) return null;

  const ItemAvatar = propsAvatar || UserAvatar;
  const avatar = <ItemAvatar user={user} size="sm" />;

  return (
    <NavbarAuthMenu
      side="top"
      align="end"
      accountSettingsLink={accountSettingsLink}
    >
      {isCompact ? (
        <Dropdown.Trigger
          aria-label="toggle authentication menu"
          className="flex size-8 items-center justify-center rounded-button hover:bg-sidebar-accent hover:text-accent-foreground"
        >
          {avatar}
        </Dropdown.Trigger>
      ) : (
        <Dropdown.Trigger className="flex h-9 w-full items-center rounded-button px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-accent-foreground">
          {avatar}
          <span className="ms-2 block min-w-0 truncate">{user.name}</span>
          <ChevronUpIcon className="ms-auto block size-4" />
        </Dropdown.Trigger>
      )}
    </NavbarAuthMenu>
  );
}
