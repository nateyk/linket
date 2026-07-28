import {DateValue} from '@internationalized/date';
import {ChipValue} from '@ui/forms/input-field/chip-field/chip-field';
import {AbsoluteDateRange} from '@ui/forms/input-field/date/date-range-picker/form-date-range-picker';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {NormalizedModel} from '@ui/types/normalized-model';
import {ReactElement, ReactNode} from 'react';

export type ParsedFilterValue<V = any> = {
  value: V;
  operator?: FilterOperator;
};

export interface FilterSelectControl {
  type: FilterControlType.Select;
  options: {
    label: ReactNode;
    value: string;
    image?: string;
    description?: string;
  }[];
  defaultValue?: string;
  placeholder?: MessageDescriptor;
  showAvatar?: boolean;
}

export type FilterInputControl = {
  type: FilterControlType.Input;
  placeholder?: MessageDescriptor;
  inputType: 'string' | 'number';
  min?: number;
  max?: number;
  defaultValue: string;
};

export type FilterSelectModelControl = {
  type: FilterControlType.SelectModel;
  model: string;
  endpoint?: string;
  defaultValue?: NormalizedModel;
};

export type FilterChipFieldControl = {
  type: FilterControlType.ChipField;
  options?: FilterSelectControl['options'];
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

export type FilterControl =
  | FilterSelectControl
  | FilterInputControl
  | FilterSelectModelControl
  | FilterChipFieldControl
  | DatePickerFilterControl;

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

export type BackendFilter = {
  key: string;
  label: ReactElement;
  valueType: 'string' | 'array' | 'dateRange';
  item: (props: FilterListItemProps<any>) => ReactElement;
  popoverContent: (props: FilterPopoverContentProps<any>) => ReactElement;
};

export enum FilterControlType {
  Select = 'select',
  DateRangePicker = 'dateRangePicker',
  SelectModel = 'selectModel',
  Input = 'input',
  ChipField = 'chipField',
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
