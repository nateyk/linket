import {WorkspaceInvite} from '@app/gen/schemas/workspace-invite';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useHasWorkspacePermission} from '@common/workspace/use-has-workspace-permission';
import {
  changeWorkspaceInviteRoleOptions,
  deleteWorkspaceInviteOptions,
  listWorkspaceRolesOptions,
  resendWorkspaceInviteOptions,
  retrieveWorkspaceOptions,
} from '@common/workspace/workspace-queries';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Avatar} from '@shadcn/avatar/avatar';
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
import {
  ChevronDown,
  MoreVertical,
  SendIcon,
  UserPlus,
  UserXIcon,
} from 'lucide-react';
import {useMemo, useState} from 'react';

function useWorkspace() {
  const {workspaceId} = useRequiredParams(['workspaceId']);
  return useSuspenseQuery(retrieveWorkspaceOptions(Number(workspaceId)));
}

const columns: ColumnDef<WorkspaceInvite>[] = [
  {
    id: 'user',
    accessorFn: invite => `${invite.name} ${invite.email}`,
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="User" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <div className="flex min-w-0 items-center">
        <UserCell invite={row.original} />
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
    cell: ({row}) => <RoleCell invite={row.original} />,
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="sr-only">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <RowActions invite={row.original} />,
  },
];

export function Component() {
  const isMobile = useIsMobileMediaQuery();
  const {queryState, setQueryState, isFiltering} = useTableQueryState();
  const query = useWorkspace();
  const workspace = query.data.data;
  const items = useMemo(() => workspace.invites ?? [], [workspace.invites]);

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

  const visibleInvites = table.getRowModel().rows.map(row => row.original);
  const isEmpty = table.getRowCount() === 0;

  return (
    <>
      <DashboardLayout.SectionContentHeader>
        <TableSearchInput
          className="mr-auto"
          placeholder={message('Search invites...')}
          debounce={false}
        />
      </DashboardLayout.SectionContentHeader>
      <DashboardLayout.SectionScrollContainer>
        {isMobile ? (
          <InviteList invites={visibleInvites} />
        ) : (
          (!isEmpty || isFiltering) && <GenericTable table={table} />
        )}
        {isEmpty ? <InvitesEmptyState isFiltering={isFiltering} /> : null}
        <TablePagination table={table} />
      </DashboardLayout.SectionScrollContainer>
    </>
  );
}

function InviteList({invites}: {invites: WorkspaceInvite[]}) {
  return (
    <Item.Group>
      {invites.map(invite => (
        <Item.Root key={invite.id} variant="outline">
          <UserCell invite={invite} />
          <Item.Content>
            <RoleCell invite={invite} />
          </Item.Content>
          <Item.Actions>
            <RowActions invite={invite} />
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  );
}

function UserCell({invite}: {invite: WorkspaceInvite}) {
  return (
    <Item.Root className="bg-transparent p-0" size="xs">
      <Item.Media>
        <Avatar.Root size="lg">
          {invite.image ? <Avatar.Image src={invite.image} alt="" /> : null}
          <Avatar.ColorFallback>
            {invite.name || invite.email}
          </Avatar.ColorFallback>
        </Avatar.Root>
      </Item.Media>
      <Item.Content>
        <Item.Title>{invite.name}</Item.Title>
        <Item.Description>{invite.email}</Item.Description>
      </Item.Content>
    </Item.Root>
  );
}

function RoleCell({invite}: {invite: WorkspaceInvite}) {
  const query = useWorkspace();
  const workspace = query.data.data;
  const canUpdate = useHasWorkspacePermission(
    workspace,
    'workspace_members.update',
  );

  if (!canUpdate) {
    return <Trans message={invite.role_name} />;
  }

  return <RoleSelector invite={invite} />;
}

function RoleSelector({invite}: {invite: WorkspaceInvite}) {
  const query = useWorkspace();
  const workspace = query.data.data;
  const [value, setValue] = useState(`${invite.role_id}`);
  const changeRole = useMutation(
    changeWorkspaceInviteRoleOptions(workspace.id),
  );
  const rolesQuery = useSuspenseQuery(listWorkspaceRolesOptions());
  const roles = rolesQuery.data.data;
  const role = roles.find(r => `${r.id}` === value);

  if (!role) {
    return <Trans message={invite.role_name} />;
  }

  const handleChangeRole = (roleId: string) => {
    setValue(roleId);
    changeRole.mutate(
      {
        inviteId: invite.id,
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

function RowActions({invite}: {invite: WorkspaceInvite}) {
  const query = useWorkspace();
  const workspace = query.data.data;
  const canInvite = useHasWorkspacePermission(
    workspace,
    'workspace_members.invite',
  );
  const canDelete = useHasWorkspacePermission(
    workspace,
    'workspace_members.delete',
  );

  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  if (!canInvite && !canDelete) {
    return null;
  }

  return (
    <>
      <ResendInviteDialog
        workspaceId={workspace.id}
        inviteId={invite.id}
        open={resendDialogOpen}
        onOpenChange={setResendDialogOpen}
      />
      <CancelInviteDialog
        inviteId={invite.id}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
      <Dropdown>
        <Dropdown.Trigger
          render={<Button variant="ghost" color="default" size="icon" />}
        >
          <MoreVertical />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          {canInvite ? (
            <Dropdown.Item onClick={() => setResendDialogOpen(true)}>
              <SendIcon />
              <Trans message="Re-send invite" />
            </Dropdown.Item>
          ) : null}
          {canDelete ? (
            <Dropdown.Item onClick={() => setCancelDialogOpen(true)}>
              <UserXIcon />
              <Trans message="Cancel invite" />
            </Dropdown.Item>
          ) : null}
        </Dropdown.Content>
      </Dropdown>
    </>
  );
}

function ResendInviteDialog({
  workspaceId,
  inviteId,
  open,
  onOpenChange,
}: {
  workspaceId: number;
  inviteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const resendInvite = useMutation(resendWorkspaceInviteOptions(workspaceId));

  const handleResend = () => {
    resendInvite.mutate(inviteId, {
      onSuccess: () => {
        toast.success(<Trans message="Invite sent" />);
        onOpenChange(false);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Resend invite" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to send this invite again?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={resendInvite.isPending}
              onClick={handleResend}
            >
              <Trans message="Send" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function CancelInviteDialog({
  inviteId,
  open,
  onOpenChange,
}: {
  inviteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelInvite = useMutation(deleteWorkspaceInviteOptions());

  const handleCancel = () => {
    cancelInvite.mutate(inviteId, {
      onSuccess: () => {
        toast.success(<Trans message="Invite cancelled" />);
        onOpenChange(false);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Cancel invite" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to cancel this invite?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={cancelInvite.isPending}
              onClick={handleCancel}
            >
              <Trans message="Cancel invite" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function InvitesEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <UserPlus />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching invites" />
          ) : (
            <Trans message="This workspace does not have pending invites" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Invites will appear here after they are sent." />
          )}
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}
