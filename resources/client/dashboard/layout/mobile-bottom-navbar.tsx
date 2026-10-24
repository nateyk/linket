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

  return (
    <nav
      aria-label={trans(message('Mobile navigation'))}
      // Six DB menu labels (~367px of text) can't fit one line in a 360px
      // bar at any padding, so items let labels wrap instead of clipping:
      // without nowrap + shrink-0, flex floors each item at its
      // min-content (its longest word), turning the old center-clipped
      // stubs ("My Store" -> "Sto", "Home" -> "om") into two readable
      // lines. gap-1 is a floor while justify-between distributes the
      // remainder; items-start keeps the icon row aligned when only some
      // labels take a second line.
      className="flex items-start justify-between gap-1 border-t px-4 py-3"
    >
      {menu.items.map(item => (
        <UnstyledCustomMenuItem
          key={item.id}
          item={item}
          defaultIcons={dashboardSidebarIcons}
          // Mirror the sidebar: only the dashboard root matches exactly, so a
          // nested route (/dashboard/stores/3006) marks one section current
          // instead of also claiming the dashboard home link.
          matchDescendants={action => action === '/dashboard'}
          className={({isActive}) =>
            cn(
              // text-center: once a label wraps, the anonymous text box
              // fills the item, so centered lines are what keeps the copy
              // under its icon instead of hanging left.
              'flex flex-col items-center gap-1.5 overflow-hidden text-center text-xs',
              isActive && 'font-bold',
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
      <Dropdown.Trigger className="relative flex flex-col items-center gap-1.5 overflow-hidden text-center text-xs">
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
