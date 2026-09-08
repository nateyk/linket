import {BackendFilter} from '../backend-filter';

export interface FilterListValue {
  key: string | number;
  value: any;
  operator?: string;
  valueKey?: string | number;
  isInactive?: boolean;
}

export function encodeBackendFilters(
  filterValues: FilterListValue[] | null,
  filters?: BackendFilter[],
): string {
  if (!filterValues) return '';

  // prepare values for backend
  filterValues = !filters
    ? filterValues
    : filterValues
        .filter(item => item.value !== '')
        .map(item => transformValue(item, filters));

  // remove all placeholder filters
  filterValues = filterValues.filter(fm => !fm.isInactive);

  if (!filterValues.length) {
    return '';
  }

  return encodeURIComponent(btoa(JSON.stringify(filterValues)));
}

function transformValue(
  filterValue: FilterListValue,
  _filters: BackendFilter[],
) {
  void _filters;
  return filterValue;
}
