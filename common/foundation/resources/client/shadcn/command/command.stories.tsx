import preview from '@storybook/preview';

import {Button} from '@shadcn/button/button';
import {Command} from '@shadcn/command/command';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  SettingsIcon,
  Smile,
  User,
} from 'lucide-react';

const meta = preview.meta({
  title: 'Command',
  component: Command,
  parameters: {
    layout: 'centered',
  },
});

const suggestions = [
  {
    label: <Trans message="Suggestions" />,
    value: 'suggestions',
    items: [
      {
        id: 'calendar',
        content: (
          <>
            <Calendar />
            <span>Calendar</span>
            <Command.Shortcut>⌘S</Command.Shortcut>
          </>
        ),
      },
      {
        id: 'search-emoji',
        content: (
          <>
            <Smile />
            <span>Search Emoji</span>
          </>
        ),
      },
      {
        id: 'calculator',
        content: (
          <>
            <Calculator />
            <span>Calculator</span>
          </>
        ),
      },
    ],
  },
  {
    label: <Trans message="Settings" />,
    value: 'settings',
    items: [
      {
        id: 'profile',
        content: (
          <>
            <User />
            <span>Profile</span>
          </>
        ),
      },
      {
        id: 'billing',
        content: (
          <>
            <CreditCard />
            <span>Billing</span>
          </>
        ),
      },
      {
        id: 'settings',
        content: (
          <>
            <Settings />
            <span>Settings</span>
          </>
        ),
      },
    ],
  },
];

export const CommandDemo = meta.story(() => {
  return (
    <Command.Root className="w-md max-w-md border" items={suggestions}>
      <Command.Input placeholder="Type a command or search..." />
      <Command.Empty>No results found.</Command.Empty>
      <Command.List>
        {group => (
          <Command.Group key={group.value} items={group.items}>
            <Command.GroupLabel>{group.label}</Command.GroupLabel>
            <Command.Collection>
              {item => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onClick={() => {
                    console.log(item);
                  }}
                >
                  {item.content}
                </Command.Item>
              )}
            </Command.Collection>
          </Command.Group>
        )}
      </Command.List>
    </Command.Root>
  );
});

export const ButtonTrigger = meta.story(() => {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open command palette</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Command.DialogContent>
          <Command.Root items={suggestions}>
            <Command.Input placeholder="Type a command or search..." />
            <Command.Empty>No results found.</Command.Empty>
            <Command.List>
              {group => (
                <Command.Group key={group.value} items={group.items}>
                  <Command.GroupLabel>{group.label}</Command.GroupLabel>
                  <Command.Collection>
                    {item => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onClick={() => {
                          console.log(item);
                        }}
                      >
                        {item.content}
                      </Command.Item>
                    )}
                  </Command.Collection>
                </Command.Group>
              )}
            </Command.List>
          </Command.Root>
          <Command.DialogFooter>
            <Button
              className="ml-auto"
              variant="ghost"
              color="default"
              size="icon-sm"
            >
              <SettingsIcon />
            </Button>
          </Command.DialogFooter>
        </Command.DialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
