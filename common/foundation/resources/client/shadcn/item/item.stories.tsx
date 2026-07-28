import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Item} from '@shadcn/item/item';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';
import {
  BadgeCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  InboxIcon,
  PlusIcon,
  ShieldAlertIcon,
} from 'lucide-react';

const people = [
  {
    username: 'shadcn',
    avatar: 'https://github.com/shadcn.png',
    email: 'shadcn@vercel.com',
  },
  {
    username: 'maxleiter',
    avatar: 'https://github.com/maxleiter.png',
    email: 'maxleiter@vercel.com',
  },
  {
    username: 'evilrabbit',
    avatar: 'https://github.com/evilrabbit.png',
    email: 'evilrabbit@vercel.com',
  },
] as const;

const music = [
  {
    title: 'Midnight City Lights',
    artist: 'Neon Dreams',
    album: 'Electric Nights',
    duration: '3:45',
  },
  {
    title: 'Coffee Shop Conversations',
    artist: 'The Morning Brew',
    album: 'Urban Stories',
    duration: '4:05',
  },
  {
    title: 'Digital Rain',
    artist: 'Cyber Symphony',
    album: 'Binary Beats',
    duration: '3:30',
  },
] as const;

const models = [
  {
    name: 'v0-1.5-sm',
    description: 'Everyday tasks and UI generation.',
    image:
      'https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?q=80&w=640&auto=format&fit=crop',
  },
  {
    name: 'v0-1.5-lg',
    description: 'Advanced thinking or reasoning.',
    image:
      'https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop',
  },
  {
    name: 'v0-2.0-mini',
    description: 'Open source model for everyone at a very low price.',
    image:
      'https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop',
  },
] as const;

const meta = preview.meta({
  title: 'Item',
  component: Item.Root,
  subcomponents: {
    Content: Item.Content,
    Title: Item.Title,
    Description: Item.Description,
    Actions: Item.Actions,
    Media: Item.Media,
    Row: Item.Row,
    Separator: Item.Separator,
    Footer: Item.Footer,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'muted'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'xs'],
    },
  },
});

export const Basic = meta.story({
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Item.Root variant="outline">
        <Item.Content>
          <Item.Title>
            <Trans message="Basic Item" />
          </Item.Title>
          <Item.Description>
            <Trans message="A simple item with title and description." />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <Button variant="outline" color="default" size="sm">
            <Trans message="Action" />
          </Button>
        </Item.Actions>
      </Item.Root>
      <Item.Root variant="outline" size="sm" render={<a href="#" />}>
        <Item.Media variant="icon">
          <BadgeCheckIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Your profile has been verified." />
          </Item.Title>
        </Item.Content>
        <Item.Actions>
          <ChevronRightIcon className="size-4" />
        </Item.Actions>
      </Item.Root>
    </div>
  ),
});

/**
 * Use the `variant` prop to change the visual style of the item.
 */
export const Variant = meta.story({
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Item.Root>
        <Item.Media variant="icon">
          <InboxIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Default Variant" />
          </Item.Title>
          <Item.Description>
            <Trans message="Transparent background with no border." />
          </Item.Description>
        </Item.Content>
      </Item.Root>
      <Item variant="outline">
        <Item.Media variant="icon">
          <InboxIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Outline Variant" />
          </Item.Title>
          <Item.Description>
            <Trans message="Outlined style with a visible border." />
          </Item.Description>
        </Item.Content>
      </Item>
      <Item.Root variant="muted">
        <Item.Media variant="icon">
          <InboxIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Muted Variant" />
          </Item.Title>
          <Item.Description>
            <Trans message="Muted background for secondary content." />
          </Item.Description>
        </Item.Content>
      </Item.Root>
    </div>
  ),
});

/**
 * Use the `size` prop to change the size of the item. Available sizes are `default`, `sm`, and `xs`.
 */
