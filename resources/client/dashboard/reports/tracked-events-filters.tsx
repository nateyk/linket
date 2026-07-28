import {
  listBiolinksOptions,
  retrieveBiolinkOptions,
} from '@app/dashboard/biolink/biolinks-queries';
import {
  listDomainsOptions,
  retrieveDomainOptions,
} from '@app/dashboard/custom-domains/domains-queries';
import {
  listFoldersOptions,
  retrieveFolderOptions,
} from '@app/dashboard/folders/folders-queries';
import {ownerFilter} from '@app/dashboard/links/links-datatable-page/owner-filter';
import {
  listLinksOptions,
  retrieveLinkOptions,
} from '@app/dashboard/links/links-queries';
import {
  listQrCodesOptions,
  retrieveQrCodeOptions,
} from '@app/dashboard/qr-codes/qr-codes-queries';
import {
  DatatableRouteType,
  useDatatableRouteType,
} from '@app/dashboard/use-datatable-route-type';
import {Biolink} from '@app/gen/schemas/biolink';
import {CustomDomain} from '@app/gen/schemas/custom-domain';
import {Folder} from '@app/gen/schemas/folder';
import {Link} from '@app/gen/schemas/link';
import {QrCode} from '@app/gen/schemas/qr-code';
import {
  ALL_STRING_OPERATORS,
  BackendFilter,
  FilterOperator,
} from '@common/datatable/filters/backend-filter';
import {
  InputFilterItem,
  InputFilterItemProps,
  InputFilterPopoverContent,
  InputFilterPopoverContentProps,
} from '@common/datatable/filters/panels/input-filter';
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
import {getCountryList} from '@ui/utils/intl/countries';
import {useMemo} from 'react';

type Options = {
  isScopedToLinkeable?: boolean;
  isScopedToDomain?: boolean;
};

export function useTrackedEventsFilters({
  isScopedToLinkeable,
  isScopedToDomain,
}: Options = {}): BackendFilter[] {
  const {isForCurrentUser, routeType} = useDatatableRouteType();

  return useMemo(() => {
    const filters = [...sharedFilters()];
    if (!isForCurrentUser) {
      filters.push(ownerFilter);
    }
    if (!isScopedToDomain) {
      filters.push(domainFilter(routeType));
    }
    if (!isScopedToLinkeable) {
      filters.push(...linkeableFilters(routeType));
    }
    return filters;
  }, [isForCurrentUser, isScopedToLinkeable, isScopedToDomain, routeType]);
}

const linkeableFilters: (
  routeType: DatatableRouteType,
) => BackendFilter[] = routeType => [
  {
    key: 'event_type',
    label: <Trans message="Event type" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select event type" />}
        items={[
          {label: <Trans message="Click" />, value: 'click'},
          {label: <Trans message="Scan" />, value: 'scan'},
        ]}
      />
    ),
  },
  {
    key: 'linkeable_type',
    label: <Trans message="Resource type" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select resource type" />}
        items={[
          {label: <Trans message="Link" />, value: 'link'},
          {label: <Trans message="Link in bio" />, value: 'biolink'},
          {label: <Trans message="Folder" />, value: 'folder'},
          {label: <Trans message="QR code" />, value: 'qrCode'},
        ]}
      />
    ),
  },
  {
    key: 'link_id',
    label: <Trans message="Link" />,
    valueType: 'string',
    item: (props: SelectModelFilterItemProps) => (
      <ModelSelectFilterItem
        {...props}
        retrieveOptions={({id}) => retrieveLinkOptions(id)}
        modelToLabel={(link: Link) => link.name}
      />
    ),
    popoverContent: (props: SelectModelFilterPopoverContentProps) => (
      <ModelSelectFilterPopoverContent
        {...props}
        listOptions={({query}) => listLinksOptions(routeType, {query})}
        retrieveOptions={({id}) => retrieveLinkOptions(id)}
        modelToLabel={(link: Link) => link.name}
        placeholder={<Trans message="Select link" />}
      />
    ),
  },
  {
    key: 'folder_id',
    label: <Trans message="Folder" />,
    valueType: 'string',
    item: (props: SelectModelFilterItemProps) => (
      <ModelSelectFilterItem
        {...props}
        retrieveOptions={({id}) => retrieveFolderOptions(id)}
        modelToLabel={(folder: Folder) => folder.name}
      />
    ),
    popoverContent: (props: SelectModelFilterPopoverContentProps) => (
      <ModelSelectFilterPopoverContent
        {...props}
        listOptions={({query}) => listFoldersOptions(routeType, {query})}
        retrieveOptions={({id}) => retrieveFolderOptions(id)}
        modelToLabel={(folder: Folder) => folder.name}
        placeholder={<Trans message="Select folder" />}
      />
    ),
  },
  {
    key: 'biolink_id',
    label: <Trans message="Link in bio" />,
    valueType: 'string',
    item: (props: SelectModelFilterItemProps) => (
      <ModelSelectFilterItem
        {...props}
        retrieveOptions={({id}) => retrieveBiolinkOptions(id)}
        modelToLabel={(biolink: Biolink) => biolink.name}
      />
    ),
    popoverContent: (props: SelectModelFilterPopoverContentProps) => (
      <ModelSelectFilterPopoverContent
        {...props}
        listOptions={({query}) => listBiolinksOptions(routeType, {query})}
        retrieveOptions={({id}) => retrieveBiolinkOptions(id)}
        modelToLabel={(biolink: Biolink) => biolink.name}
        placeholder={<Trans message="Select link in bio" />}
      />
    ),
  },
  {
    key: 'qr_code_id',
    label: <Trans message="QR code" />,
    valueType: 'string',
    item: (props: SelectModelFilterItemProps) => (
      <ModelSelectFilterItem
        {...props}
        retrieveOptions={({id}) => retrieveQrCodeOptions(id)}
        modelToLabel={(qrCode: QrCode) => qrCode.name ?? qrCode.back_half}
      />
    ),
    popoverContent: (props: SelectModelFilterPopoverContentProps) => (
      <ModelSelectFilterPopoverContent
        {...props}
        listOptions={({query}) => listQrCodesOptions(routeType, {query})}
        retrieveOptions={({id}) => retrieveQrCodeOptions(id)}
        modelToLabel={(qrCode: QrCode) => qrCode.name ?? qrCode.back_half}
        placeholder={<Trans message="Select QR code" />}
      />
    ),
  },
];

const domainFilter: (
  routeType: DatatableRouteType,
) => BackendFilter = routeType => ({
  key: 'domain_id',
  label: <Trans message="Domain" />,
  valueType: 'string',
  item: (props: SelectModelFilterItemProps) => (
    <ModelSelectFilterItem
      {...props}
      retrieveOptions={({id}) => retrieveDomainOptions(id)}
      modelToLabel={(domain: CustomDomain) => domain.host}
    />
  ),
  popoverContent: (props: SelectModelFilterPopoverContentProps) => (
    <ModelSelectFilterPopoverContent
      {...props}
      listOptions={({query}) => listDomainsOptions(routeType, {query})}
      retrieveOptions={({id}) => retrieveDomainOptions(id)}
      modelToLabel={(domain: CustomDomain) => domain.host}
      placeholder={<Trans message="Select domain" />}
    />
  ),
});

const sharedFilters: () => BackendFilter[] = () => [
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
    key: 'location',
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
    key: 'state',
    label: <Trans message="State" />,
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
