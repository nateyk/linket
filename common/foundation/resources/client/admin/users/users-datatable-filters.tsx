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
import {getCountryList} from '@ui/utils/intl/countries';
import {getLanguageList} from '@ui/utils/intl/languages';
import {getTimeZoneList} from '@ui/utils/intl/timezones';

export const UserDatatableFilters: BackendFilter[] = [
  {
    key: 'email_confirmed',
    label: <Trans message="Email status" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select email status" />}
        items={[
          {label: <Trans message="is confirmed" />, value: 'true'},
          {label: <Trans message="is not confirmed" />, value: 'false'},
        ]}
      />
    ),
  },
  {
    key: 'is_subscribed',
    label: <Trans message="Subscription status" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select status" />}
        items={[
          {label: <Trans message="is subscribed" />, value: 'true'},
          {label: <Trans message="is not subscribed" />, value: 'false'},
        ]}
      />
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
    label: <Trans message="Last updated" />,
    valueType: 'dateRange',
    item: (props: DateRangeFilterItemProps) => (
      <DateRangeFilterItem {...props} />
    ),
    popoverContent: (props: DateRangeFilterPopoverContentProps) => (
      <DateRangeFilterPopoverContent {...props} />
    ),
  },
  {
    key: 'language',
    label: <Trans message="Language" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => {
      const languageFilterItems = getLanguageList().map(language => ({
        label: language.name,
        value: language.code,
      }));
      return (
        <SelectFilterPopoverContent
          {...props}
          placeholder={<Trans message="Select language" />}
          defaultValue={{value: 'en', operator: FilterOperator.eq}}
          items={languageFilterItems}
        />
      );
    },
  },
  {
    key: 'country',
    label: <Trans message="Country" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => {
      const countryFilterItems = getCountryList().map(country => ({
        label: country.name,
        value: country.code,
      }));
      return (
        <SelectFilterPopoverContent
          {...props}
          placeholder={<Trans message="Select country" />}
          defaultValue={{value: 'us', operator: FilterOperator.eq}}
          items={countryFilterItems}
        />
      );
    },
  },
  {
    key: 'timezone',
    label: <Trans message="Timezone" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => {
      const timezoneFilterItems = getTimeZoneList().map(timezone => ({
        label: timezone,
        value: timezone,
      }));
      return (
        <SelectFilterPopoverContent
          {...props}
          placeholder={<Trans message="Select timezone" />}
          defaultValue={{value: 'UTC', operator: FilterOperator.eq}}
          items={timezoneFilterItems}
        />
      );
    },
  },
  {
    key: 'device',
    label: <Trans message="Device" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select device" />}
        items={[
          {label: <Trans message="Desktop" />, value: 'desktop'},
          {label: <Trans message="Mobile" />, value: 'mobile'},
          {label: <Trans message="Tablet" />, value: 'tablet'},
        ]}
      />
    ),
  },
  {
    key: 'browser',
    label: <Trans message="Browser" />,
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
    key: 'platform',
    label: <Trans message="Platform" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select platform" />}
        defaultValue={{value: 'windows', operator: FilterOperator.eq}}
        items={[
          {label: <Trans message="OS X" />, value: 'MacOS'},
          {label: <Trans message="iOS" />, value: 'ios'},
          {label: <Trans message="Windows" />, value: 'windows'},
          {label: <Trans message="Linux" />, value: 'linux'},
          {label: <Trans message="Android" />, value: 'androidos'},
        ]}
      />
    ),
  },
  {
    key: 'city',
    label: <Trans message="City" />,
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
    key: 'ip_address',
    label: <Trans message="IP address" />,
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
