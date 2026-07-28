import {dashboardSidebarIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {useAuth} from '@common/auth/use-auth';
import {UnstyledCustomMenuItem} from '@common/menus/custom-menu';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {NavbarAuthMenu} from '@common/ui/navigation/navbar/navbar-auth-menu';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Badge} from '@ui/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {PersonIcon} from '@ui/icons/material/Person';
import {cn} from '@ui/utils/cn';

export function MobileBottomNavbar() {
  const menu = useCustomMenu('dashboard-mobile');
  if (!menu) return null;

  return (
    <div className="flex items-center justify-between gap-7.5 border-t px-6 py-3">
      {menu.items.map(item => (
        <UnstyledCustomMenuItem
          key={item.id}
          item={item}
          defaultIcons={dashboardSidebarIcons}
          className={({isActive}) =>
            cn(
              'flex flex-col items-center gap-1.5 overflow-hidden text-xs whitespace-nowrap',
              isActive && 'font-bold',
            )
          }
        />
      ))}
      <AccountButton />
    </div>
  );
}

function AccountButton() {
  const {user} = useAuth();
  const hasUnreadNotif = !!user?.unread_notifications_count;

  return (
    <NavbarAuthMenu>
      <Dropdown.Trigger className="relative flex flex-col items-center gap-1.5 overflow-hidden text-xs whitespace-nowrap">
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
