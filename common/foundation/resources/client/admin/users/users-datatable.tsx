import {User} from '@app/gen/schemas/user';
import {CreateUserDialog} from '@common/admin/users/create-user-dialog';
import {
  UserActionsButton,
  userDatatableColumns,
} from '@common/admin/users/users-datatable-columns';
import {UserDatatableFilters} from '@common/admin/users/users-datatable-filters';
import {
  exportUsersCsvOptions,
  listUsersForDatatableOptions,
  usersBaseKey,
} from '@common/admin/users/users-queries';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {CsvExportInfoDialog} from '@common/datatable/csv-export/csv-export-info-dialog';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient, queryClient} from '@common/http/query-client';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {GenericTable} from '@shadcn/table/generic-table';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {VisibilityState} from '@tanstack/react-table';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {CheckIcon} from '@ui/icons/material/Check';
import {useSettings} from '@ui/settings/use-settings';
import {toast} from '@ui/toast/toast';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {
  BanIcon,
  DownloadIcon,
  PlusIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import {use, useState} from 'react';
import {useNavigate} from 'react-router';

export function Component() {
  const {billing} = useSettings();
  const navigate = useNavigate();
  const {isMobileMode} = use(DashboardLayoutContext);

  const [visibleColumns, setVisibleColumns] = useState<VisibilityState>(
    billing?.enable ? {} : {subscribed: false},
  );

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState({filters: UserDatatableFilters});

  const query = useSuspenseQuery(
    listUsersForDatatableOptions(deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: userDatatableColumns,
    enableMultiRowSelection: true,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    selectedRows,
    onSelectedRowsChange: setSelectedRows,
    visibleColumns,
    onColumnVisibilityChange: setVisibleColumns,
    pagination: {
      per_page: queryState.per_page,
      page: queryState.page,
    },
    onPaginationChange: pagination => setQueryState({...pagination}),
    response: query.data,
  });

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Users" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Users" />
          </h1>
        </DashboardLayout.SectionTitle>
        <AddNewUserButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <AddFilterPopover
            filters={UserDatatableFilters}
            className="mr-auto"
          />
          <ExportButton />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={UserDatatableFilters} />
        <DashboardLayout.SectionScrollContainer>
          {isMobileMode ? (
            <MobileUsersList users={items} />
          ) : (
            <GenericTable
              table={table}
              onRowClick={row => {
                navigate(`/admin/users/${row.original.id}/details`);
              }}
            />
          )}

          {!items?.length && <UsersEmptyState isFiltering={isFiltering} />}

          <BackendPagination
            response={query.data}
            disabled={isLoading}
            onPageChange={page => setQueryState({page})}
            onPageSizeChange={perPage => setQueryState({per_page: perPage})}
          />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
      <SelectedActionsToolbar
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      />
    </DashboardLayout.MainSection>
  );
}

function SelectedActionsToolbar({
  selectedRows,
  setSelectedRows,
}: {
  selectedRows: (number | string)[];
  setSelectedRows: (rows: number[]) => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!selectedRows.length) {
    return null;
  }

  return (
    <DashboardLayout.FloatingActions
      selectedItemsCount={selectedRows.length}
      onClear={() => setSelectedRows([])}
    >
      <AlertDialog.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialog.Trigger
          render={<Button variant="outline" color="danger" />}
        >
          <Trans message="Delete" />
        </AlertDialog.Trigger>
        <DeleteUsersDialog
          selectedIds={selectedRows}
          onDelete={() => {
            setSelectedRows([]);
            setIsDeleteDialogOpen(false);
          }}
        />
      </AlertDialog.Root>
    </DashboardLayout.FloatingActions>
  );
}

interface DeleteUsersDialogProps {
  selectedIds: (number | string)[];
  onDelete: () => void;
}
export function DeleteUsersDialog({
  selectedIds,
  onDelete,
}: DeleteUsersDialogProps) {
  const deleteSelectedUsers = useMutation({
    mutationFn: () => apiClient.delete(`users/${selectedIds.join(',')}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: usersBaseKey,
      });
      toast(message('Users deleted'));
      onDelete();
    },
    onError: err => showHttpErrorToast(err),
  });
  return (
    <AlertDialog.Portal>
      <AlertDialog.Backdrop />
      <AlertDialog.Content size="sm">
        <AlertDialog.Header>
          <AlertDialog.Media>
            <UserIcon />
          </AlertDialog.Media>
          <AlertDialog.Title>
            <Trans message="Delete users" />
          </AlertDialog.Title>
          <AlertDialog.Description>
            <Trans message="Are you sure you want to delete selected users?" />
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel disabled={deleteSelectedUsers.isPending}>
            <Trans message="Cancel" />
          </AlertDialog.Cancel>
          <AlertDialog.Action
            color="danger"
            disabled={deleteSelectedUsers.isPending}
            onClick={() => deleteSelectedUsers.mutate()}
          >
            <Trans message="Delete" />
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  );
}

function AddNewUserButton() {
  return (
    <CreateUserDialog>
      <Dialog.Trigger render={<Button variant="default" color="primary" />}>
        <PlusIcon />
        <Trans message="Add new user" />
      </Dialog.Trigger>
    </CreateUserDialog>
  );
}

function ExportButton() {
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const exportCsv = useMutation(exportUsersCsvOptions());

  const handleCsvExport = () => {
    exportCsv.mutate(undefined, {
      onSuccess: response => {
        if (response.downloadPath) {
          downloadFileFromUrl(response.downloadPath);
        } else {
          setInfoDialogOpen(true);
        }
      },
    });
  };

  return (
    <>
      <Button variant="outline" onClick={handleCsvExport}>
        <DownloadIcon />
        <Trans message="Export" />
      </Button>
      <CsvExportInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </>
  );
}

function UsersEmptyState({isFiltering}: {isFiltering: boolean}) {
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
            <Trans message="No users have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by adding your first user." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <AddNewUserButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

function MobileUsersList({users}: {users: User[]}) {
  return (
    <Item.Group>
      {users.map(user => {
        const hasSubscription = user.subscription?.valid;
        const hasSuspension = Boolean(user.banned_at);

        return (
          <Item.Root key={user.id} variant="outline">
            <Item.Media>
              <Avatar.Root className="size-10">
                <Avatar.Image
                  src={user.image ?? undefined}
                  alt={user.name ?? ''}
                />
                <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
              </Avatar.Root>
            </Item.Media>
            <Item.Content>
              <Item.Title>{user.name}</Item.Title>
              <Item.Row className="mt-1 gap-1 text-sm text-muted-foreground">
                {user.roles?.slice(0, 1).map(role => (
                  <Badge
                    key={role.id}
                    variant="secondary"
                    className="capitalize"
                  >
                    <Trans message={role.name} />
                  </Badge>
                ))}
                {user.latest_user_session && (
                  <span>
                    <span className="mr-1">&bull;</span>
                    <FormattedRelativeTime
                      date={user.latest_user_session.updated_at}
                      style="narrow"
                    />
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-3">
                  {hasSubscription && (
                    <CheckIcon
                      className="size-4 text-positive"
                      aria-label="Subscribed"
                    />
                  )}
                  {hasSuspension && (
                    <BanIcon
                      className="size-4 text-destructive"
                      aria-label="Suspended"
                    />
                  )}
                </span>
              </Item.Row>
            </Item.Content>
            <Item.Actions className="shrink-0 md:ml-0">
              <UserActionsButton user={user} />
            </Item.Actions>
          </Item.Root>
        );
      })}
    </Item.Group>
  );
}
