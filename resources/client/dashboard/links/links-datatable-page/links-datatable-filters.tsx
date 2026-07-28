import {ownerFilter} from '@app/dashboard/links/links-datatable-page/owner-filter';
import {
  ALL_PRIMITIVE_OPERATORS,
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

export const LinksDatatableFilters: BackendFilter[] = [
  {
    key: 'type',
    label: <Trans message="Type" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select type" />}
        items={[
          {label: <Trans message="Direct" />, value: 'direct'},
          {label: <Trans message="Overlay" />, value: 'overlay'},
          {label: <Trans message="Frame" />, value: 'frame'},
          {label: <Trans message="Custom page" />, value: 'link_page'},
        ]}
      />
    ),
  },
  {
    key: 'is_archived',
    label: <Trans message="Archived" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Archive status" />}
        items={[
          {label: <Trans message="is archived" />, value: 'true'},
          {label: <Trans message="is not archived" />, value: 'false'},
        ]}
      />
    ),
  },
  {
    key: 'name',
    label: <Trans message="Title" />,
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
  {
    key: 'long_url',
    label: <Trans message="Destination URL" />,
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
  {
    key: 'has_password',
    label: <Trans message="Password" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Password status" />}
        items={[
          {label: <Trans message="Has a password" />, value: 'true'},
          {
            label: <Trans message="Does not have a password" />,
            value: 'false',
          },
        ]}
      />
    ),
  },
  {
    key: 'clicks_count',
    label: <Trans message="Click count" />,
    valueType: 'string',
    item: (props: InputFilterItemProps) => <InputFilterItem {...props} />,
    popoverContent: (props: InputFilterPopoverContentProps) => (
      <InputFilterPopoverContent
        {...props}
        inputType="number"
        operators={ALL_PRIMITIVE_OPERATORS}
        defaultValue={{value: '1', operator: FilterOperator.gte}}
      />
    ),
  },
  {
    key: 'clicked_at',
    label: <Trans message="Clicked at" />,
    valueType: 'dateRange',
    item: (props: DateRangeFilterItemProps) => (
      <DateRangeFilterItem {...props} />
    ),
    popoverContent: (props: DateRangeFilterPopoverContentProps) => (
      <DateRangeFilterPopoverContent {...props} />
    ),
  },
  {
    key: 'expires_at',
    label: <Trans message="Expires at" />,
    valueType: 'dateRange',
    item: (props: DateRangeFilterItemProps) => (
      <DateRangeFilterItem {...props} />
    ),
    popoverContent: (props: DateRangeFilterPopoverContentProps) => (
      <DateRangeFilterPopoverContent {...props} />
    ),
  },
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
  ownerFilter,
];
