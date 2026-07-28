import {ApplyFilterPopoverContent} from '@common/datatable/filters/apply-filter-popover-content';
import {
  FilterListItemProps,
  FilterOperator,
  FilterPopoverContentProps,
  ParsedFilterValue,
} from '@common/datatable/filters/backend-filter';
import {FilterListItemLayout} from '@common/datatable/filters/filter-list/filter-list-item-layout';
import {FilterOperatorNames} from '@common/datatable/filters/filter-operator-names';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Select} from '@shadcn/forms/select/select';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, useState} from 'react';

export type InputFilterItemProps = FilterListItemProps<
  ParsedFilterValue<string>
>;

export type InputFilterPopoverContentProps =
  FilterPopoverContentProps<ParsedFilterValue>;

export function InputFilterItem({
  filter,
  value,
  onApply,
  onRemove,
  isInactive,
}: InputFilterItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const popover = filter.popoverContent({
    filter,
    value,
    onApply: next => {
      setIsOpen(false);
      onApply(next);
    },
  });

  const popoverProps = popover.props as ComponentProps<
    typeof InputFilterPopoverContent
  >;

  const operatorLabel =
    value && value.operator && value.operator !== FilterOperator.eq ? (
      <Trans {...FilterOperatorNames[value.operator]} />
    ) : null;

  const valueLabel =
    popoverProps.inputType === 'number' ? (
      <FormattedNumber value={value?.value as any} />
    ) : (
      value?.value
    );

  return (
    <FilterListItemLayout
      isOpen={isOpen}
      label={filter.label}
      setIsOpen={setIsOpen}
      valueLabel={
        <>
          {operatorLabel} {valueLabel}
        </>
      }
      popoverContent={popover}
      onRemove={onRemove}
      isInactive={isInactive}
    />
  );
}

type InternalPopoverProps = FilterPopoverContentProps<
  ParsedFilterValue<string>
> & {
  placeholder?: MessageDescriptor;
  inputType?: 'string' | 'number';
  min?: number;
  max?: number;
  operators?: FilterOperator[];
};

export function InputFilterPopoverContent({
  filter,
  value,
  defaultValue,
  operators,
  onApply,
  onDismiss,
  inputType,
  min,
  max,
}: InternalPopoverProps) {
  const [internalValue, setInternalValue] = useState<string>(
    () => value?.value ?? defaultValue?.value ?? '',
  );
  const [internalOperator, setInternalOperator] = useState<FilterOperator>(
    () => value?.operator ?? defaultValue?.operator ?? FilterOperator.eq,
  );

  return (
    <ApplyFilterPopoverContent
      label={filter.label}
      onApply={() => {
        onApply({
          value: internalValue,
          operator: internalOperator,
        });
      }}
      onDismiss={onDismiss}
    >
      {!!operators?.length && (
        <OperatorSelect
          operators={operators}
          value={internalOperator}
          onChange={setInternalOperator}
        />
      )}
      <ValueField
        inputType={inputType}
        min={min}
        max={max}
        value={internalValue}
        onValueChange={setInternalValue}
      />
    </ApplyFilterPopoverContent>
  );
}

function ValueField({
  inputType,
  min,
  max,
  value,
  onValueChange,
}: {
  inputType?: 'string' | 'number';
  min?: number;
  max?: number;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const input =
    inputType === 'number' ? (
      <NumberField
        min={min}
        max={max}
        value={Number(value)}
        onValueChange={next => `${next}`}
        required
      >
        <NumberFieldDecrement aria-label="Decrease value" />
        <NumberFieldInput />
        <NumberFieldIncrement aria-label="Increase value" />
      </NumberField>
    ) : (
      <Input
        value={value}
        onValueChange={onValueChange}
        required
        type={inputType}
        minLength={min}
        maxLength={max}
      />
    );

  return (
    <Field.Root name="value" className="flex flex-col gap-2">
      {input}
      <Field.Error />
    </Field.Root>
  );
}

function OperatorSelect({
  operators,
  value,
  onChange,
}: {
  value: FilterOperator;
  onChange: (value: FilterOperator) => void;
  operators: FilterOperator[];
}) {
  const items = operators?.map(operator => ({
    label: <Trans {...FilterOperatorNames[operator]} />,
    value: operator,
  }));
  return (
    <Field.Root name="operator">
      <Select.Root
        required
        items={items}
        value={value}
        onValueChange={next => onChange(next as FilterOperator)}
      >
        <Select.Trigger className="w-full">
          <Select.Value placeholder={<Trans message="Select an operator" />} />
        </Select.Trigger>
        <Select.Content>
          {items?.map(item => (
            <Select.Item key={item.value} value={item.value}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </Field.Root>
  );
}
