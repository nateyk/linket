import {ownerFilter} from '@app/dashboard/links/links-datatable-page/owner-filter';
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

export const QrCodesDatatableFilters: BackendFilter[] = [
  {
    key: 'linkeable_type',
    label: <Trans message="Destination type" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select destination type" />}
        items={[
          {label: <Trans message="URL" />, value: 'null'},
          {label: <Trans message="Short link" />, value: 'link'},
          {label: <Trans message="Link in bio" />, value: 'biolink'},
          {label: <Trans message="Folder" />, value: 'folder'},
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
    label: <Trans message="Name" />,
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
  ownerFilter,
];
