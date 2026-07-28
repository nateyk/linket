import preview from '@storybook/preview';
import {getCountryList} from '@ui/utils/intl/countries';
import {
  BellIcon,
  ChevronDownIcon,
  CreditCardIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';

import {Button} from '@common/shadcn/button/button';
import {Item} from '@common/shadcn/item/item';
import {Avatar} from '@shadcn/avatar/avatar';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';

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

const meta = preview.meta({
  title: 'Dropdown Menu',
  component: Dropdown.Root,
});

export const Default = meta.story({
  render: () => (
    <div className="flex gap-3">
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button color="primary" />}>
          <Trans message="Minimal" />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item>
            <SettingsIcon />
            <Trans message="Admin area" />
          </Dropdown.Item>
          <Dropdown.Item>
            <UserIcon />
            <Trans message="Account settings" />
          </Dropdown.Item>
          <Dropdown.Item disabled>
            <CreditCardIcon />
            <Trans message="Billing" />
          </Dropdown.Item>
          <Dropdown.Item>
            <MoonIcon />
            <Trans message="Dark mode" />
          </Dropdown.Item>
          <Dropdown.Item>
            <LogOutIcon />
            <Trans message="Log out" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="outline" color="default" />}>
          Open menu
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Group>
            <Dropdown.GroupLabel>My Account</Dropdown.GroupLabel>
            <Dropdown.Item>
              <UserIcon />
              Profile
              <Dropdown.Shortcut>Shift+P</Dropdown.Shortcut>
            </Dropdown.Item>
            <Dropdown.Item>
              <CreditCardIcon />
              Billing
              <Dropdown.Shortcut>Cmd+B</Dropdown.Shortcut>
            </Dropdown.Item>
            <Dropdown.Item>
              <SettingsIcon />
              Settings
              <Dropdown.Shortcut>Cmd+S</Dropdown.Shortcut>
            </Dropdown.Item>
          </Dropdown.Group>
          <Dropdown.Sub>
            <Dropdown.SubTrigger>
              <UsersIcon />
              Team
            </Dropdown.SubTrigger>
            <Dropdown.SubContent>
              <Dropdown.Item>Invite Members</Dropdown.Item>
              <Dropdown.Item>Manage Permissions</Dropdown.Item>
              <Dropdown.Item>Activity Log</Dropdown.Item>
            </Dropdown.SubContent>
          </Dropdown.Sub>
          <Dropdown.Separator />
          <Dropdown.Item variant="destructive">
            <LogOutIcon />
            Log out
            <Dropdown.Shortcut>Shift+Q</Dropdown.Shortcut>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  ),
});

export const WithAvatarAndDescription = meta.story({
  render: () => (
    <div>
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="outline" />}>
          <Trans message="Select" />
          <ChevronDownIcon className="size-4" />
        </Dropdown.Trigger>
        <Dropdown.Content className="w-64" align="end">
          <Dropdown.Group>
            {people.map(person => (
              <Dropdown.Item key={person.username}>
                <Item size="xs" className="w-full">
                  <Item.Media>
                    <Avatar.Root className="size-6.5">
                      <Avatar.Image src={person.avatar} />
                      <Avatar.Fallback>
                        <Trans
                          message={person.username.charAt(0).toUpperCase()}
                        />
                      </Avatar.Fallback>
                    </Avatar.Root>
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>
                      <Trans message={person.username} />
                    </Item.Title>
                    <Item.Description>
                      <Trans message={person.email} />
                    </Item.Description>
                  </Item.Content>
                </Item>
              </Dropdown.Item>
            ))}
          </Dropdown.Group>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  ),
});

/**
 * Use `Dropdown.RadioGroup` for exclusive choices and `Dropdown.CheckboxItem` for multiple choices.
 */
export const WithCheckboxAndRadioItems = meta.story({
  render: function Render() {
    const [showStatusBar, setShowStatusBar] = useState(true);
    const [showNotifications, setShowNotifications] = useState(true);
    const [selectedPosition, setSelectedPosition] = useState('bottom-right');

    return (
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button />}>Preferences</Dropdown.Trigger>
        <Dropdown.Content className="w-56">
          <Dropdown.Group>
            <Dropdown.GroupLabel>Checkbox items</Dropdown.GroupLabel>
            <Dropdown.CheckboxItem
              checked={showStatusBar}
              onCheckedChange={setShowStatusBar}
            >
              Show status bar
            </Dropdown.CheckboxItem>
            <Dropdown.CheckboxItem
              checked={showNotifications}
              onCheckedChange={setShowNotifications}
            >
              <BellIcon />
              Show notifications
            </Dropdown.CheckboxItem>
          </Dropdown.Group>
          <Dropdown.Separator />
          <Dropdown.Group>
            <Dropdown.GroupLabel>Radio group</Dropdown.GroupLabel>
            <Dropdown.RadioGroup
              value={selectedPosition}
              onValueChange={setSelectedPosition}
            >
              <Dropdown.RadioItem value="top-left">Top left</Dropdown.RadioItem>
              <Dropdown.RadioItem value="top-right">
                Top right
              </Dropdown.RadioItem>
              <Dropdown.RadioItem value="bottom-left">
                Bottom left
              </Dropdown.RadioItem>
              <Dropdown.RadioItem value="bottom-right">
                Bottom right
              </Dropdown.RadioItem>
            </Dropdown.RadioGroup>
          </Dropdown.Group>
        </Dropdown.Content>
      </Dropdown.Root>
    );
  },
});

/**
 * Use `Dropdown.Sub` to nest secondary actions.
 */
export const DropdownMenuSubmenu = meta.story(() => {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger render={<Button />}>Open</Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Group>
          <Dropdown.Item>Team</Dropdown.Item>
          <Dropdown.Sub>
            <Dropdown.SubTrigger>Invite users</Dropdown.SubTrigger>
            <Dropdown.Portal>
              <Dropdown.SubContent>
                <Dropdown.Item>Email</Dropdown.Item>
                <Dropdown.Item>Message</Dropdown.Item>
                <Dropdown.Sub>
                  <Dropdown.SubTrigger>More options</Dropdown.SubTrigger>
                  <Dropdown.Portal>
                    <Dropdown.SubContent>
                      <Dropdown.Item>Calendly</Dropdown.Item>
                      <Dropdown.Item>Slack</Dropdown.Item>
                      <Dropdown.Separator />
                      <Dropdown.Item>Webhook</Dropdown.Item>
                    </Dropdown.SubContent>
                  </Dropdown.Portal>
                </Dropdown.Sub>
                <Dropdown.Separator />
                <Dropdown.Item>Advanced...</Dropdown.Item>
              </Dropdown.SubContent>
            </Dropdown.Portal>
          </Dropdown.Sub>
          <Dropdown.Item>
            New Team
            <Dropdown.Shortcut>⌘+T</Dropdown.Shortcut>
          </Dropdown.Item>
        </Dropdown.Group>
      </Dropdown.Content>
    </Dropdown.Root>
  );
});

const countries = getCountryList();

export const Scrollable = meta.story(() => {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger render={<Button />}>Open</Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Sub>
          <Dropdown.SubTrigger>Nested scrollable</Dropdown.SubTrigger>
          <Dropdown.Portal>
            <Dropdown.SubContent>
              {countries.map(country => (
                <Dropdown.Item key={country.code}>{country.name}</Dropdown.Item>
              ))}
            </Dropdown.SubContent>
          </Dropdown.Portal>
        </Dropdown.Sub>
        {countries.map(country => (
          <Dropdown.Item key={country.code}>{country.name}</Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown.Root>
  );
});
