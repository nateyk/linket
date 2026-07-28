import {Select as SelectPrimitive} from '@base-ui/react/select';
import * as React from 'react';

import {dropdownBaseStyles} from '@shadcn/dropdown/dropdown-base-styles';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  ScrollArea,
  ScrollAreaScrollBar,
  ScrollAreaViewport,
} from '@shadcn/scroll-area/scroll-area';
import {cn} from '@ui/utils/cn';
import {CheckIcon, ChevronDownIcon, ChevronUpIcon} from 'lucide-react';
import {useContext} from 'react';
import {mergeRefs} from 'react-merge-refs';

/**
 * A common form component for choosing a predefined value in a dropdown menu.
 */
function SelectRoot<Value, Multiple extends boolean | undefined = false>({
  name,
  value,
  onValueChange,
  inputRef,
  disabled,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnChange: SelectPrimitive.Root.Props<
    Value,
    Multiple
  >['onValueChange'] = (value, eventDetails) => {
    onValueChange?.(value, eventDetails);
    hookFieldCtx?.onChange(value);
  };
  // if is bound to hook form, make sure it's always controlled by defaulting to null
  const mergedValue = hookFieldCtx ? (hookFieldCtx.value ?? null) : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  const mergedRef = mergeRefs([hookFieldCtx?.ref, inputRef]);

  return (
    <SelectPrimitive.Root
      name={name}
      value={mergedValue}
      onValueChange={mergedOnChange}
      inputRef={mergedRef}
      disabled={mergedDisabled}
      {...props}
    />
  );
}

function SelectGroup({className, ...props}: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="dropdown-group"
      className={cn('scroll-my-1', className)}
      {...props}
    />
  );
}

function SelectValue({className, ...props}: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="dropdown-value"
      className={cn('flex flex-1 text-start', className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  children,
  onBlur,
  ...props
}: SelectPrimitive.Trigger.Props) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnBlur: SelectPrimitive.Trigger.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };
  return (
    <SelectPrimitive.Trigger
      data-slot="dropdown-trigger"
      className={cn(
        "flex h-9 w-fit items-center justify-between gap-1.5 rounded-input border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-colors hover:border-foreground/20 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-destructive data-placeholder:text-muted-foreground *:data-[slot=dropdown-value]:line-clamp-1 *:data-[slot=dropdown-value]:flex *:data-[slot=dropdown-value]:items-center *:data-[slot=dropdown-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      onBlur={mergedOnBlur}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={false}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="dropdown-content"
          className={cn(
            dropdownBaseStyles.popup,
            'min-w-36 shadow-2xl',
            className,
          )}
          {...props}
        >
          <ScrollArea className={dropdownBaseStyles.scrollArea}>
            <SelectPrimitive.List
              render={<ScrollAreaViewport />}
              data-slot="dropdown-list"
              className={dropdownBaseStyles.list}
            >
              {children}
            </SelectPrimitive.List>
            <ScrollAreaScrollBar
              className={dropdownBaseStyles.customScrollbar}
              onlyShowOnHover
              showTrack
            />
          </ScrollArea>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectGroupLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="dropdown-group-label"
      className={cn(dropdownBaseStyles.groupLabel, className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="dropdown-item"
      className={cn(dropdownBaseStyles.item, className)}
      {...props}
    >
      {children}
      <span className={dropdownBaseStyles.itemIndicatorWrapper}>
        <SelectPrimitive.ItemIndicator>
          <CheckIcon />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="dropdown-separator"
      className={cn(dropdownBaseStyles.separator, className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="dropdown-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="dropdown-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export const Select = Object.assign(SelectRoot, {
  Root: SelectRoot,
  Group: SelectGroup,
  Value: SelectValue,
  Trigger: SelectTrigger,
  Content: SelectContent,
  GroupLabel: SelectGroupLabel,
  Item: SelectItem,
  Separator: SelectSeparator,
  ScrollUpButton: SelectScrollUpButton,
  ScrollDownButton: SelectScrollDownButton,
});
