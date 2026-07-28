import {authDropdownIcons} from '@app/auth/auth-dropdown-icons';
import {useLogout} from '@common/auth/requests/use-logout';
import {useAuth} from '@common/auth/use-auth';
import {ColorSchemeContext} from '@common/core/color-scheme-provider';
import {SiteConfigContext} from '@common/core/settings/site-config-context';
import {MenuItemIcon} from '@common/menus/custom-menu';
import {MenuItemConfig} from '@common/menus/menu-config';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {
  BellIcon,
  CircleUserIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react';
import {ComponentProps, ReactElement, use, useContext} from 'react';

interface Props {
  children: ReactElement;
  items?: ReactElement<ComponentProps<typeof Dropdown.Item>>[];
  side?: ComponentProps<typeof Dropdown.Content>['side'];
  align?: ComponentProps<typeof Dropdown.Content>['align'];
  accountSettingsLink?: string;
}
export function NavbarAuthMenu({
  children,
  items,
  side,
  align,
  accountSettingsLink,
}: Props) {
  const {auth} = useContext(SiteConfigContext);
  const logout = useLogout();
  const menu = useCustomMenu('auth-dropdown');
  const {notifications, themes} = useSettings();
  const {user} = useAuth();
  const navigate = useNavigate();
  const {colorScheme, setColorScheme} = use(ColorSchemeContext);
  if (!user) return null;
  const hasUnreadNotif = !!user.unread_notifications_count;

  const notifMenuItem = (
    <Dropdown.Item
      className="md:hidden"
      onClick={() => {
        navigate('/notifications');
      }}
    >
      <BellIcon />
      <Trans message="Notifications" />
      {hasUnreadNotif ? ` (${user.unread_notifications_count})` : undefined}
    </Dropdown.Item>
  );

  const handleItemClick = (item: MenuItemConfig) => {
    let action = item.action ?? '';

    if (action === '/account-settings' && accountSettingsLink) {
      action = accountSettingsLink;
    }

    if (item.type === 'link') {
      window.open(action, '_blank');
    } else {
      navigate(action);
    }
  };

  return (
    <Dropdown.Root>
      {children}
      <Dropdown.Content side={side} align={align}>
        {menu &&
          menu.items.map(item => (
            <Dropdown.Item key={item.id} onClick={() => handleItemClick(item)}>
              <MenuItemIcon item={item} defaultIcons={authDropdownIcons} />
              <Trans message={item.label} />
            </Dropdown.Item>
          ))}
        {auth?.getUserProfileLink && (
          <Dropdown.Item
            onClick={() => {
              navigate(encodeURI(auth.getUserProfileLink!(user)));
            }}
          >
            <CircleUserIcon />
            <Trans message="Profile page" />
          </Dropdown.Item>
        )}
        {items}
        {notifications?.integrated ? notifMenuItem : undefined}
        {themes?.user_change && (
          <Dropdown.Item
            onClick={() => {
              setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
            }}
          >
            {colorScheme === 'light' ? <MoonIcon /> : <SunIcon />}
            {colorScheme === 'light' ? (
              <Trans message="Dark mode" />
            ) : (
              <Trans message="Light mode" />
            )}
          </Dropdown.Item>
        )}

        <Dropdown.Item
          onClick={() => {
            logout.mutate();
          }}
        >
          <LogOutIcon />
          <Trans message="Log out" />
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
