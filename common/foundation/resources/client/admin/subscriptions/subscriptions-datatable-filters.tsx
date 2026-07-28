import {Product} from '@app/gen/schemas/product';
import {
  listProductsOptions,
  retrieveProductOptions,
} from '@common/admin/subscriptions/products-queries';
import {BackendFilter} from '@common/datatable/filters/backend-filter';
import {
  DateRangeFilterItem,
  DateRangeFilterItemProps,
  DateRangeFilterPopoverContent,
  DateRangeFilterPopoverContentProps,
} from '@common/datatable/filters/panels/date-range-filter';
import {
  ModelSelectFilterItem,
  ModelSelectFilterPopoverContent,
  SelectModelFilterItemProps,
  SelectModelFilterPopoverContentProps,
} from '@common/datatable/filters/panels/model-select-filter';
import {
  SelectFilterItem,
  SelectFilterItemProps,
  SelectFilterPopoverContent,
  SelectFilterPopoverContentProps,
} from '@common/datatable/filters/panels/select-filter';
import {Trans} from '@ui/i18n/trans';

export const SubscriptionDatatableFilters: BackendFilter[] = [
  {
    key: 'product_id',
    label: <Trans message="Plan" />,
    valueType: 'string',
    item: (props: SelectModelFilterItemProps) => (
      <ModelSelectFilterItem
        {...props}
        retrieveOptions={({id}) => retrieveProductOptions(id)}
        modelToLabel={(product: Product) => product.name}
      />
    ),
    popoverContent: (props: SelectModelFilterPopoverContentProps) => (
      <ModelSelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select plan" />}
        listOptions={({query}) => listProductsOptions({query})}
        retrieveOptions={({id}) => retrieveProductOptions(id)}
        modelToLabel={(product: Product) => product.name}
      />
    ),
  },
  {
    key: 'gateway_name',
    label: <Trans message="Gateway" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select gateway" />}
        items={[
          {label: <Trans message="Stripe" />, value: 'stripe'},
          {label: <Trans message="PayPal" />, value: 'paypal'},
          {label: <Trans message="None" />, value: 'none'},
        ]}
      />
    ),
  },
  {
    key: 'renews_at',
    label: <Trans message="Renew date" />,
    valueType: 'dateRange',
    item: (props: DateRangeFilterItemProps) => (
      <DateRangeFilterItem {...props} />
    ),
    popoverContent: (props: DateRangeFilterPopoverContentProps) => (
      <DateRangeFilterPopoverContent {...props} />
    ),
  },
  {
    key: 'ends_at',
    label: <Trans message="End date" />,
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
];
