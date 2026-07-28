import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import preview from '@storybook/preview';
import {CheckIcon, PlusIcon, SettingsIcon, UserIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Avatar',
  component: Avatar.Root,
  tags: ['autodocs'],
});

const images = [
  'https://github.com/shadcn.png',
  'https://github.com/maxleiter.png',
  'https://github.com/evilrabbit.png',
] as const;

export const Demo = meta.story({
  render: () => (
    <div className="flex h-72 items-center gap-10">
      <Avatar.Root>
        <Avatar.Image src={images[0]} alt="@shadcn" />
        <Avatar.Fallback>CN</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root>
        <Avatar.Fallback>CN</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root>
        <Avatar.Image src={images[2]} alt="@vercel" />
        <Avatar.Fallback>VC</Avatar.Fallback>
        <Avatar.Badge />
      </Avatar.Root>
      <Avatar.Group>
        <Avatar.Root>
          <Avatar.Image src={images[0]} alt="@shadcn" />
          <Avatar.Fallback>CN</Avatar.Fallback>
        </Avatar.Root>
        <Avatar.Root>
          <Avatar.Image src={images[1]} alt="@shadcn" />
          <Avatar.Fallback>CN</Avatar.Fallback>
        </Avatar.Root>
        <Avatar.Root>
          <Avatar.Image src={images[2]} alt="@vercel" />
          <Avatar.Fallback>VC</Avatar.Fallback>
        </Avatar.Root>
        <Avatar.GroupCount>+2</Avatar.GroupCount>
      </Avatar.Group>
    </div>
  ),
});

export const Basic = meta.story({
  render: () => (
    <Avatar.Root>
      <Avatar.Image src={images[0]} alt="@shadcn" />
      <Avatar.Fallback>CN</Avatar.Fallback>
    </Avatar.Root>
  ),
});

export const Badge = meta.story({
  render: () => (
    <Avatar.Root>
      <Avatar.Image src={images[0]} alt="@shadcn" />
      <Avatar.Fallback>CN</Avatar.Fallback>
      <Avatar.Badge />
    </Avatar.Root>
  ),
});

export const BadgeWithIcon = meta.story({
  render: () => (
    <Avatar.Root>
      <Avatar.Image src={images[0]} alt="@shadcn" />
      <Avatar.Fallback>CN</Avatar.Fallback>
      <Avatar.Badge className="bg-positive text-primary-foreground">
        <CheckIcon />
      </Avatar.Badge>
    </Avatar.Root>
  ),
});

export const AvatarGroupStory = meta.story({
  name: 'Avatar Group',
  render: () => (
    <Avatar.Group>
      <Avatar.Root>
        <Avatar.Image src={images[0]} alt="@shadcn" />
        <Avatar.Fallback>CN</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root>
        <Avatar.Image src={images[1]} alt="@vercel" />
        <Avatar.Fallback>VC</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root>
        <Avatar.Image src={images[2]} alt="@leerob" />
        <Avatar.Fallback>LR</Avatar.Fallback>
      </Avatar.Root>
    </Avatar.Group>
  ),
});

export const AvatarGroupCountStory = meta.story({
  name: 'Avatar Group Count',
  render: () => (
    <Avatar.Group>
      <Avatar.Root>
        <Avatar.Image src={images[0]} alt="@shadcn" />
        <Avatar.Fallback>CN</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root>
        <Avatar.Image src={images[1]} alt="@vercel" />
        <Avatar.Fallback>VC</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.GroupCount>+3</Avatar.GroupCount>
    </Avatar.Group>
  ),
});

export const AvatarGroupWithIcon = meta.story({
  name: 'Avatar Group With Icon',
  render: () => (
    <Avatar.Group>
      <Avatar.Root>
        <Avatar.Image src={images[0]} alt="@shadcn" />
        <Avatar.Fallback>CN</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root>
        <Avatar.Image src={images[1]} alt="@vercel" />
        <Avatar.Fallback>VC</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.GroupCount>
        <PlusIcon />
      </Avatar.GroupCount>
    </Avatar.Group>
  ),
});

export const Sizes = meta.story({
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar.Root size="sm">
        <Avatar.Image src={images[0]} alt="@shadcn" />
        <Avatar.Fallback>SM</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root size="default">
        <Avatar.Image src={images[1]} alt="@vercel" />
        <Avatar.Fallback>MD</Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root size="lg">
        <Avatar.Image src={images[2]} alt="@leerob" />
        <Avatar.Fallback>LG</Avatar.Fallback>
      </Avatar.Root>
    </div>
  ),
});

export const DropdownExample = meta.story({
  render: () => (
    <div className="h-72">
      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar.Root className="cursor-pointer">
                <Avatar.Image src={images[0]} alt="@shadcn" />
                <Avatar.Fallback>CN</Avatar.Fallback>
              </Avatar.Root>
            </Button>
          }
          aria-label="Open user menu"
        />
        <Dropdown.Content>
          <Dropdown.Item>
            <UserIcon />
            Profile
          </Dropdown.Item>
          <Dropdown.Item>
            <SettingsIcon />
            Settings
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  ),
});

export const RTL = meta.story({
  render: () => (
    <div dir="rtl" className="h-72">
      <div className="flex items-center gap-4">
        <Avatar.Root>
          <Avatar.Image src={images[0]} alt="@shadcn" />
          <Avatar.Fallback>CN</Avatar.Fallback>
          <Avatar.Badge />
        </Avatar.Root>
        <Avatar.Group>
          <Avatar.Root size="lg">
            <Avatar.Image src={images[1]} alt="@vercel" />
            <Avatar.Fallback>VC</Avatar.Fallback>
          </Avatar.Root>
          <Avatar.Root size="lg">
            <Avatar.Image src={images[2]} alt="@leerob" />
            <Avatar.Fallback>LR</Avatar.Fallback>
          </Avatar.Root>
          <Avatar.GroupCount>+2</Avatar.GroupCount>
        </Avatar.Group>
      </div>
    </div>
  ),
});
