import {ApplyFilterPopoverContent} from '@common/datatable/filters/apply-filter-popover-content';
import {
  FilterListItemProps,
  FilterOperator,
  FilterPopoverContentProps,
  ParsedFilterValue,
} from '@common/datatable/filters/backend-filter';
import {FilterListItemLayout} from '@common/datatable/filters/filter-list/filter-list-item-layout';
import {DateValue} from '@internationalized/date';
import {DateRangePicker} from '@ui/forms/input-field/date/date-range-picker/date-range-picker';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {
  DateRangePreset,
  DateRangePresets,
} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {
  AbsoluteDateRange,
  absoluteRangeToDateRange,
  dateRangeToAbsoluteRange,
} from '@ui/forms/input-field/date/date-range-picker/form-date-range-picker';
import {FormattedDateTimeRange} from '@ui/i18n/formatted-date-time-range';
import {useState} from 'react';

type ParsedDateRangeValue = {
  start?: ParsedFilterValue<string>;
  end?: ParsedFilterValue<string>;
};

export type DateRangeFilterItemProps =
  FilterListItemProps<ParsedDateRangeValue>;

export type DateRangeFilterPopoverContentProps =
  FilterPopoverContentProps<ParsedDateRangeValue>;

export function DateRangeFilterItem({
  filter,
  value,
  onApply,
  onRemove,
  isInactive,
}: DateRangeFilterItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const popover = filter.popoverContent({
    filter,
    value,
    onApply: next => {
      setIsOpen(false);
      onApply(next);
    },
  });

  const startDate = value?.start?.value ?? '';
  const endDate = value?.end?.value ?? '';

  const valueLabel = (
    <FormattedDateTimeRange
      start={startDate}
      end={endDate}
      options={{dateStyle: 'medium'}}
    />
  );

  return (
    <FilterListItemLayout
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      label={filter.label}
      valueLabel={valueLabel}
      onRemove={onRemove}
      isInactive={isInactive}
      popoverContent={popover}
    />
  );
}

export function DateRangeFilterPopoverContent({
  filter,
  value,
  defaultValue: propsDefaultValue,
  onDismiss,
  min,
  max,
  onApply,
}: DateRangeFilterPopoverContentProps & {
  min?: DateValue;
  max?: DateValue;
  defaultValue?: ParsedDateRangeValue;
}) {
  const defaultValue = propsDefaultValue ?? dateRangeFilterThisWeekValue;
  const [internalValue, setInternalValue] = useState<Partial<DateRangeValue>>(
    () =>
      absoluteRangeToDateRange({
        start: value?.start?.value ?? defaultValue?.start?.value,
        end: value?.end?.value ?? defaultValue?.end?.value,
      }),
  );

  return (
    <ApplyFilterPopoverContent
      label={filter.label}
      onDismiss={onDismiss}
      onApply={() => {
        onApply({
          start: internalValue.start
            ? {
                value: internalValue.start.toAbsoluteString(),
                operator: FilterOperator.gte,
              }
            : undefined,
          end: internalValue.end
            ? {
                value: internalValue.end.toAbsoluteString(),
                operator: FilterOperator.lte,
              }
            : undefined,
        });
      }}
    >
      <DateRangePicker
        value={internalValue}
        onChange={next => {
          if (next) {
            setInternalValue(next);
          }
        }}
        min={min}
        max={max}
        size="sm"
        granularity="day"
        closeDialogOnSelection
      />
    </ApplyFilterPopoverContent>
  );
}

const thisWeek = dateRangeToAbsoluteRange(
  (DateRangePresets[2] as Required<DateRangePreset>).getRangeValue(),
) as Required<AbsoluteDateRange>;
const dateRangeFilterThisWeekValue = {
  start: {value: thisWeek.start, operator: FilterOperator.gte},
  end: {value: thisWeek.end, operator: FilterOperator.lte},
};
