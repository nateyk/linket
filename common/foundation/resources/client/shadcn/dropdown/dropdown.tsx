import {Menu as MenuPrimitive} from '@base-ui/react/menu';

import {dropdownBaseStyles} from '@shadcn/dropdown/dropdown-base-styles';
import {
  ScrollArea,
  ScrollAreaScrollBar,
  ScrollAreaViewport,
} from '@shadcn/scroll-area/scroll-area';
import {cn} from '@ui/utils/cn';
import {CheckIcon, ChevronRightIcon} from 'lucide-react';
import {ComponentProps} from 'react';

/**
 * A list of actions in a dropdown, enhanced with keyboard navigation.
 */
function DropdownRoot({...props}: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownPortal({...props}: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-portal" {...props} />;
}

function DropdownTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-trigger" {...props} />;
}

function DropdownContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  className,
  children,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-content"
          className={cn(
            dropdownBaseStyles.popup,
            'min-w-48 shadow-lg',
            className,
          )}
          {...props}
        >
          <ScrollArea className={dropdownBaseStyles.scrollArea}>
            <ScrollAreaViewport
              data-slot="dropdown-list"
              className={dropdownBaseStyles.list}
            >
              {children}
            </ScrollAreaViewport>
            <ScrollAreaScrollBar
              className={dropdownBaseStyles.customScrollbar}
              onlyShowOnHover
              showTrack
            />
          </ScrollArea>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownGroup({...props}: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-group" {...props} />;
}

function DropdownGroupLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-group-label"
      data-inset={inset}
      className={cn(dropdownBaseStyles.groupLabel, className)}
      {...props}
    />
  );
}

function DropdownItem({
  className,
  inset,
  variant = 'default',
  onClick,
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(dropdownBaseStyles.item, className)}
      onClick={e => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...props}
    />
  );
}

function DropdownLinkItem({
  className,
  inset,
  variant = 'default',
  ...props
}: MenuPrimitive.LinkItem.Props & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(dropdownBaseStyles.item, className)}
      {...props}
    />
  );
}

function DropdownSub({...props}: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-sub" {...props} />;
}

function DropdownSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-sub-trigger"
      data-inset={inset}
      className={cn(
        dropdownBaseStyles.item,
        'data-popup-open:bg-accent data-popup-open:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto rtl:rotate-180" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownSubContent({
  align = 'start',
  alignOffset = -3,
  side = 'inline-end',
  sideOffset = 0,
  className,
  ...props
}: ComponentProps<typeof DropdownContent>) {
  return (
    <DropdownContent
      data-slot="dropdown-sub-content"
      className={cn(dropdownBaseStyles.popup, 'w-auto shadow-2xl', className)}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-checkbox-item"
      data-inset={inset}
      className={cn(dropdownBaseStyles.item, className)}
      checked={checked}
      {...props}
    >
      {children}
      <span className={dropdownBaseStyles.itemIndicatorWrapper}>
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownRadioGroup({...props}: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup data-slot="dropdown-radio-group" {...props} />
  );
}

function DropdownRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-radio-item"
      data-inset={inset}
      className={cn(dropdownBaseStyles.item, className)}
      {...props}
    >
      {children}
      <span className={dropdownBaseStyles.itemIndicatorWrapper}>
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
    </MenuPrimitive.RadioItem>
  );
}

function DropdownSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-separator"
      className={cn(dropdownBaseStyles.separator, className)}
      {...props}
    />
  );
}

function DropdownShortcut({className, ...props}: ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-shortcut"
      className={cn(
        'ms-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

export const Dropdown = Object.assign(DropdownRoot, {
  Root: DropdownRoot,
  Portal: DropdownPortal,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Group: DropdownGroup,
  GroupLabel: DropdownGroupLabel,
  Item: DropdownItem,
  LinkItem: DropdownLinkItem,
  Sub: DropdownSub,
  SubTrigger: DropdownSubTrigger,
  SubContent: DropdownSubContent,
  CheckboxItem: DropdownCheckboxItem,
  RadioGroup: DropdownRadioGroup,
  RadioItem: DropdownRadioItem,
  Separator: DropdownSeparator,
  Shortcut: DropdownShortcut,
});
