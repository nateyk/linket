import {dashboardSidebarIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {useAuth} from '@common/auth/use-auth';
import {UnstyledCustomMenuItem} from '@common/menus/custom-menu';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {NavbarAuthMenu} from '@common/ui/navigation/navbar/navbar-auth-menu';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Badge} from '@ui/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {PersonIcon} from '@ui/icons/material/Person';
import {cn} from '@ui/utils/cn';

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
      // Five equal destinations leave room for long labels without clipping.
      // Keep icon tops aligned when an item wraps to two lines.
      className="flex items-start justify-between gap-1 border-t px-2 py-2.5"
    >
      {items.map(item => (
        <UnstyledCustomMenuItem
          key={item.id}
          item={item}
          defaultIcons={dashboardSidebarIcons as any}
          // Mirror the sidebar: only the dashboard root matches exactly, so a
          // nested route (/dashboard/stores/3006) marks one section current
          // instead of also claiming the dashboard home link.
          matchDescendants={action => action === '/dashboard'}
          className={({isActive}) =>
            cn(
              'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-button px-1 py-1 text-center text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isActive && 'font-semibold text-primary',
            )
          }
        />
      ))}
      <AccountButton />
    </nav>
  );
}

function AccountButton() {
  const {user} = useAuth();
  const hasUnreadNotif = !!user?.unread_notifications_count;

  return (
    <NavbarAuthMenu>
      <Dropdown.Trigger className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-button px-1 py-1 text-center text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <PersonIcon size="md" />
        {hasUnreadNotif ? (
          <Badge className="-top-1.5" right="right-1">
            {user?.unread_notifications_count}
          </Badge>
        ) : null}
        <Trans message="Account" />
      </Dropdown.Trigger>
    </NavbarAuthMenu>
  );
}
