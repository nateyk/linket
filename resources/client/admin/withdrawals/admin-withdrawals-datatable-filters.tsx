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
  {
    key: 'transfer_status',
    label: <Trans message="Chapa transfer" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select transfer status" />}
        items={[
          {label: <Trans message="Not submitted" />, value: 'not_started'},
          {label: <Trans message="Submission uncertain" />, value: 'submitted'},
          {label: <Trans message="Queued — awaiting settlement" />, value: 'provider_pending'},
          {label: <Trans message="Requires admin action" />, value: 'requires_action'},
          {label: <Trans message="Settled" />, value: 'successful'},
          {label: <Trans message="Transfer failed" />, value: 'failed'},
        ]}
      />
    ),
  },

];