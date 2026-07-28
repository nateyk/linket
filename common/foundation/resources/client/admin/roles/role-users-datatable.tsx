import {Role} from '@app/gen/schemas/role';
import {RoleUser} from '@app/gen/schemas/role-user';
import {User} from '@app/gen/schemas/user';
import {listUsers} from '@app/gen/users';
import {
  addUsersToRoleOptions,
  listRoleUsersOptions,
  removeUsersFromRoleOptions,
  retrieveRoleOptions,
} from '@common/admin/roles/roles-queries';
import {usersBaseKey} from '@common/admin/users/users-queries';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Command} from '@shadcn/command/command';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {GenericTable} from '@shadcn/table/generic-table';
import {checkboxColumnDef} from '@shadcn/table/utils/checkbox-column-def';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQuery, useSuspenseQuery} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ShieldOffIcon, UserIcon, UsersIcon} from 'lucide-react';
import {useState} from 'react';

const columns: ColumnDef<RoleUser>[] = [
  checkboxColumnDef<RoleUser>(),
  {
    id: 'email',
    accessorKey: 'email',
    enableSorting: true,
    size: 250,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="User" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-2">
          <Avatar.Root size="sm">
            <Avatar.Image src={user.image ?? undefined} alt={user.name ?? ''} />
            <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
          </Avatar.Root>
          <div className="min-w-0">
            <div className="truncate">
              {user.name ?? <Trans message="Visitor" />}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {user.email}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: 'assigned_at',
    accessorKey: 'assigned_at',
    enableSorting: true,
    size: 1,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Assigned at" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <time>
        <FormattedDate date={row.original.assigned_at} />
      </time>
    ),
  },
];

export function Component() {
  const {roleId} = useRequiredParams(['roleId']);
  const roleQuery = useSuspenseQuery(retrieveRoleOptions(Number(roleId)));
  const role = roleQuery.data.data;

  if (role.guests || role.type === 'workspace') {
    return (
      <Empty.Root>
        <Empty.Header>
          <Empty.Media variant="icon">
            <ShieldOffIcon />
          </Empty.Media>
          <Empty.Title>
            <Trans message="Users can't be assigned to this role" />
          </Empty.Title>
        </Empty.Header>
      </Empty.Root>
    );
  }

  return <UsersTable role={role} />;
}

interface UsersTableProps {
  role: Role;
}
function UsersTable({role}: UsersTableProps) {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState();

  const query = useSuspenseQuery(
    listRoleUsersOptions(role.id, deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns,
    enableMultiRowSelection: true,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    selectedRows,
    onSelectedRowsChange: setSelectedRows,
  });

  useShowGlobalLoadingBar({isLoading});

  return (
    <>
      <DashboardLayout.SectionContentHeader>
        <TableSearchInput className="mr-auto" />
        <AssignUserButton role={role} />
      </DashboardLayout.SectionContentHeader>
      <DashboardLayout.SectionScrollContainer>
        <GenericTable table={table} />
        {!items.length ? (
          <EmptyState isFiltering={isFiltering} role={role} />
        ) : null}

        <BackendPagination
          response={query.data}
          disabled={isLoading}
          onPageChange={page => setQueryState({page})}
          onPageSizeChange={perPage => setQueryState({per_page: perPage})}
        />
      </DashboardLayout.SectionScrollContainer>
      <SelectedActionsToolbar
        role={role}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      />
    </>
  );
}

function AssignUserButton({role}: {role: Role}) {
  const addUsers = useMutation(addUsersToRoleOptions(role.id));

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const {trans} = useTrans();
  const query = useQuery({
    queryKey: [...usersBaseKey, 'role-users', searchTerm],
    queryFn: () =>
      listUsers({
        query: searchTerm || undefined,
      }),
  });
  const users = query.data?.data || [];

  const handleAssignUser = (user: User) => {
    addUsers.mutate([user.id], {
      onSuccess: () => {
        toast.success(
          <Trans
            message="Assigned [one 1 user|other :count users] to :role"
            values={{count: 1, role: role.name}}
          />,
        );
      },
      onError: err => showHttpErrorToast(err),
    });
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            variant="default"
            color="primary"
            disabled={addUsers.isPending}
          />
        }
      >
        <Trans message="Assign user" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Command.DialogContent>
          <Command.Root items={users}>
            <Command.Input
              placeholder={trans(message('Search for user by name or email'))}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
              }}
            />
            {!query.isLoading && (
              <Command.Empty>
                <Trans message="No matching users" />
              </Command.Empty>
            )}
            <Command.List>
              {(user: User) => (
                <Command.Item
                  key={user.id}
                  value={user.id}
                  onClick={() => handleAssignUser(user)}
                >
                  <Avatar.Root size="sm">
                    {user.image && (
                      <Avatar.Image src={user.image} alt={user.name ?? ''} />
                    )}
                    <Avatar.ColorFallback>
                      {user.name ?? 'Visitor'}
                    </Avatar.ColorFallback>
                  </Avatar.Root>
                  {user.name ?? <Trans message="Visitor" />}
                </Command.Item>
              )}
            </Command.List>
          </Command.Root>
          <Command.DialogFooter />
        </Command.DialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type RemoveUsersActionProps = {
  role: Role;
  selectedIds: number[];
};
function SelectedActionsToolbar({
  role,
  selectedRows,
  setSelectedRows,
}: {
  role: Role;
  selectedRows: number[];
  setSelectedRows: (rows: number[]) => void;
}) {
  if (!selectedRows.length) {
    return null;
  }

  return (
    <DashboardLayout.FloatingActions
      selectedItemsCount={selectedRows.length}
      onClear={() => setSelectedRows([])}
    >
      <RemoveUsersDialog
        role={role}
        selectedIds={selectedRows}
        onRemove={() => setSelectedRows([])}
      />
    </DashboardLayout.FloatingActions>
  );
}

type RemoveUsersDialogProps = RemoveUsersActionProps & {
  onRemove: () => void;
};
function RemoveUsersDialog({
  role,
  selectedIds,
  onRemove,
}: RemoveUsersDialogProps) {
  const [open, setOpen] = useState(false);
  const removeUsers = useMutation(removeUsersFromRoleOptions(role.id));

  const handleRemove = () => {
    removeUsers.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(
          <Trans
            message="Removed [one 1 user|other :count users] from :role"
            values={{count: selectedIds.length, role: role.name}}
          />,
        );
        onRemove();
        setOpen(false);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger
        render={<Button variant="outline" size="sm" color="danger" />}
      >
        <Trans message="Remove users" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Media>
              <UserIcon />
            </AlertDialog.Media>
            <AlertDialog.Title>
              <Trans message="Remove users from role?" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="This will permanently remove the users from this role." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={removeUsers.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={removeUsers.isPending}
              onClick={handleRemove}
            >
              <Trans message="Remove" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function EmptyState({isFiltering, role}: {isFiltering: boolean; role: Role}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <UsersIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching users" />
          ) : (
            <Trans message="No users have been assigned to this role yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by assigning a user to this role." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <AssignUserButton role={role} />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
