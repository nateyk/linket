import {ApplyFilterPopoverContent} from '@common/datatable/filters/apply-filter-popover-content';
import {
  FilterListItemProps,
  FilterOperator,
  FilterPopoverContentProps,
  ParsedFilterValue,
} from '@common/datatable/filters/backend-filter';
import {FilterListItemLayout} from '@common/datatable/filters/filter-list/filter-list-item-layout';
import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {ComponentProps, ReactNode, useState} from 'react';

export type SelectFilterItemProps = FilterListItemProps<
  ParsedFilterValue<string>
>;

export type SelectFilterPopoverContentProps = FilterPopoverContentProps<
  ParsedFilterValue<string>
>;

export function SelectFilterItem({
  filter,
  value,
  onApply,
  onRemove,
  isInactive,
}: SelectFilterItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const popover = filter.popoverContent({
    filter,
    value,
    onApply: next => {
      setIsOpen(false);
      onApply(next);
    },
  });

  const option = value
    ? (
        popover.props as ComponentProps<typeof SelectFilterPopoverContent>
      )?.items?.find(o => o.value === value.value)
    : null;

  return (
    <FilterListItemLayout
      isOpen={isOpen}
      label={filter.label}
      setIsOpen={setIsOpen}
      valueLabel={option?.label}
      popoverContent={popover}
      onRemove={onRemove}
      isInactive={isInactive}
    />
  );
}

export function SelectFilterPopoverContent({
  filter,
  placeholder,
  value,
  defaultValue,
  onApply,
  onDismiss,
  items,
}: SelectFilterPopoverContentProps & {
  placeholder: ReactNode;
  items: {label: ReactNode; value: string}[];
}) {
  const [internalValue, setInternalValue] = useState(
    () => value?.value ?? defaultValue?.value ?? items[0]?.value ?? '',
  );

  return (
    <ApplyFilterPopoverContent
      label={filter.label}
      onDismiss={onDismiss}
      onApply={() => {
        onApply({
          value: internalValue,
          operator:
            value?.operator ?? defaultValue?.operator ?? FilterOperator.eq,
        });
      }}
    >
      <Field.Root name="value">
        <Select.Root
          items={items}
          value={internalValue}
          onValueChange={next => setInternalValue(next ?? '')}
        >
          <Select.Trigger className="w-full">
            <Select.Value placeholder={placeholder} />
          </Select.Trigger>
          <Select.Content>
            {items.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </Field.Root>
    </ApplyFilterPopoverContent>
  );
}
