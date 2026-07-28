import {Workspace} from '@app/gen/schemas/workspace';
import {auth, useAuth} from '@common/auth/use-auth';
import {PolicyFailMessagePopover} from '@common/billing/upgrade/policy-fail-message-popover';
import {queryClient} from '@common/http/query-client';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {DeleteWorkspaceDialog} from '@common/workspace/dialogs/delete-workspace-dialog';
import {LeaveWorkspaceDialog} from '@common/workspace/dialogs/leave-workspace-dialog';
import {UpdateWorkspaceDialog} from '@common/workspace/dialogs/update-workspace-dialog';
import {listWorkspacesOptions} from '@common/workspace/workspace-queries';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {Popover} from '@shadcn/popover/popover';
import {GenericTable} from '@shadcn/table/generic-table';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  Users,
  UsersIcon,
} from 'lucide-react';
import {use, useState} from 'react';
import {useNavigate} from 'react-router';
import {CreateWorkspaceDialog} from './dialogs/create-workspace-dialog';
import {useWorkspaceStore} from './workspace-store';

const columns: ColumnDef<Workspace>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Name" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <div className="flex items-center gap-2">
        <Avatar.Root size="sm">
          <Avatar.Image
            src={row.original.image ?? undefined}
            alt={row.original.name ?? ''}
          />
          <Avatar.ColorFallback>{row.original.name}</Avatar.ColorFallback>
        </Avatar.Root>
        <div className="truncate">{row.original.name}</div>
      </div>
    ),
  },
  {
    id: 'role',
    accessorFn: row =>
      row.members?.find(member => member.id === auth.user?.id)?.role_name,
    header: () => <Trans message="Your role" />,
    cell: ({row}) => {
      const currentUser = row.original.members?.find(
        member => member.id === auth.user?.id,
      );
      if (!currentUser) return null;
      return (
        <Badge variant="secondary">
          {row.original.is_personal ||
          row.original.owner_id === auth.user?.id ? (
            <Trans message="Owner" />
          ) : (
            <Trans message={currentUser.role_name || 'Member'} />
          )}
        </Badge>
      );
    },
  },
  {
    id: 'members_count',
    accessorKey: 'members_count',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Members" />
      </SortableHeader>
    ),
    cell: ({getValue}) => getValue() ?? 1,
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="sr-only">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <RowActionsDropdown workspace={row.original} />,
  },
];

export function Component() {
  const navigate = useNavigate();
  const {isMobileMode} = use(DashboardLayoutContext);
  const {queryState, setQueryState, isFiltering} = useTableQueryState();
  const query = useSuspenseQuery(listWorkspacesOptions());
  const items = query.data.data;

  const table = useTable({
    data: items,
    columns: columns,
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

  const visibleWorkspaces = table.getRowModel().rows.map(row => row.original);
  const isEmpty = table.getRowCount() === 0;

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Workspaces" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Workspaces" />
          </h1>
        </DashboardLayout.SectionTitle>
        <CreateWorkspaceButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput
            placeholder={message('Search workspaces...')}
            debounce={false}
          />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer>
          {isMobileMode
            ? (!isEmpty || isFiltering) && (
                <MobileWorkspacesList workspaces={visibleWorkspaces} />
              )
            : (!isEmpty || isFiltering) && (
                <GenericTable
                  onRowClick={row => navigate(`${row.original.id}`)}
                  table={table}
                />
              )}
          {isEmpty && <WorkspacesEmptyState isFiltering={isFiltering} />}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function CreateWorkspaceButton() {
  const [open, setOpen] = useState(false);
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);
  const {checkOverQuotaOrNoPermission} = useAuth();
  const query = useSuspenseQuery(listWorkspacesOptions());
  const workspaceCount = query.data.data.length;
  const failReason = checkOverQuotaOrNoPermission(
    'workspaces.create',
    'count',
    workspaceCount,
  );

  const handleChangeWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace.id);

    // invalidate everything after changing active workspace
    queryClient.invalidateQueries();
  };

  const button = (
    <Button variant="default" color="primary">
      <PlusIcon />
      <Trans message="Create new workspace" />
    </Button>
  );

  if (!failReason) {
    return (
      <CreateWorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={handleChangeWorkspace}
      >
        <Dialog.Trigger render={button} />
      </CreateWorkspaceDialog>
    );
  }

  return (
    <PolicyFailMessagePopover
      resourcesName={<Trans message="workspaces" />}
      reason={failReason}
      action="create"
    >
      <Popover.Trigger
        nativeButton={false}
        render={<span className="cursor-not-allowed opacity-50" />}
        openOnHover
        delay={0}
      >
        <span inert>{button}</span>
      </Popover.Trigger>
    </PolicyFailMessagePopover>
  );
}

function RowActionsDropdown({workspace}: {workspace: Workspace}) {
  const {user} = useAuth();
  const navigate = useNavigate();
  const isOwner = workspace.owner_id === user?.id;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  return (
    <>
      <DeleteWorkspaceDialog
        workspaceId={workspace.id}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      <UpdateWorkspaceDialog
        workspace={workspace}
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
      />
      <LeaveWorkspaceDialog
        workspaceId={workspace.id}
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
      />
      <Dropdown>
        <Dropdown.Trigger
          render={<Button variant="ghost" color="default" size="icon" />}
        >
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <Dropdown.Item onClick={() => navigate(`${workspace.id}`)}>
            <UsersIcon />
            <Trans message="Members" />
          </Dropdown.Item>
          {isOwner ? (
            <>
              <Dropdown.Item onClick={() => setUpdateDialogOpen(true)}>
                <PencilIcon />
                <Trans message="Edit" />
              </Dropdown.Item>
              {!workspace.is_personal && (
                <Dropdown.Item
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2Icon />
                  <Trans message="Delete" />
                </Dropdown.Item>
              )}
            </>
          ) : (
            <Dropdown.Item
              variant="destructive"
              onClick={() => setLeaveDialogOpen(true)}
            >
              <Trans message="Leave" />
            </Dropdown.Item>
          )}
        </Dropdown.Content>
      </Dropdown>
    </>
  );
}

function MobileWorkspacesList({workspaces}: {workspaces: Workspace[]}) {
  return (
    <Item.Group>
      {workspaces.map(workspace => {
        const currentUser = workspace.members?.find(
          member => member.id === auth.user?.id,
        );

        return (
          <Item.Root
            key={workspace.id}
            variant="outline"
            className="cursor-pointer"
          >
            <Item.Media>
              <Avatar.Root className="size-10">
                {workspace.image ? (
                  <Avatar.Image src={workspace.image} alt={workspace.name} />
                ) : null}
                <Avatar.ColorFallback>{workspace.name}</Avatar.ColorFallback>
              </Avatar.Root>
            </Item.Media>
            <Item.Content>
              <Item.Title>{workspace.name}</Item.Title>
              <Item.Row className="mt-1 gap-1 text-sm text-muted-foreground">
                <Badge variant="secondary">
                  <Trans message={currentUser?.role_name || 'Member'} />
                </Badge>
                <span>
                  <span className="mr-1">&bull;</span>
                  <Trans
                    message=":count members"
                    values={{count: workspace.members_count ?? 1}}
                  />
                </span>
              </Item.Row>
            </Item.Content>
            <Item.Actions>
              <RowActionsDropdown workspace={workspace} />
            </Item.Actions>
          </Item.Root>
        );
      })}
    </Item.Group>
  );
}

function WorkspacesEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <Users />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching workspaces" />
          ) : (
            <Trans message="No workspaces have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Create a workspace to collaborate with teammates." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <CreateWorkspaceButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
