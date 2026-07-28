import {AdminDocsUrls} from '@app/admin/admin-config';
import {FileEntry} from '@app/gen/schemas/file-entry';
import {
  fileEntriesDatatableColumns,
  PreviewFileButton,
} from '@common/admin/file-entry/file-entries-datatable-columns';
import {FileEntriesDatatableFilters} from '@common/admin/file-entry/file-entries-datatable-filters';
import {
  deleteFileEntriesOptions,
  listFileEntriesOptions,
} from '@common/admin/file-entry/file-entries-queries';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {FileTypeIcon} from '@common/uploads/components/file-type-icon/file-type-icon';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {Trans} from '@ui/i18n/trans';
import {UploadIcon} from 'lucide-react';
import {use, useState} from 'react';

export function Component() {
  const {isMobileMode} = use(DashboardLayoutContext);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState({filters: FileEntriesDatatableFilters});

  const query = useSuspenseQuery(listFileEntriesOptions(deferredSearchParams));
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: fileEntriesDatatableColumns,
    enableMultiRowSelection: true,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    selectedRows,
    onSelectedRowsChange: setSelectedRows,
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
        <Trans message="Uploaded files and folders" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Uploaded files and folders" />
          </h1>
        </DashboardLayout.SectionTitle>
        <DocsLink variant="button" link={AdminDocsUrls.pages.files} />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <AddFilterPopover
            filters={FileEntriesDatatableFilters}
            className="mr-auto"
          />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={FileEntriesDatatableFilters} />
        <DashboardLayout.SectionScrollContainer>
          {isMobileMode ? (
            <MobileFileEntriesList entries={items} />
          ) : (
            <GenericTable table={table} />
          )}
          {!items.length && <FileEntryEmptyState isFiltering={isFiltering} />}
          <TablePagination table={table} />
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
  selectedRows: number[];
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
        <DeleteEntriesDialog
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

interface DeleteEntriesDialogProps {
  selectedIds: number[];
  onDelete: () => void;
}
function DeleteEntriesDialog({
  selectedIds,
  onDelete,
}: DeleteEntriesDialogProps) {
  const deleteSelectedEntries = useMutation(deleteFileEntriesOptions);

  const handleDelete = () => {
    deleteSelectedEntries.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(<Trans message="File entries deleted" />);
        onDelete();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Portal>
      <AlertDialog.Backdrop />
      <AlertDialog.Content size="sm">
        <AlertDialog.Header>
          <AlertDialog.Media>
            <UploadIcon />
          </AlertDialog.Media>
          <AlertDialog.Title>
            <Trans message="Delete file entries" />
          </AlertDialog.Title>
          <AlertDialog.Description>
            <Trans
              message="Are you sure you want to delete selected file entries?"
              values={{count: selectedIds.length}}
            />
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel disabled={deleteSelectedEntries.isPending}>
            <Trans message="Cancel" />
          </AlertDialog.Cancel>
          <AlertDialog.Action
            color="danger"
            disabled={deleteSelectedEntries.isPending}
            onClick={() => handleDelete()}
          >
            <Trans message="Delete" />
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  );
}

function FileEntryEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <UploadIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching files or folders" />
          ) : (
            <Trans message="Nothing has been uploaded yet" />
          )}
        </Empty.Title>
        {isFiltering ? (
          <Empty.Description>
            <Trans message="Try another search query or different filters." />
          </Empty.Description>
        ) : null}
      </Empty.Header>
    </Empty.Root>
  );
}

function MobileFileEntriesList({entries}: {entries: FileEntry[]}) {
  return (
    <Item.Group>
      {entries.map(entry => {
        const owner =
          entry.users?.find(user => user.owns_entry) ?? entry.users?.[0];

        return (
          <Item.Root key={entry.id} variant="outline">
            {entry.type ? (
              <Item.Media>
                <FileTypeIcon
                  type={entry.type}
                  className="size-10 overflow-hidden"
                />
              </Item.Media>
            ) : null}
            <Item.Content>
              <Item.Title>{entry.name}</Item.Title>
              <Item.Row className="truncate text-sm text-muted-foreground">
                {owner?.email}
                {entry.file_size != null && (
                  <>
                    <span>&bull;</span>
                    <FormattedBytes bytes={entry.file_size} />
                  </>
                )}
              </Item.Row>
            </Item.Content>
            <Item.Actions>
              <PreviewFileButton entry={entry} />
            </Item.Actions>
          </Item.Root>
        );
      })}
    </Item.Group>
  );
}
