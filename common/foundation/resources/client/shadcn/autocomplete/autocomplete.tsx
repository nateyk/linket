import {Autocomplete as AutocompletePrimitive} from '@base-ui/react/autocomplete';
import {dropdownBaseStyles} from '@shadcn/dropdown/dropdown-base-styles';

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
import {cn} from '@ui/utils/cn';
import {XIcon} from 'lucide-react';

/**
 * An input that suggests options as you type.
 */
function AutocompleteRoot<
  Items extends readonly {
    items: readonly any[];
  }[],
>(props: AutocompletePrimitive.Root.Props<Items[number]['items'][number]>) {
  return <AutocompletePrimitive.Root data-slot="autocomplete" {...props} />;
}

function AutocompleteValue({...props}: AutocompletePrimitive.Value.Props) {
  return <AutocompletePrimitive.Value data-slot="dropdown-value" {...props} />;
}

function AutocompleteTrigger(props: AutocompletePrimitive.Trigger.Props) {
  return (
    <AutocompletePrimitive.Trigger data-slot="dropdown-trigger" {...props} />
  );
}

function AutocompleteClear({
  className,
  ...props
}: AutocompletePrimitive.Clear.Props) {
  return (
    <AutocompletePrimitive.Clear
      data-slot="dropdown-clear"
      render={
        <InputGroupButton variant="ghost" color="default" size="icon-xs" />
      }
      className={className}
      {...props}
    >
      <XIcon className="pointer-events-none text-muted-foreground" />
    </AutocompletePrimitive.Clear>
  );
}

function AutocompleteInput({
  className,
  disabled,
  children,
  showClear = true,
  ...props
}: AutocompletePrimitive.Input.Props & {showClear?: boolean}) {
  return (
    <AutocompletePrimitive.InputGroup
      render={<InputGroup />}
      className={cn('w-auto shrink-0', className)}
    >
      <AutocompletePrimitive.Input
        render={<InputGroupInput bindToHookForm={false} disabled={disabled} />}
        {...props}
      />
      {showClear && (
        <InputGroupAddon align="inline-end">
          <AutocompleteClear disabled={disabled} />
        </InputGroupAddon>
      )}
      {children}
    </AutocompletePrimitive.InputGroup>
  );
}

function AutocompleteContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: AutocompletePrimitive.Popup.Props &
  Pick<
    AutocompletePrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
  >) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <AutocompletePrimitive.Popup
          data-slot="dropdown-content"
          className={cn(dropdownBaseStyles.popup, className)}
          {...props}
        />
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  );
}

function AutocompleteList({
  className,
  ...props
}: AutocompletePrimitive.List.Props) {
  return (
    <ScrollArea className={dropdownBaseStyles.scrollArea}>
      <AutocompletePrimitive.List
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

function AutocompleteRow({
  className,
  ...props
}: AutocompletePrimitive.Row.Props) {
  return (
    <AutocompletePrimitive.Row
      data-slot="dropdown-row"
      className={cn(className)}
      {...props}
    />
  );
}

function AutocompleteItem({
  className,
  ...props
}: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="dropdown-item"
      className={cn(dropdownBaseStyles.item, className)}
      {...props}
    />
  );
}

function AutocompleteGroup({
  className,
  ...props
}: AutocompletePrimitive.Group.Props) {
  return (
    <AutocompletePrimitive.Group
      data-slot="dropdown-group"
      className={className}
      {...props}
    />
  );
}

function AutocompleteGroupLabel({
  className,
  ...props
}: AutocompletePrimitive.GroupLabel.Props) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot="dropdown-group-label"
      className={cn(dropdownBaseStyles.groupLabel, className)}
      {...props}
    />
  );
}

function AutocompleteCollection({
  ...props
}: AutocompletePrimitive.Collection.Props) {
  return (
    <AutocompletePrimitive.Collection
      data-slot="dropdown-collection"
      {...props}
    />
  );
}

function AutocompleteEmpty({
  className,
  ...props
}: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="dropdown-empty"
      className={cn(dropdownBaseStyles.empty, className)}
      {...props}
    />
  );
}

function AutocompleteSeparator({
  className,
  ...props
}: AutocompletePrimitive.Separator.Props) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="dropdown-separator"
      className={cn(dropdownBaseStyles.separator, className)}
      {...props}
    />
  );
}

export const Autocomplete = Object.assign(AutocompleteRoot, {
  Root: AutocompleteRoot,
  Value: AutocompleteValue,
  Trigger: AutocompleteTrigger,
  Clear: AutocompleteClear,
  Input: AutocompleteInput,
  Content: AutocompleteContent,
  List: AutocompleteList,
  Row: AutocompleteRow,
  Item: AutocompleteItem,
  Group: AutocompleteGroup,
  GroupLabel: AutocompleteGroupLabel,
  Collection: AutocompleteCollection,
  Empty: AutocompleteEmpty,
  Separator: AutocompleteSeparator,
});
