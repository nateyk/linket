import {ArchiveFoldersDialog} from '@app/dashboard/folders/folders-datatable-page/archive-folders-dialog';
import {DeleteFoldersDialog} from '@app/dashboard/folders/folders-datatable-page/delete-folders-dialog';
import {FolderCard} from '@app/dashboard/folders/folders-datatable-page/folder-card';
import {folderSortOptions} from '@app/dashboard/folders/folders-datatable-page/folder-sort-options';
import {
  exportFoldersCsvOptions,
  listFoldersOptions,
} from '@app/dashboard/folders/folders-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Folder} from '@app/gen/schemas/folder';
import {AdHost} from '@common/admin/ads/ad-host';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {CsvExportInfoDialog} from '@common/datatable/csv-export/csv-export-info-dialog';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Footer} from '@common/ui/footer/footer';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Popover} from '@shadcn/popover/popover';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSortButton} from '@shadcn/table/utils/table-sort-button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {
  ArchiveIcon,
  CircleQuestionMarkIcon,
  DownloadIcon,
  FolderIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {CreateFolderDialog} from './crupdate/create-folder-dialog';
import {FoldersDatatableFilters} from './folders-datatable-filters';

export function Component() {
  const {links} = useSettings();
  const {routeType, isForCurrentUser} = useDatatableRouteType();
  const filters = useMemo(() => {
    return !isForCurrentUser
      ? FoldersDatatableFilters
      : FoldersDatatableFilters.filter(filter => filter.key !== 'user_id');
  }, [isForCurrentUser]);

  const [selectedFolders, setSelectedFolders] = useState<Folder[]>([]);
  const toggleFolder = (folder: Folder) => {
    setSelectedFolders(prev =>
      prev.some(item => item.id === folder.id)
        ? prev.filter(item => item.id !== folder.id)
        : [...prev, folder],
    );
  };

  const {queryState, setQueryState, isFiltering, searchParams, isLoading} =
    useTableQueryState({filters});

  const query = useSuspenseQuery(listFoldersOptions(routeType, searchParams));
  const items = query.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Folders" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <NewFolderButton />
      </DashboardLayout.SectionHeader>
      {selectedFolders.length > 0 ? (
        <SelectedActionsToolbar
          selectedFolders={selectedFolders}
          setSelectedFolders={setSelectedFolders}
          onSelectAll={
            items.length > selectedFolders.length
              ? () => setSelectedFolders(items)
              : undefined
          }
        />
      ) : null}
      <DashboardLayout.SectionContent>
        <AdHost slot="dashboard" className="mb-6" />
        <DashboardLayout.SectionContentHeader>
          <AddFilterPopover filters={filters} />
          <TableSortButton
            className="mr-auto"
            sortDescriptor={queryState.sort}
            onSortChange={sort => setQueryState({sort})}
            sortOptions={folderSortOptions}
          />
          <ExportButton />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={filters} />
        <DashboardLayout.SectionScrollContainer className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map(folder => (
              <FolderCard
                key={folder.id}
                folder={folder}
                isSelected={selectedFolders.some(item => item.id === folder.id)}
                onToggle={() => toggleFolder(folder)}
                onDelete={() => setSelectedFolders([])}
              />
            ))}
          </div>
          <BackendPagination
            response={query.data}
            onPageChange={page => setQueryState({page})}
            onPageSizeChange={perPage => setQueryState({per_page: perPage})}
          />
          {items.length === 0 && (
            <FoldersEmptyState isFiltering={isFiltering} />
          )}
        </DashboardLayout.SectionScrollContainer>
        {links?.dash_footer && <Footer padding="mt-11" />}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

type SelectedActionsToolbarProps = {
  selectedFolders: Folder[];
  setSelectedFolders: (folders: Folder[]) => void;
  onSelectAll?: () => void;
};

function SelectedActionsToolbar({
  selectedFolders,
  setSelectedFolders,
  onSelectAll,
}: SelectedActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const unarchive = selectedFolders.every(folder => folder.deleted_at != null);

  return (
    <DashboardLayout.FloatingActions
      selectedItemsCount={selectedFolders.length}
      onClear={() => setSelectedFolders([])}
      onSelectAll={onSelectAll}
    >
      <PermissionAwareButton resource="folder" action="delete">
        <ArchiveFoldersDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          folders={selectedFolders}
          unarchive={unarchive}
          onSuccess={() => setSelectedFolders([])}
        >
          <AlertDialog.Trigger
            render={<Button variant="outline" size="sm" />}
          >
            <ArchiveIcon />
            {unarchive ? (
              <Trans message="Unarchive" />
            ) : (
              <Trans message="Archive" />
            )}
          </AlertDialog.Trigger>
        </ArchiveFoldersDialog>
      </PermissionAwareButton>
      <PermissionAwareButton resource="folder" action="delete">
        <DeleteFoldersDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          folderIds={selectedFolders.map(folder => folder.id)}
          onDelete={() => setSelectedFolders([])}
        >
          <Dialog.Trigger
            render={<Button variant="outline" color="danger" size="sm" />}
          >
            <TrashIcon />
            <Trans message="Delete" />
          </Dialog.Trigger>
        </DeleteFoldersDialog>
      </PermissionAwareButton>
    </DashboardLayout.FloatingActions>
  );
}

function ExportButton() {
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const {routeType} = useDatatableRouteType();
  const exportCsv = useMutation(
    exportFoldersCsvOptions({type: routeType === 'admin' ? 'all' : 'current'}),
  );

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
        <DownloadIcon data-icon="inline-start" />
        <Trans message="Export" />
      </Button>
      <CsvExportInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </>
  );
}

function NewFolderButton() {
  return (
    <PermissionAwareButton resource="folder" action="create">
      <CreateFolderDialog>
        <Dialog.Trigger render={<Button variant="default" color="primary" />}>
          <PlusIcon data-icon="inline-start" />
          <Trans message="New folder" />
        </Dialog.Trigger>
      </CreateFolderDialog>
    </PermissionAwareButton>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="prose w-auto gap-0">
          <div className="mb-1 font-medium">
            <Trans message="Put links in a folder to:" />
          </div>
          <ul className="mt-0 list-inside list-disc ps-0 whitespace-nowrap">
            <li>
              <Trans message="Simplify multiple link management." />
            </li>
            <li>
              <Trans message="View aggregated clicks report for the whole folder." />
            </li>
            <li>
              <Trans message="Redirect to a random link from within the folder." />
            </li>
            <li>
              <Trans message="Share all urls in the folder with one short link." />
            </li>
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FoldersEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <FolderIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching folders" />
          ) : (
            <Trans message="No folders yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by creating a new folder." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <NewFolderButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
