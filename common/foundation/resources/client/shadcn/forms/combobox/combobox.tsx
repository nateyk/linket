import {Combobox as ComboboxPrimitive} from '@base-ui/react';
import * as React from 'react';

import {Button} from '@shadcn/button/button';
import {dropdownBaseStyles} from '@shadcn/dropdown/dropdown-base-styles';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {
  ScrollArea,
  ScrollAreaScrollBar,
  ScrollAreaViewport,
} from '@shadcn/scroll-area/scroll-area';
import {Spinner} from '@shadcn/spinner/spinner';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon, ChevronDownIcon, XIcon} from 'lucide-react';
import {use} from 'react';
import {mergeRefs} from 'react-merge-refs';

/**
 * An input combined with a list of predefined items to select.
 */
function ComboboxRoot<Value, Multiple extends boolean | undefined = false>({
  onValueChange,
  value,
  disabled,
  bindToHookForm = true,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple> & {bindToHookForm?: boolean}) {
  const hookFieldCtx = bindToHookForm ? use(HookForm.FieldContext) : null;
  const mergedOnChange: ComboboxPrimitive.Root.Props<
    Value,
    Multiple
  >['onValueChange'] = (e, details) => {
    onValueChange?.(e, details);
    hookFieldCtx?.onChange(e);
  };
  const mergedValue = hookFieldCtx ? hookFieldCtx.value : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  return (
    <ComboboxPrimitive.Root
      data-slot="combobox"
      value={mergedValue}
      onValueChange={mergedOnChange}
      disabled={mergedDisabled}
      {...props}
    />
  );
}

function ComboboxValue({...props}: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="dropdown-value" {...props} />;
}

function ComboboxTrigger(props: ComboboxPrimitive.Trigger.Props) {
  return <ComboboxPrimitive.Trigger data-slot="dropdown-trigger" {...props} />;
}

function ComboboxClear({className, ...props}: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="dropdown-clear"
      render={
        <InputGroupButton variant="ghost" color="default" size="icon-xs" />
      }
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none text-muted-foreground" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  onBlur,
  ref,
  disabled = false,
  showTrigger = true,
  isLoading = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean;
  isLoading?: boolean;
}) {
  const hookFieldCtx = use(HookForm.FieldContext);
  const mergedRef = hookFieldCtx ? mergeRefs([hookFieldCtx.ref, ref]) : ref;
  const mergedOnBlur: ComboboxPrimitive.Input.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };

  return (
    <ComboboxPrimitive.InputGroup
      render={<InputGroup />}
      className={cn('w-auto shrink-0', className)}
    >
      <ComboboxPrimitive.Input
        render={<InputGroupInput bindToHookForm={false} disabled={disabled} />}
        onBlur={mergedOnBlur}
        ref={mergedRef}
        {...props}
      />
      {showTrigger && !isLoading && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=dropdown-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          >
            <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
          </InputGroupButton>
          <ComboboxClear disabled={disabled} />
        </InputGroupAddon>
      )}
      {isLoading && (
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      )}
      {children}
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxInsetInput({
  className,
  children,
  placeholder,
  isLoading = false,
  ...props
}: ComboboxPrimitive.Input.Props & {isLoading?: boolean}) {
  const {trans} = useTrans();
  const defaultPlaceholder = trans({message: 'Search...'});
  return (
    <ComboboxPrimitive.InputGroup
      render={<InputGroup />}
      className={cn('h-8 w-auto shrink-0', className)}
    >
      <ComboboxPrimitive.Input
        render={<InputGroupInput bindToHookForm={false} />}
        placeholder={placeholder ?? defaultPlaceholder}
        {...props}
      />
      {isLoading && (
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      )}
      {children}
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxButtonTrigger({
  placeholder,
  ref,
  onBlur,
  children,
  ...props
}: Omit<ComboboxPrimitive.Trigger.Props, 'children'> &
  ComboboxPrimitive.Value.Props) {
  const hookFieldCtx = use(HookForm.FieldContext);
  const mergedRef = hookFieldCtx ? mergeRefs([hookFieldCtx.ref, ref]) : ref;
  const mergedOnBlur: ComboboxPrimitive.Trigger.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };

  return (
    <ComboboxTrigger
      className="justify-start rounded-input font-normal shadow-none hover:bg-transparent data-placeholder:text-muted-foreground data-pressed:bg-transparent"
      render={<Button variant="outline" />}
      onBlur={mergedOnBlur}
      ref={mergedRef}
      {...props}
    >
      <ComboboxValue placeholder={placeholder}>{children}</ComboboxValue>
      <ChevronDownIcon className="ml-auto text-muted-foreground" />
    </ComboboxTrigger>
  );
}

function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="dropdown-content"
          className={cn(
            dropdownBaseStyles.popup,
            'max-h-(--available-height)',
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({className, ...props}: ComboboxPrimitive.List.Props) {
  return (
    <ScrollArea className={dropdownBaseStyles.scrollArea}>
      <ComboboxPrimitive.List
        render={<ScrollAreaViewport />}
        data-slot="dropdown-list"
        className={cn(dropdownBaseStyles.list, className)}
        {...props}
      />
      <ScrollAreaScrollBar
        className={dropdownBaseStyles.customScrollbar}
        onlyShowOnHover
        showTrack
      />
    </ScrollArea>
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="dropdown-item"
      className={cn(dropdownBaseStyles.item, className)}
      {...props}
    >
      {children}
      <span className={dropdownBaseStyles.itemIndicatorWrapper}>
        <ComboboxPrimitive.ItemIndicator>
          <CheckIcon />
        </ComboboxPrimitive.ItemIndicator>
      </span>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({className, ...props}: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="dropdown-group"
      className={className}
      {...props}
    />
  );
}

function ComboboxGroupLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="dropdown-group-label"
      className={cn(dropdownBaseStyles.groupLabel, className)}
      {...props}
    />
  );
}

function ComboboxCollection({...props}: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="dropdown-collection" {...props} />
  );
}

function ComboboxEmpty({className, ...props}: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="dropdown-empty"
      className={cn(dropdownBaseStyles.empty, className)}
      {...props}
    />
  );
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="dropdown-separator"
      className={cn(dropdownBaseStyles.separator, className)}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.InputGroup>
      <ComboboxPrimitive.Chips
        data-slot="dropdown-chips"
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-input border border-input bg-transparent bg-clip-padding px-3 py-1.5 text-sm transition-[color,box-shadow,background-color] focus-within:border-transparent focus-within:outline-2 focus-within:outline-solid has-aria-invalid:border-destructive has-aria-invalid:outline-destructive has-aria-invalid:focus-within:outline-1 has-data-[slot=dropdown-chip]:px-1.5 dark:bg-input/30',
          className,
        )}
        {...props}
      />
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="dropdown-chip"
      className={cn(
        'flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-md bg-secondary px-2 text-xs font-medium whitespace-nowrap text-secondary-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=dropdown-chip-remove]:pe-0 dark:bg-input/60',
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" color="default" size="icon-xs" />}
          className="-ms-1 opacity-50 hover:opacity-100"
          data-slot="dropdown-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="dropdown-chip-input"
      className={cn('min-w-16 flex-1 outline-none', className)}
      {...props}
    />
  );
}

const useFilteredItems = ComboboxPrimitive.useFilteredItems;

const Combobox = Object.assign(ComboboxRoot, {
  Root: ComboboxRoot,
  Value: ComboboxValue,
  Trigger: ComboboxTrigger,
  Clear: ComboboxClear,
  Input: ComboboxInput,
  InsetInput: ComboboxInsetInput,
  ButtonTrigger: ComboboxButtonTrigger,
  Content: ComboboxContent,
  List: ComboboxList,
  Item: ComboboxItem,
  Group: ComboboxGroup,
  GroupLabel: ComboboxGroupLabel,
  Collection: ComboboxCollection,
  Empty: ComboboxEmpty,
  Separator: ComboboxSeparator,
  Chips: ComboboxChips,
  Chip: ComboboxChip,
  ChipsInput: ComboboxChipsInput,
  useFilteredItems,
});

declare namespace Combobox {
  export type GenericItem = {value: string | number; label: React.ReactNode};
}

export {Combobox};
