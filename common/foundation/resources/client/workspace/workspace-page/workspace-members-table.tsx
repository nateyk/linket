import {WorkspaceMember} from '@app/gen/schemas/workspace-member';
import {useAuth} from '@common/auth/use-auth';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {LeaveWorkspaceDialog} from '@common/workspace/dialogs/leave-workspace-dialog';
import {RemoveMemberDialog} from '@common/workspace/dialogs/remove-member-dialog';
import {useHasWorkspacePermission} from '@common/workspace/use-has-workspace-permission';
import {
  changeWorkspaceMemberRoleOptions,
  listWorkspaceRolesOptions,
  retrieveWorkspaceOptions,
} from '@common/workspace/workspace-queries';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {GenericTable} from '@shadcn/table/generic-table';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {ChevronDown, Users} from 'lucide-react';
import {useMemo, useState} from 'react';

function useWorkspace() {
  const {workspaceId} = useRequiredParams(['workspaceId']);
  return useSuspenseQuery(retrieveWorkspaceOptions(Number(workspaceId)));
}

const columns: ColumnDef<WorkspaceMember>[] = [
  {
    id: 'user',
    accessorFn: member => `${member.name} ${member.email}`,
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="User" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <div className="flex min-w-0 items-center">
        <UserCell member={row.original} />
      </div>
    ),
  },
  {
    id: 'role',
    accessorKey: 'role_name',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Role" />
      </SortableHeader>
    ),
    cell: ({row}) => <RoleCell member={row.original} />,
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="sr-only">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <RowActions member={row.original} />,
  },
];

export function Component() {
  const isMobile = useIsMobileMediaQuery();
  const {queryState, setQueryState, isFiltering} = useTableQueryState();
  const query = useWorkspace();
  const workspace = query.data.data;
  const items = useMemo(() => workspace.members ?? [], [workspace.members]);

  const table = useTable({
    data: items,
    columns,
    isClientSide: true,
    globalFilter: queryState.query,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    pagination: {
      per_page: queryState.per_page,
      page: queryState.page,
    },
    onPaginationChange: pagination => setQueryState({...pagination}),
  });

  const visibleMembers = table.getRowModel().rows.map(row => row.original);
  const isEmpty = table.getRowCount() === 0;

  return (
    <>
      <DashboardLayout.SectionContentHeader>
        <TableSearchInput
          className="mr-auto"
          placeholder={message('Search members...')}
          debounce={false}
        />
      </DashboardLayout.SectionContentHeader>
      <DashboardLayout.SectionScrollContainer>
        {isMobile ? (
          <MemberList members={visibleMembers} />
        ) : (
          (!isEmpty || isFiltering) && <GenericTable table={table} />
        )}
        {isEmpty ? <MembersEmptyState isFiltering={isFiltering} /> : null}
        <TablePagination table={table} />
      </DashboardLayout.SectionScrollContainer>
    </>
  );
}

function MemberList({members}: {members: WorkspaceMember[]}) {
  return (
    <Item.Group>
      {members.map(member => (
        <Item.Root key={member.id} variant="outline">
          <UserCell member={member} />
          <Item.Content>
            <RoleCell member={member} />
          </Item.Content>
          <Item.Actions>
            <RowActions member={member} />
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  );
}

function UserCell({member}: {member: WorkspaceMember}) {
  const {user} = useAuth();
  const isCurrentUser = member.id === user?.id;
  return (
    <Item.Root className="bg-transparent p-0" size="xs">
      <Item.Media>
        <Avatar.Root size="lg">
          {member.image ? <Avatar.Image src={member.image} alt="" /> : null}
          <Avatar.ColorFallback>{member.name}</Avatar.ColorFallback>
        </Avatar.Root>
      </Item.Media>
      <Item.Content>
        <Item.Row>
          <Item.Title>{member.name}</Item.Title>
          {isCurrentUser ? (
            <Badge variant="outline">
              <Trans message="You" />
            </Badge>
          ) : null}
        </Item.Row>
        <Item.Description>{member.email}</Item.Description>
      </Item.Content>
    </Item.Root>
  );
}

function RoleCell({member}: {member: WorkspaceMember}) {
  const {user} = useAuth();
  const query = useWorkspace();
  const workspace = query.data.data;
  const canUpdate = useHasWorkspacePermission(
    workspace,
    'workspace_members.update',
  );
  const isOwner = member.is_owner;
  const isCurrentUser = member.id === user?.id;

  if (!canUpdate || isOwner || isCurrentUser) {
    if (isOwner) {
      return <Trans message="Owner" />;
    }
    return <Trans message={member.role_name} />;
  }

  return <RoleSelector member={member} />;
}

function RoleSelector({member}: {member: WorkspaceMember}) {
  const query = useWorkspace();
  const workspace = query.data.data;
  const [value, setValue] = useState(`${member.role_id}`);
  const changeRole = useMutation(
    changeWorkspaceMemberRoleOptions(workspace.id),
  );
  const rolesQuery = useSuspenseQuery(listWorkspaceRolesOptions());
  const roles = rolesQuery.data.data;
  const role = roles.find(r => `${r.id}` === value);

  if (!role) {
    return <Trans message={member.role_name} />;
  }

  const handleChangeRole = (roleId: string) => {
    setValue(roleId);
    changeRole.mutate(
      {
        memberId: Number(member.member_id),
        roleId: Number(roleId),
      },
      {
        onSuccess: () => {
          toast.success(<Trans message="Role changed" />);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        render={
          <Button
            variant="outline"
            color="default"
            size="sm"
            disabled={changeRole.isPending}
            className="w-max"
          >
            <Trans message={role.name} />
            <ChevronDown />
          </Button>
        }
      />
      <Dropdown.Content>
        <Dropdown.RadioGroup value={value} onValueChange={handleChangeRole}>
          {roles.map(role => (
            <Dropdown.RadioItem value={`${role.id}`} key={role.id} closeOnClick>
              {role.name}
            </Dropdown.RadioItem>
          ))}
        </Dropdown.RadioGroup>
      </Dropdown.Content>
    </Dropdown>
  );
}

function RowActions({member}: {member: WorkspaceMember}) {
  const {user} = useAuth();
  const query = useWorkspace();
  const workspace = query.data.data;
  const canRemove = useHasWorkspacePermission(
    workspace,
    'workspace_members.delete',
  );
  const isOwner = member.is_owner;
  const isCurrentUser = member.id === user?.id;

  if (isOwner || (!isCurrentUser && !canRemove)) {
    return null;
  }

  if (isCurrentUser) {
    return (
      <LeaveWorkspaceDialog workspaceId={workspace.id}>
        <AlertDialog.Trigger
          render={<Button variant="ghost" color="danger" size="sm" />}
        >
          <Trans message="Leave" />
        </AlertDialog.Trigger>
      </LeaveWorkspaceDialog>
    );
  }

  return (
    <RemoveMemberDialog workspaceId={workspace.id} memberId={member.id}>
      <AlertDialog.Trigger
        render={<Button variant="ghost" color="danger" size="sm" />}
      >
        <Trans message="Remove" />
      </AlertDialog.Trigger>
    </RemoveMemberDialog>
  );
}

function MembersEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <Users />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching members" />
          ) : (
            <Trans message="This workspace does not have members yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Members will appear here when they join this workspace." />
          )}
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}