export const Size = meta.story({
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Item.Root variant="outline">
        <Item.Media variant="icon">
          <InboxIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Default Size" />
          </Item.Title>
          <Item.Description>
            <Trans message="The standard size for most use cases." />
          </Item.Description>
        </Item.Content>
      </Item.Root>
      <Item variant="outline" size="sm">
        <Item.Media variant="icon">
          <InboxIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Small Size" />
          </Item.Title>
          <Item.Description>
            <Trans message="A compact size for dense layouts." />
          </Item.Description>
        </Item.Content>
      </Item>
      <Item variant="outline" size="xs">
        <Item.Media variant="icon">
          <InboxIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Extra Small Size Extra Small Size Extra Small SizeExtra Small SizeExtra Small SizeExtra Small SizeExtra Small SizeExtra Small SizeExtra Small Size" />
          </Item.Title>
          <Item.Description>
            <Trans message="The most compact size available." />
          </Item.Description>
        </Item.Content>
      </Item>
    </div>
  ),
});

/**
 * Use `Item.Media` with `variant="icon"` to display an icon.
 */
export const Icon = meta.story({
  render: () => (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Item.Root variant="outline">
        <Item.Media variant="icon">
          <ShieldAlertIcon />
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Security Alert" />
          </Item.Title>
          <Item.Description>
            <Trans message="New login detected from unknown device." />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <Button size="sm" variant="outline">
            <Trans message="Review" />
          </Button>
        </Item.Actions>
      </Item.Root>
    </div>
  ),
});

/**
 * You can use `Item.Media` to display an avatar.
 */
export const AvatarExample = meta.story({
  render: () => (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <Item.Root variant="outline">
        <Item.Media>
          <Avatar.Root className="size-10">
            <Avatar.Image src="https://github.com/evilrabbit.png" />
            <Avatar.Fallback>
              <Trans message="ER" />
            </Avatar.Fallback>
          </Avatar.Root>
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="Evil Rabbit" />
          </Item.Title>
          <Item.Description>
            <Trans message="Last seen 5 months ago" />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-full"
            aria-label="Invite"
          >
            <PlusIcon className="size-4" />
          </Button>
        </Item.Actions>
      </Item.Root>
      <Item variant="outline">
        <Item.Media>
          <div className="flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:grayscale">
            <Avatar.Root className="hidden sm:flex">
              <Avatar.Image src="https://github.com/shadcn.png" alt="@shadcn" />
              <Avatar.Fallback>
                <Trans message="CN" />
              </Avatar.Fallback>
            </Avatar.Root>
            <Avatar.Root className="hidden sm:flex">
              <Avatar.Image
                src="https://github.com/maxleiter.png"
                alt="@maxleiter"
              />
              <Avatar.Fallback>
                <Trans message="LR" />
              </Avatar.Fallback>
            </Avatar.Root>
            <Avatar.Root>
              <Avatar.Image
                src="https://github.com/evilrabbit.png"
                alt="@evilrabbit"
              />
              <Avatar.Fallback>
                <Trans message="ER" />
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        </Item.Media>
        <Item.Content>
          <Item.Title>
            <Trans message="No Team Members" />
          </Item.Title>
          <Item.Description>
            <Trans message="Invite your team to collaborate on this project." />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <Button size="sm" variant="outline">
            <Trans message="Invite" />
          </Button>
        </Item.Actions>
      </Item>
    </div>
  ),
});

/**
 * Use `Item.Media` with `variant="image"` to display an image.
 */
export const Image = meta.story({
  render: () => {
    const sizeMap: any = {
      0: 'default',
      1: 'sm',
      2: 'xs',
    };
    return (
      <div className="flex w-full max-w-md flex-col gap-6">
        <Item.Group className="gap-4">
          {music.map((song, index) => (
            <Item.Root
              key={song.title}
              variant="outline"
              size={sizeMap[index]}
              render={<a href="#" />}
              role="listitem"
            >
              <Item.Media variant="image">
                <img
                  src={`https://avatar.vercel.sh/${song.title}`}
                  alt={song.title}
                  className="size-full object-cover grayscale"
                />
              </Item.Media>
              <Item.Content>
                <Item.Title className="line-clamp-1">
                  <Trans message={song.title} /> -{' '}
                  <span className="text-muted-foreground">
                    <Trans message={song.album} />
                  </span>
                </Item.Title>
                <Item.Description>
                  <Trans message={song.artist} />
                </Item.Description>
              </Item.Content>
              <Item.Content className="flex-none text-center">
                <Item.Description>
                  <Trans message={song.duration} />
                </Item.Description>
              </Item.Content>
            </Item.Root>
          ))}
        </Item.Group>
      </div>
    );
  },
});

