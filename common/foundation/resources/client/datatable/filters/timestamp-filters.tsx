import {
  DateRangePreset,
  DateRangePresets,
} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {dateRangeToAbsoluteRange} from '@ui/forms/input-field/date/date-range-picker/form-date-range-picker';
import {Trans} from '@ui/i18n/trans';
import {PartialWithRequired} from '@ui/utils/ts/partial-with-required';
import {FilterControlType, FilterOperator} from './backend-filter';

export function timestampFilter(
  options: PartialWithRequired<any, 'key' | 'label'>,
): any {
  return {
    ...options,
    defaultOperator: FilterOperator.between,
    control: {
      type: FilterControlType.DateRangePicker,
      defaultValue:
        options.control?.defaultValue ||
        dateRangeToAbsoluteRange(
          (DateRangePresets[3] as Required<DateRangePreset>).getRangeValue(),
        ),
    },
  };
}

export function createdAtFilter(options?: any): any {
  return timestampFilter({
    key: 'created_at',
    label: <Trans message="Date created" />,
    ...options,
  });
}

export function updatedAtFilter(options?: any): any {
  return timestampFilter({
    key: 'updated_at',
    label: <Trans message="Last updated" />,
    ...options,
  });
}
