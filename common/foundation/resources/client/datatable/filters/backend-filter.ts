import {DateValue} from '@internationalized/date';
import {ChipValue} from '@ui/forms/input-field/chip-field/chip-field';
import {AbsoluteDateRange} from '@ui/forms/input-field/date/date-range-picker/form-date-range-picker';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {NormalizedModel} from '@ui/types/normalized-model';
import {ReactElement} from 'react';
import type {TranslatableLabel} from './filter-trans';

export type ParsedFilterValue<V = any> = {
  value: V;
  operator?: FilterOperator;
};

export type FilterSelectOption = {
  key?: string | number;
  value: any;
  label: TranslatableLabel;
  image?: string;
  description?: string;
};

export interface FilterSelectControl {
  type: FilterControlType.Select;
  options: FilterSelectOption[];
  defaultValue?: string | number | boolean | null;
  placeholder?: MessageDescriptor;
  searchPlaceholder?: MessageDescriptor;
  showAvatar?: boolean;
  showSearchField?: boolean;
}

export type FilterInputControl = {
  type: FilterControlType.Input;
  placeholder?: MessageDescriptor;
  inputType?: 'string' | 'number';
  min?: number;
  max?: number;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  defaultValue: string | number;
};

export type FilterTextInputControl = FilterInputControl & {
  inputType?: 'string';
};

export type FilterNumberInputControl = FilterInputControl & {
  inputType: 'number';
};

export type FilterSelectModelControl = {
  type: FilterControlType.SelectModel;
  model?: string;
  endpoint?: string;
  defaultValue?: NormalizedModel;
};

export type FilterChipFieldControl = {
  type: FilterControlType.ChipField;
  options?: FilterSelectOption[];
  placeholder?: MessageDescriptor;
  defaultValue: ChipValue[];
  autocompleteEndpoint?: string;
};

export type DatePickerFilterControl = {
  type: FilterControlType.DateRangePicker;
  defaultValue: AbsoluteDateRange;
  min?: DateValue;
  max?: DateValue;
};

export type FilterBooleanToggleControl = {
  type: FilterControlType.BooleanToggle;
  defaultValue?: boolean;
};

export type CustomFilterControl = {
  type: FilterControlType.Custom;
  listItem: (props: FilterListItemProps<any>) => ReactElement;
  panel: (props: FilterPopoverContentProps<any>) => ReactElement;
};

export type FilterControl =
  | FilterSelectControl
  | FilterInputControl
  | FilterSelectModelControl
  | FilterChipFieldControl
  | DatePickerFilterControl
  | FilterBooleanToggleControl
  | CustomFilterControl;

export type FilterListItemProps<V> = {
  filter: BackendFilter;
  value: V | null;
  onApply: (value: V) => void;
  onRemove: () => void;
  isInactive: boolean;
};

export type FilterPopoverContentProps<V> = {
  filter: BackendFilter;
  value?: V | null;
  defaultValue?: V;
  onApply: (value: V) => void;
  onDismiss?: () => void;
};

export type BackendFilter<C extends FilterControl = FilterControl> = {
  key: string;
  label: TranslatableLabel;
  description?: MessageDescriptor | ReactElement | null;
  valueType?: 'string' | 'array' | 'dateRange';
  control?: C;
  defaultOperator?: FilterOperator;
  operators?: FilterOperator[];
  // Legacy Linket filter API, still used by AddFilterPopover.
  item?: (props: FilterListItemProps<any>) => ReactElement;
  popoverContent?: (props: FilterPopoverContentProps<any>) => ReactElement;
};

export type ControlledBackendFilter<C extends FilterControl> = BackendFilter<C> & {
  control: C;
};

export enum FilterControlType {
  Select = 'select',
  DateRangePicker = 'dateRangePicker',
  SelectModel = 'selectModel',
  Input = 'input',
  ChipField = 'chipField',
  BooleanToggle = 'booleanToggle',
  Custom = 'custom',
  MultipleCombobox = 'MultipleCombobox',
}

export enum FilterOperator {
  eq = 'eq',
  ne = 'ne',
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  has = 'has',
  contains = 'contains',
  notContains = 'notContains',
  startsWith = 'startsWith',
  endsWith = 'endsWith',
  hasAll = 'hasAll',
  doesntHave = 'doesntHave',
  between = 'between',
  notNull = 'notNull',
}

export const ALL_OPERATORS = Object.values(FilterOperator);

export const ALL_STRING_OPERATORS = [
  FilterOperator.eq,
  FilterOperator.ne,
  FilterOperator.contains,
  FilterOperator.notContains,
  FilterOperator.startsWith,
  FilterOperator.endsWith,
];

export const ALL_NUMBER_OPERATORS = [
  FilterOperator.eq,
  FilterOperator.ne,
  FilterOperator.gt,
  FilterOperator.gte,
  FilterOperator.lt,
  FilterOperator.lte,
];

export const ALL_PRIMITIVE_OPERATORS = [
  FilterOperator.eq,
  FilterOperator.ne,
  FilterOperator.gt,
  FilterOperator.gte,
  FilterOperator.lt,
  FilterOperator.lte,
  FilterOperator.contains,
  FilterOperator.notContains,
  FilterOperator.startsWith,
  FilterOperator.endsWith,
];
