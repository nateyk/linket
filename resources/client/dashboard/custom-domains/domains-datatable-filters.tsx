import {ownerFilter} from '@app/dashboard/links/links-datatable-page/owner-filter';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  ALL_STRING_OPERATORS,
  BackendFilter,
  FilterOperator,
} from '@common/datatable/filters/backend-filter';
import {
  DateRangeFilterItem,
  DateRangeFilterItemProps,
  DateRangeFilterPopoverContent,
  DateRangeFilterPopoverContentProps,
} from '@common/datatable/filters/panels/date-range-filter';
import {
  InputFilterItem,
  InputFilterItemProps,
  InputFilterPopoverContent,
  InputFilterPopoverContentProps,
} from '@common/datatable/filters/panels/input-filter';
import {
  SelectFilterItem,
  SelectFilterItemProps,
  SelectFilterPopoverContent,
  SelectFilterPopoverContentProps,
} from '@common/datatable/filters/panels/select-filter';
import {Trans} from '@ui/i18n/trans';
import {useMemo} from 'react';

export function useDomainsDatatableFilters(): BackendFilter[] {
  const {routeType, isForCurrentUser} = useDatatableRouteType();

  return useMemo(() => {
    const filters = [...DomainsSharedFilters];
    if (routeType === 'admin') {
      filters.unshift(DomainsGlobalFilter);
    }
    if (!isForCurrentUser) {
      filters.push(ownerFilter);
    }
    return filters;
  }, [routeType, isForCurrentUser]);
}

export const DomainsGlobalFilter: BackendFilter = {
  key: 'global',
  label: <Trans message="Global" />,
  valueType: 'string',
  item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
  popoverContent: (props: SelectFilterPopoverContentProps) => (
    <SelectFilterPopoverContent
      {...props}
      placeholder={<Trans message="Global status" />}
      items={[
        {label: <Trans message="Is global" />, value: 'true'},
        {label: <Trans message="Is not global" />, value: 'false'},
      ]}
    />
  ),
};

export const DomainsSharedFilters: BackendFilter[] = [
  {
    key: 'created_at',
    label: <Trans message="Date created" />,
    valueType: 'dateRange',
    item: (props: DateRangeFilterItemProps) => (
      <DateRangeFilterItem {...props} />
    ),
    popoverContent: (props: DateRangeFilterPopoverContentProps) => (
      <DateRangeFilterPopoverContent {...props} />
    ),
  },
  {
    key: 'updated_at',
    label: <Trans message="Date updated" />,
    valueType: 'dateRange',
    item: (props: DateRangeFilterItemProps) => (
      <DateRangeFilterItem {...props} />
    ),
    popoverContent: (props: DateRangeFilterPopoverContentProps) => (
      <DateRangeFilterPopoverContent {...props} />
    ),
  },
  {
    key: 'host',
    label: <Trans message="Host" />,
    valueType: 'string',
    item: (props: InputFilterItemProps) => <InputFilterItem {...props} />,
    popoverContent: (props: InputFilterPopoverContentProps) => (
      <InputFilterPopoverContent
        {...props}
        inputType="string"
        operators={ALL_STRING_OPERATORS}
        defaultValue={{value: '', operator: FilterOperator.contains}}
      />
    ),
  },
];
