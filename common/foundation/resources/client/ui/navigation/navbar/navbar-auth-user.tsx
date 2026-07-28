import {useAuth} from '@common/auth/use-auth';
import {NotificationsTriggerBadge} from '@common/notifications/notifications-dialog';
import {NavbarAuthMenu} from '@common/ui/navigation/navbar/navbar-auth-menu';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {ListboxItemProps} from '@ui/forms/listbox/item';
import {ChevronDownIcon} from 'lucide-react';
import {ReactElement} from 'react';

export interface NavbarAuthUserProps {
  items?: ReactElement<ListboxItemProps>[];
  variant?: 'wide' | 'compact';
}
export function NavbarAuthUser({
  items = [],
  variant = 'wide',
}: NavbarAuthUserProps) {
  const {user} = useAuth();
  if (!user) return null;

  const avatar = (
    <Avatar.Root className="size-7">
      <Avatar.Image src={user.image ?? undefined} />
      <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
    </Avatar.Root>
  );

  const compactButton = (
    <Dropdown.Trigger
      className="relative"
      aria-label="toggle authentication menu"
      render={<Button variant="ghost" color="default" size="icon" />}
    >
      {avatar}
      <NotificationsTriggerBadge />
    </Dropdown.Trigger>
  );
  const wideButton = (
    <Dropdown.Trigger
      className="max-w-46 px-0 hover:bg-transparent data-pressed:bg-transparent"
      render={<Button variant="ghost" color="default" />}
    >
      {avatar}
      <span className="ml-0.5 truncate">{user.name}</span>
      <ChevronDownIcon />
    </Dropdown.Trigger>
  );

  return (
    <NavbarAuthMenu items={items}>
      {variant === 'wide' ? wideButton : compactButton}
    </NavbarAuthMenu>
  );
}
