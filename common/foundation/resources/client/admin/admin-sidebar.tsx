import {AdminSidebarIcons} from '@app/admin/admin-config';
import {
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {BellIcon, ChevronRightIcon, ChevronUpIcon, ShieldCheckIcon, StoreIcon, WalletCardsIcon, CreditCardIcon, CoinsIcon, LandmarkIcon} from 'lucide-react';
import {JSXElementConstructor, use, useState} from 'react';
import {Link, NavLink, useLocation, useSearchParams} from 'react-router';

const DIGITAL_PRODUCTS_PATH = '/admin/items';

export function AdminSidebar() {
  const {isMobileMode, leftSidebar} = use(DashboardLayoutContext);
  const isCompactMode = !isMobileMode && leftSidebar.status === 'collapsed';
  const adminMenu = useCustomMenu('admin-sidebar');
  const {pathname} = useLocation();
  const [searchParams] = useSearchParams();
  const onDigitalProducts = pathname === DIGITAL_PRODUCTS_PATH;
  const updatedActive =
    onDigitalProducts && searchParams.get('scope') === 'updated';
  const allProductsActive = onDigitalProducts && !updatedActive;
  const [productsOpen, setProductsOpen] = useState(onDigitalProducts);
  const hasTransactions = adminMenu?.items.some(
    item => item.action === '/admin/payment-activity',
  );
  const hasKyc = adminMenu?.items.some(
    item => item.action === '/admin/kyc-verifications',
  );
  const hasWithdrawals = adminMenu?.items.some(
    item => item.action === '/admin/withdrawals',
  );
  const hasPaymentGateways = adminMenu?.items.some(
    item => item.action === '/admin/financial/payment-gateways',
  );
  const hasWithdrawalMethods = adminMenu?.items.some(
    item => item.action === '/admin/financial/withdrawal-methods',
  );
  const visibleMenuItems = (adminMenu?.items ?? []).filter(
    item => !isSettingsNavOnlyAdminItem(item.action),
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
                !isSettingsNavOnlyAdminItem(item.action)
              }
            />
            {isCompactMode ? (
              <Sidebar.Menu>
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    render={<Link to={DIGITAL_PRODUCTS_PATH} />}
                    icon={<StoreIcon />}
                  >
                    <Trans message="Products" />
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
            ) : (
              <Sidebar.Menu>
                <Sidebar.MenuItem>
                  <Collapsible
                    open={productsOpen}
                    onOpenChange={setProductsOpen}
                  >
                    <CollapsibleTrigger
                      render={
                        <Sidebar.MenuButton
                          icon={<StoreIcon />}
                          rightIcon={
                            <ChevronRightIcon
                              className={cn(
                                'transition-transform duration-150',
                                productsOpen && 'rotate-90',
                              )}
                            />
                          }
                        />
                      }
                    >
                      <Trans message="Products" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Sidebar.Menu className="ps-5">
                        <Sidebar.MenuItem>
                          <Sidebar.MenuButton
                            size="sm"
                            render={
                              <Link
                                to={DIGITAL_PRODUCTS_PATH}
                                aria-current={
                                  allProductsActive ? 'page' : undefined
                                }
                              />
                            }
                          >
                            <Trans message="All products" />
                          </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                        <Sidebar.MenuItem>
                          <Sidebar.MenuButton
                            size="sm"
                            render={
                              <Link
                                to={`${DIGITAL_PRODUCTS_PATH}?scope=updated`}
                                aria-current={
                                  updatedActive ? 'page' : undefined
                                }
                              />
                            }
                          >
                            <Trans message="Updated" />
                          </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                      </Sidebar.Menu>
                    </CollapsibleContent>
                  </Collapsible>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
            )}
            {(!hasTransactions || !hasKyc || !hasWithdrawals || !hasPaymentGateways || !hasWithdrawalMethods) && (
              <Sidebar.Menu>
                {!hasTransactions && (
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<NavLink to="/admin/payment-activity" />}
                      icon={<WalletCardsIcon />}
                    >
                      <Trans message="Transactions" />
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
                {!hasWithdrawals && (
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<NavLink to="/admin/withdrawals" />}
                      icon={<CreditCardIcon />}
                    >
                      <Trans message="Withdrawals" />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                )}
                {!hasPaymentGateways && (
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<NavLink to="/admin/financial/payment-gateways" />}
                      icon={<LandmarkIcon />}
                    >
                      <Trans message="Payment Gateways" />
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                )}
                {!hasWithdrawalMethods && (
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      render={<NavLink to="/admin/financial/withdrawal-methods" />}
                      icon={<CoinsIcon />}
                    >
                      <Trans message="Receiving accounts" />
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
