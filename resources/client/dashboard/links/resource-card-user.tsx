import {Avatar} from '@shadcn/avatar/avatar';
import {Item} from '@shadcn/item/item';
import {Popover} from '@shadcn/popover/popover';
import {cn} from '@ui/utils/cn';

export function ResourceCardUser({
  user,
  className,
}: {
  className?: string;
  user: {
    id: number;
    email: string;
    name?: string | null;
    image?: string | null;
  };
}) {
  return (
    <Popover.Root>
      <Popover.Trigger openOnHover>
        <Avatar.Root className={cn('size-4', className)}>
          {user.image && <Avatar.Image src={user.image} />}
          <Avatar.ColorFallback className="text-[10px]">
            {user.name}
          </Avatar.ColorFallback>
        </Avatar.Root>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="p-0">
          <Item.Root size="xs">
            <Item.Media>
              <Avatar.Root size="lg">
                {user.image && <Avatar.Image src={user.image} />}
                <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
              </Avatar.Root>
            </Item.Media>
            <Item.Content>
              {user.name ? (
                <Popover.Title render={<Item.Title />}>
                  {user.name}
                </Popover.Title>
              ) : null}
              <Popover.Description render={<Item.Description />}>
                {user.email}
              </Popover.Description>
            </Item.Content>
          </Item.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
