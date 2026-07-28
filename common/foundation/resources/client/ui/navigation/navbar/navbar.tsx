import {useAuth} from '@common/auth/use-auth';
import {UnstyledCustomMenuItem} from '@common/menus/custom-menu';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {NotificationsDialog} from '@common/notifications/notifications-dialog';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {NavbarAuthButtons} from '@common/ui/navigation/navbar/navbar-auth-buttons';
import {
  NavbarAuthUser,
  NavbarAuthUserProps,
} from '@common/ui/navigation/navbar/navbar-auth-user';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {MenuIcon} from 'lucide-react';
import {ComponentProps} from 'react';
import {Link} from 'react-router';

function Root({children, className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex h-16 items-center gap-2 bg-background px-3 py-2 md:gap-5 md:px-5 dark:bg-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function NavbarLogo({className, ...props}: ComponentProps<typeof Logo>) {
  return (
    <Logo
      className={cn('h-full max-h-6.5 md:max-h-9.5', className)}
      {...props}
    />
  );
}

function NavbarContent({children, className, ...props}: ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
}

function NavbarAuthContent({
  menuItems,
  className,
}: {
  menuItems?: NavbarAuthUserProps['items'];
  className?: string;
}) {
  const isMobile = useIsMobileMediaQuery();
  const {notifications} = useSettings();
  const {isLoggedIn} = useAuth();
  const showNotifButton = isLoggedIn && notifications?.integrated;
  return (
    <NavbarContent className={cn(className, 'gap-3')}>
      {showNotifButton && <NotificationsDialog />}
      {isLoggedIn ? (
        <NavbarAuthUser
          variant={isMobile ? 'compact' : 'wide'}
          items={menuItems}
        />
      ) : (
        <NavbarAuthButtons />
      )}
    </NavbarContent>
  );
}

function NavbarMenu({
  position,
  className,
}: {
  position: string;
  className?: string;
}) {
  const menuConfig = useCustomMenu(position);

  if (!menuConfig) return null;

  return (
    <div className={className}>
      <div className="mx-4 hidden items-center gap-4 text-sm text-muted-foreground md:flex">
        {menuConfig?.items.map(item => (
          <UnstyledCustomMenuItem
            key={item.id}
            item={item}
            className={({isActive}) =>
              cn(
                'hover:text-foreground hover:underline',
                isActive && 'text-foreground',
              )
            }
          />
        ))}
      </div>
      <Dropdown.Root>
        <Dropdown.Trigger
          render={<Button variant="ghost" size="icon" />}
          className="md:hidden"
        >
          <MenuIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          {menuConfig.items.map(item => (
            <Dropdown.LinkItem key={item.id} render={<Link to={item.action} />}>
              <Trans message={item.label} />
            </Dropdown.LinkItem>
          ))}
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}

export const Navbar = Object.assign(Root, {
  Root,
  Logo: NavbarLogo,
  Menu: NavbarMenu,
  Content: NavbarContent,
  AuthContent: NavbarAuthContent,
});
