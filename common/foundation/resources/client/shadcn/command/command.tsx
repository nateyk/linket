import * as React from 'react';

import {Autocomplete} from '@shadcn/autocomplete/autocomplete';
import {Dialog} from '@shadcn/dialog/dialog';
import {InputGroupAddon} from '@shadcn/forms/input-group/input-group';
import {Kbd} from '@shadcn/kbd';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon, SearchIcon} from 'lucide-react';
import {ComponentProps, ReactNode} from 'react';

function CommandRoot({
  className,
  children,
  inline = true,
  ...props
}: ComponentProps<typeof Autocomplete.Root> & {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Autocomplete.Root
      inline={inline}
      open
      autoHighlight="always"
      keepHighlight
      {...props}
    >
      <div
        data-slot="command"
        className={cn(
          'flex size-full flex-col overflow-hidden bg-popover text-popover-foreground',
          className,
        )}
      >
        {children}
      </div>
    </Autocomplete.Root>
  );
}

function CommandDialogContent({
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Dialog.Content>, 'showCloseButton'> & {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Content
      showCloseButton={false}
      className={cn(
        'gap-0 overflow-hidden p-0 *:data-[slot=command]:p-1.5',
        className,
      )}
      {...props}
    >
      {children}
    </Dialog.Content>
  );
}

function CommandDialogFooter({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t px-4 py-3 text-xs text-muted-foreground has-data-[slot=button]:py-1.5',
        className,
      )}
      {...props}
    >
      <div className="mr-3 flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        <Trans message="to navigate" />
      </div>
      <div className="mr-3 flex items-center gap-1">
        <Kbd>⏎</Kbd>
        <Trans message="to select" />
      </div>
      <div className="flex items-center gap-1">
        <Kbd>esc</Kbd>
        <Trans message="to close" />
      </div>
      {children}
    </div>
  );
}

function CommandInput({
  className,
  ...props
}: ComponentProps<typeof Autocomplete.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1">
      <Autocomplete.Input className={cn('outline-none', className)} {...props}>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </Autocomplete.Input>
    </div>
  );
}

function CommandList({
  className,
  ...props
}: ComponentProps<typeof Autocomplete.List>) {
  return (
    <Autocomplete.List
      className={cn('max-h-80 overflow-x-hidden p-0 px-0.5', className)}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: ComponentProps<typeof Autocomplete.Empty>) {
  return <Autocomplete.Empty className={cn('py-6', className)} {...props} />;
}

function CommandGroup(props: ComponentProps<typeof Autocomplete.Group>) {
  return <Autocomplete.Group {...props} />;
}

function CommandGroupLabel(
  props: ComponentProps<typeof Autocomplete.GroupLabel>,
) {
  return <Autocomplete.GroupLabel {...props} />;
}

function CommandCollection(
  props: ComponentProps<typeof Autocomplete.Collection>,
) {
  return <Autocomplete.Collection {...props} />;
}

function CommandSeparator({
  ...props
}: ComponentProps<typeof Autocomplete.Separator>) {
  return <Autocomplete.Separator {...props} />;
}

type CommandItemProps = ComponentProps<typeof Autocomplete.Item> & {
  onSelect?: (value: string) => void;
};

function CommandItem({
  className,
  children,
  onSelect,
  onClick,
  value,
  ...props
}: CommandItemProps) {
  return (
    <Autocomplete.Item
      value={value}
      onClick={event => {
        onClick?.(event);
        if (typeof value === 'string') {
          onSelect?.(value);
        }
      }}
      {...props}
    >
      {children}
      <CheckIcon className="ms-auto opacity-0 group-has-data-[slot=command-shortcut]/dropdown-item:hidden group-data-selected/dropdown-item:opacity-100" />
    </Autocomplete.Item>
  );
}

function CommandShortcut({className, ...props}: ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        'ms-auto text-xs tracking-widest text-muted-foreground group-data-selected/dropdown-item:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

const Command = Object.assign(CommandRoot, {
  Root: CommandRoot,
  DialogContent: CommandDialogContent,
  DialogFooter: CommandDialogFooter,
  Input: CommandInput,
  List: CommandList,
  Empty: CommandEmpty,
  Group: CommandGroup,
  GroupLabel: CommandGroupLabel,
  Collection: CommandCollection,
  Separator: CommandSeparator,
  Item: CommandItem,
  Shortcut: CommandShortcut,
});

export {Command};
