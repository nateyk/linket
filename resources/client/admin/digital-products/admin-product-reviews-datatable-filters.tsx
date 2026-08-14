import {BackendFilter} from '@common/datatable/filters/backend-filter';
import {
  SelectFilterItem,
  SelectFilterItemProps,
  SelectFilterPopoverContent,
  SelectFilterPopoverContentProps,
} from '@common/datatable/filters/panels/select-filter';
import {Trans} from '@ui/i18n/trans';

export const AdminProductReviewsDatatableFilters: BackendFilter[] = [
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
          {label: <Trans message="Hidden" />, value: 'hidden'},
          {label: <Trans message="Visible" />, value: 'visible'},
        ]}
      />
    ),
  },
];