/**
 * Use `Item.Group` to group related items together.
 */
export const Group = meta.story({
  render: () => (
    <Item.Group className="max-w-sm">
      {people.map(person => (
        <Item.Root key={person.username} variant="outline">
          <Item.Media>
            <Avatar.Root>
              <Avatar.Image src={person.avatar} className="grayscale" />
              <Avatar.Fallback>{person.username.charAt(0)}</Avatar.Fallback>
            </Avatar.Root>
          </Item.Media>
          <Item.Content className="gap-1">
            <Item.Title>{person.username}</Item.Title>
            <Item.Description>{person.email}</Item.Description>
          </Item.Content>
          <Item.Actions>
            <Button variant="ghost" size="icon" className="rounded-full">
              <PlusIcon />
            </Button>
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  ),
});

/**
 * Use `Item.Header` to add a header above the item content.
 */
export const Header = meta.story({
  render: () => (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <Item.Group className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {models.map(model => (
          <Item.Root key={model.name} variant="outline">
            <Item.Header>
              <img
                src={model.image}
                alt={model.name}
                className="aspect-square w-full rounded-md object-cover"
              />
            </Item.Header>
            <Item.Content>
              <Item.Title>
                <Trans message={model.name} />
              </Item.Title>
              <Item.Description>
                <Trans message={model.description} />
              </Item.Description>
            </Item.Content>
          </Item.Root>
        ))}
      </Item.Group>
    </div>
  ),
});

/**
 * Use `Item.Row` only when the title needs to sit side by side with an icon or button. `Item.Row` will encure proper text truncation.
 */
export const Row = meta.story({
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Item.Root variant="outline">
        <Item.Content>
          <Item.Row>
            <Item.Title>
              <Trans message="Verified workspace" />
            </Item.Title>
            <BadgeCheckIcon className="size-4 text-primary" />
          </Item.Row>
          <Item.Description>
            <Trans message="This workspace has completed all security checks." />
          </Item.Description>
        </Item.Content>
      </Item.Root>
    </div>
  ),
});

/**
 * Use the `render` prop to render the item as a link. The hover and focus states will be applied to the anchor element.
 */
export const Link = meta.story({
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Item.Root render={<a href="#" />}>
        <Item.Content>
          <Item.Title>
            <Trans message="Visit our documentation" />
          </Item.Title>
          <Item.Description>
            <Trans message="Learn how to get started with our components." />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <ChevronRightIcon className="size-4" />
        </Item.Actions>
      </Item.Root>
      <Item.Root
        variant="outline"
        render={<a href="#" target="_blank" rel="noopener noreferrer" />}
      >
        <Item.Content>
          <Item.Title>
            <Trans message="External resource" />
          </Item.Title>
          <Item.Description>
            <Trans message="Opens in a new tab with security attributes." />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <ExternalLinkIcon className="size-4" />
        </Item.Actions>
      </Item.Root>
    </div>
  ),
});

/**
 * Use `Item` within a `Dropdown`, `Select`, `Combobox`, `Autocomplete`, or `Command` components to display rich content.
 */
export const DropdownExample = meta.story({
  render: () => (
    <Dropdown.Root>
      <Dropdown.Trigger render={<Button variant="outline" />}>
        <Trans message="Select" />
        <ChevronDownIcon className="size-4" />
      </Dropdown.Trigger>
      <Dropdown.Content className="w-64" align="end">
        <Dropdown.Group>
          {people.map(person => (
            <Dropdown.Item key={person.username}>
              <Item.Root size="xs" className="w-full p-2">
                <Item.Media>
                  <Avatar.Root className="size-6.5">
                    <Avatar.Image src={person.avatar} className="grayscale" />
                    <Avatar.Fallback>
                      <Trans
                        message={person.username.charAt(0).toUpperCase()}
                      />
                    </Avatar.Fallback>
                  </Avatar.Root>
                </Item.Media>
                <Item.Content className="gap-0">
                  <Item.Title>
                    <Trans message={person.username} />
                  </Item.Title>
                  <Item.Description className="leading-none">
                    <Trans message={person.email} />
                  </Item.Description>
                </Item.Content>
              </Item.Root>
            </Dropdown.Item>
          ))}
        </Dropdown.Group>
      </Dropdown.Content>
    </Dropdown.Root>
  ),
});
