import {FilterListValue} from './encode-backend-filters';

export function decodeBackendFilters(
  encodedFilters: string | null,
): FilterListValue[] {
  if (!encodedFilters) return [];
  let filtersFromQuery: FilterListValue[] = [];
  let decodedFilters: string;
  try {
    decodedFilters = decodeURIComponent(encodedFilters);
  } catch {
    // malformed percent-encoding in the query string — treat as no filters
    return [];
  }
  try {
    filtersFromQuery = JSON.parse(atob(decodedFilters));
    filtersFromQuery.map(filterValue => {
      // set value key as value so selects work properly
      if (filterValue.valueKey != null) {
        filterValue.value = filterValue.valueKey;
      }
      return filterValue;
    });
  } catch (e) {
    //
  }
  return filtersFromQuery;
}
