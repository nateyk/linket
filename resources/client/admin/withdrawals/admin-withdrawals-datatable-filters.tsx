import {BackendFilter} from '@common/datatable/filters/backend-filter';
import {
  SelectFilterItem,
  SelectFilterItemProps,
  SelectFilterPopoverContent,
  SelectFilterPopoverContentProps,
} from '@common/datatable/filters/panels/select-filter';
import {Trans} from '@ui/i18n/trans';

export const AdminWithdrawalsDatatableFilters: BackendFilter[] = [
  {
    key: 'status',
    label: <Trans message="Status" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select status" />}
        items={[
          {label: <Trans message="Requested" />, value: 'requested'},
          {label: <Trans message="Processing" />, value: 'processing'},
          {label: <Trans message="Paid" />, value: 'paid'},
          {label: <Trans message="Rejected" />, value: 'rejected'},
          {label: <Trans message="Cancelled" />, value: 'cancelled'},
        ]}
      />
    ),
  },
];