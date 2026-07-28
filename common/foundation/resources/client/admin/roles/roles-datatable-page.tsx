import {AdminDocsUrls} from '@app/admin/admin-config';
import {Role} from '@app/gen/schemas/role';
import {
  deleteRoleOptions,
  exportRolesCsvOptions,
  listRolesOptions,
} from '@common/admin/roles/roles-queries';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SiteConfigContext} from '@common/core/settings/site-config-context';
import {CsvExportInfoDialog} from '@common/datatable/csv-export/csv-export-info-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button, LinkButton} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {GenericTable} from '@shadcn/table/generic-table';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {Tabs} from '@shadcn/tabs/tabs';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {DeleteIcon} from '@ui/icons/material/Delete';
import {EditIcon} from '@ui/icons/material/Edit';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {DownloadIcon, EllipsisIcon, PlusIcon, ShieldIcon} from 'lucide-react';
import {use, useMemo, useState} from 'react';
import {Link} from 'react-router';

export const columns: ColumnDef<Role>[] = [
  {
    id: 'name',
    accessorFn: role => role.name,
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Role" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const role = row.original;
      return (
        <>
          <div className="flex items-center gap-2">
            <Trans message={role.name} />
            {role.internal && (
              <Badge variant="secondary">
                <Trans message="Internal" />
              </Badge>
            )}
          </div>
          <div className="overflow-x-hidden text-xs text-ellipsis text-muted-foreground">
            {role.description ? (
              <Trans message={role.description} />
            ) : undefined}
          </div>
        </>
      );
    },
  },
  {
    id: 'created_at',
    size: 1,
    accessorKey: 'created_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Created at" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <time>
        <FormattedDate date={row.original.created_at} />
      </time>
    ),
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="hidden">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <ActionsColumn role={row.original} />,
  },
];

export function Component() {
  const navigate = useNavigate();
  const isMobile = useIsMobileMediaQuery();

  const {queryState, setQueryState, isFiltering, searchParams} =
    useTableQueryState();

  const query = useSuspenseQuery(listRolesOptions());

  const siteConfig = use(SiteConfigContext);
  const roleTypes = siteConfig.roles?.types;
  const selectedRoleType =
    typeof searchParams.type === 'string' ? searchParams.type : 'users';
  const items = useMemo(
    () => query.data.data.filter(r => r.type === selectedRoleType),
    [query.data.data, selectedRoleType],
  );

  const roleTypeTabs = roleTypes?.length ? (
    <Tabs.Root value={selectedRoleType}>
      <div className="mx-5 border-b">
        <Tabs.List variant="line">
          {roleTypes.map(roleType => (
            <Tabs.LinkTab
              key={roleType.type}
              className="min-w-24"
              value={roleType.type}
              to={`/admin/roles?type=${roleType.type}`}
              replace
            >
              {roleType.label}
            </Tabs.LinkTab>
          ))}
        </Tabs.List>
      </div>
    </Tabs.Root>
  ) : null;

  const table = useTable({
    data: items,
    columns: columns,
    enableRowSelection: false,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    isClientSide: true,
    globalFilter: queryState.query,
    pagination: {
      per_page: queryState.per_page,
      page: queryState.page,
    },
    onPaginationChange: pagination => setQueryState({...pagination}),
  });
  const visibleRoles = table.getRowModel().rows.map(row => row.original);
  const isEmpty = table.getRowCount() === 0;

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Roles" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader
        className={roleTypeTabs ? 'border-none' : undefined}
      >
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Roles" />
          </h1>
        </DashboardLayout.SectionTitle>
        <DocsLink variant="button" link={AdminDocsUrls.pages.roles} />
        <AddNewRoleButton type={selectedRoleType} />
      </DashboardLayout.SectionHeader>
      {roleTypeTabs}
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput className="mr-auto" debounce={false} />
          <ExportButton />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer>
          {isMobile ? (
            <RoleList roles={visibleRoles} />
          ) : (
            (!isEmpty || isFiltering) && (
              <GenericTable
                table={table}
                onRowClick={row => navigate(`${row.original.id}/edit`)}
              />
            )
          )}
          {isEmpty ? (
            <RolesEmptyState
              isFiltering={isFiltering}
              newRoleType={selectedRoleType}
            />
          ) : null}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function RoleList({roles}: {roles: Role[]}) {
  return (
    <Item.Group>
      {roles.map(role => (
        <Item.Root key={role.id} variant="outline">
          <Item.Content>
            <Item.Row className="gap-2">
              <Item.Title>
                <Trans message={role.name} />
              </Item.Title>
              {role.internal && (
                <Badge variant="secondary">
                  <Trans message="Internal" />
                </Badge>
              )}
            </Item.Row>
            <Item.Description>
              {role.description && (
                <>
                  <Trans message={role.description} />
                  {' • '}
                </>
              )}
              <FormattedDate date={role.created_at} />
            </Item.Description>
          </Item.Content>
          <Item.Actions className="shrink-0 md:ml-0">
            <ActionsColumn role={role} />
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  );
}

interface ActionsColumnProps {
  role: Role;
}
function ActionsColumn({role}: ActionsColumnProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <DeleteRoleDialog
        roleId={role.id}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
          <EllipsisIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.LinkItem render={<Link to={`${role.id}/edit`} />}>
            <EditIcon />
            <Trans message="Edit" />
          </Dropdown.LinkItem>
          <Dropdown.Item
            variant="destructive"
            disabled={role.internal}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <DeleteIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}

type DeleteRoleDialogProps = {
  roleId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
function DeleteRoleDialog({roleId, open, onOpenChange}: DeleteRoleDialogProps) {
  const deleteRoles = useMutation(deleteRoleOptions);

  const handleDelete = () => {
    deleteRoles.mutate(roleId, {
      onSuccess: () => {
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
            <AlertDialog.Media>
              <ShieldIcon />
            </AlertDialog.Media>
            <AlertDialog.Title>
              <Trans message="Delete role" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this role?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleteRoles.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteRoles.isPending}
              onClick={handleDelete}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function AddNewRoleButton({type}: {type: string}) {
  return (
    <LinkButton variant="default" color="primary" to={`new?type=${type}`}>
      <PlusIcon />
      <Trans message="Add new role" />
    </LinkButton>
  );
}

function ExportButton() {
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const exportCsv = useMutation(exportRolesCsvOptions());

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

function RolesEmptyState({
  isFiltering,
  newRoleType,
}: {
  isFiltering: boolean;
  newRoleType: string;
}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <ShieldIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching roles" />
          ) : (
            <Trans message="No roles have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by adding your first role." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <AddNewRoleButton type={newRoleType} />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
