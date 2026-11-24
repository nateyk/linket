import {dashboardSidebarIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {useAuth} from '@common/auth/use-auth';
import {MenuItemIcon} from '@common/menus/custom-menu';
import {MenuItemConfig} from '@common/menus/menu-config';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {NavbarAuthMenu} from '@common/ui/navigation/navbar/navbar-auth-menu';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Badge} from '@ui/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {UserIcon} from 'lucide-react';
import {cn} from '@ui/utils/cn';
import {NavLink} from 'react-router';

/** Compact labels so six tabs stay one line on narrow phones. */
const MOBILE_SHORT_LABELS: Record<string, string> = {
  '/dashboard': 'Home',
  '/dashboard/items': 'Items',
  '/dashboard/my-products': 'Items',
  '/dashboard/services': 'Services',
  '/dashboard/orders': 'Orders',
  '/dashboard/withdrawals': 'Payouts',
  '/dashboard/sales-payouts': 'Payouts',
};

function mobileNavLabel(item: MenuItemConfig): string {
  const path = item.action.split('?')[0];
  return MOBILE_SHORT_LABELS[path] ?? item.label;
}

export function MobileBottomNavbar() {
  const {trans} = useTrans();
  const menu = useCustomMenu('dashboard-mobile');
  if (!menu) return null;

  // This remains available in the sidebar and at /dashboard/stores.
  // Filter here as well as in defaults: deployed accounts retain saved menus.
  const items = menu.items.filter(item => {
    const path = item.action.split('?')[0];
    return path !== '/dashboard/stores' && path !== '/dashboard/biolinks';
  });

  return (
    <nav
      aria-label={trans(message('Mobile navigation'))}
      className="relative z-20 flex shrink-0 items-stretch justify-between gap-0.5 border-t border-border bg-background px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {items.map(item => (
        <MobileNavItem key={item.id} item={item} />
      ))}
      <AccountButton />
    </nav>
  );
}

function MobileNavItem({item}: {item: MenuItemConfig}) {
  const shortLabel = mobileNavLabel(item);
  const icon = (
    <MenuItemIcon
      item={item}
      defaultIcons={dashboardSidebarIcons as any}
    />
  );

  return (
    <NavLink
      to={item.action}
      end={item.action.split('?')[0] === '/dashboard'}
      aria-label={item.label}
      title={item.label}
      // Mirror the sidebar: only the dashboard root matches exactly, so a
      // nested route marks one section current instead of also claiming home.
      className={({isActive}) =>
        cn(
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-muted-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          '[&_svg]:size-5',
          isActive && 'font-semibold text-foreground',
        )
      }
    >
      {icon}
      <span className="w-full truncate text-center text-xs leading-tight">
        <Trans message={shortLabel} />
      </span>
    </NavLink>
  );
}

function AccountButton() {
  const {user} = useAuth();
  const hasUnreadNotif = !!user?.unread_notifications_count;

  return (
    <NavbarAuthMenu>
      <Dropdown.Trigger
        className={cn(
          'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-button px-0.5 py-1.5 text-muted-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          '[&_svg]:size-5',
        )}
      >
        <UserIcon aria-hidden="true" />
        {hasUnreadNotif ? (
          <Badge className="-top-0.5" right="right-1">
            {user?.unread_notifications_count}
          </Badge>
        ) : null}
        <span className="w-full truncate text-center text-xs leading-tight">
          <Trans message="Account" />
        </span>
      </Dropdown.Trigger>
    </NavbarAuthMenu>
  );
}
