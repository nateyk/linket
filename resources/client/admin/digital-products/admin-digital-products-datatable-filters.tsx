import {BackendFilter} from '@common/datatable/filters/backend-filter';
import {
  SelectFilterItem,
  SelectFilterItemProps,
  SelectFilterPopoverContent,
  SelectFilterPopoverContentProps,
} from '@common/datatable/filters/panels/select-filter';
import {Trans} from '@ui/i18n/trans';

export const AdminDigitalProductsDatatableFilters: BackendFilter[] = [
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
          {label: <Trans message="Pending review" />, value: 'pending_approval'},
          {label: <Trans message="Approved" />, value: 'approved'},
          {label: <Trans message="Rejected" />, value: 'rejected'},
          {label: <Trans message="Published" />, value: 'published'},
        ]}
      />
    ),
  },
];