import {User} from '@app/gen/schemas/user';
import {
  listUsersOptions,
  retrieveUserOptions,
} from '@common/admin/users/users-queries';
import {BackendFilter} from '@common/datatable/filters/backend-filter';
import {
  ModelSelectFilterItem,
  ModelSelectFilterPopoverContent,
  SelectModelFilterItemProps,
  SelectModelFilterPopoverContentProps,
} from '@common/datatable/filters/panels/model-select-filter';
import {Avatar} from '@shadcn/avatar/avatar';
import {Trans} from '@ui/i18n/trans';

export const ownerFilter: BackendFilter = {
  key: 'user_id',
  label: <Trans message="Owner" />,
  valueType: 'string',
  item: (props: SelectModelFilterItemProps) => (
    <ModelSelectFilterItem
      {...props}
      retrieveOptions={({id}) => retrieveUserOptions(id)}
      modelToLabel={(user: User) => user.name}
      modelToImage={(user: User) => (
        <Avatar.Root size="xs">
          <Avatar.Image src={user.image} />
          <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
        </Avatar.Root>
      )}
    />
  ),
  popoverContent: (props: SelectModelFilterPopoverContentProps) => (
    <ModelSelectFilterPopoverContent
      {...props}
      placeholder={<Trans message="Select owner" />}
      listOptions={({query}) => listUsersOptions({query})}
      retrieveOptions={({id}) => retrieveUserOptions(id)}
      modelToLabel={(user: User) => user.name}
      modelToImage={(user: User) => (
        <Avatar.Root size="sm">
          <Avatar.Image src={user.image} />
          <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
        </Avatar.Root>
      )}
    />
  ),
};
