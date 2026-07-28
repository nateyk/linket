import {User} from '@app/gen/schemas/user';
import {
  listUsersOptions,
  retrieveUserOptions,
} from '@common/admin/users/users-queries';
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
import {Avatar} from '@shadcn/avatar/avatar';
import {Trans} from '@ui/i18n/trans';

export const FileEntriesDatatableFilters: BackendFilter[] = [
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
          {label: <Trans message="Text" />, value: 'text'},
          {label: <Trans message="Audio" />, value: 'audio'},
          {label: <Trans message="Video" />, value: 'video'},
          {label: <Trans message="Image" />, value: 'image'},
          {label: <Trans message="PDF" />, value: 'pdf'},
          {label: <Trans message="Spreadsheet" />, value: 'spreadsheet'},
          {label: <Trans message="Word Document" />, value: 'word'},
          {label: <Trans message="Photoshop" />, value: 'photoshop'},
          {label: <Trans message="Archive" />, value: 'archive'},
          {label: <Trans message="Folder" />, value: 'folder'},
        ]}
      />
    ),
  },
  {
    key: 'public',
    label: <Trans message="Visibility" />,
    valueType: 'string',
    item: (props: SelectFilterItemProps) => <SelectFilterItem {...props} />,
    popoverContent: (props: SelectFilterPopoverContentProps) => (
      <SelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select visibility" />}
        items={[
          {label: <Trans message="Private" />, value: 'false'},
          {label: <Trans message="Public" />, value: 'true'},
        ]}
      />
    ),
  },
  {
    key: 'created_at',
    label: <Trans message="Date uploaded" />,
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
    key: 'owner_id',
    label: <Trans message="Uploader" />,
    valueType: 'string',
    item: (props: SelectModelFilterItemProps) => (
      <ModelSelectFilterItem
        {...props}
        retrieveOptions={({id}) => retrieveUserOptions(id)}
        modelToLabel={(user: User) => user.name}
        modelToImage={(user: User) => (
          <Avatar.Root size="xs">
            <Avatar.Image src={user.image ?? undefined} />
            <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
          </Avatar.Root>
        )}
      />
    ),
    popoverContent: (props: SelectModelFilterPopoverContentProps) => (
      <ModelSelectFilterPopoverContent
        {...props}
        placeholder={<Trans message="Select uploader" />}
        listOptions={({query}) => listUsersOptions({query})}
        retrieveOptions={({id}) => retrieveUserOptions(id)}
        modelToLabel={(user: User) => user.name}
        modelToImage={(user: User) => (
          <Avatar.Root size="sm">
            <Avatar.Image src={user.image ?? undefined} />
            <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
          </Avatar.Root>
        )}
      />
    ),
  },
];
