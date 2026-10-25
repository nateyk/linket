import {CreateMultipleLinksDialog} from '@app/dashboard/links/dialogs/create-multiple-links-dialog';
import {UpdateLinksFolderDialog} from '@app/dashboard/links/dialogs/update-links-folder-dialog';
import {LinkCard} from '@app/dashboard/links/links-datatable-page/link-card';
import {linkSortOptions} from '@app/dashboard/links/links-datatable-page/link-sort-options';
import {
  LinksDataTableViewModeButton,
  useLinksDataTableViewMode,
} from '@app/dashboard/links/links-datatable-page/links-datatable-view-mode-button';
import {LinksFloatingActions} from '@app/dashboard/links/links-datatable-page/links-floating-actions';
import {
  exportLinksCsvOptions,
  listLinksOptions,
} from '@app/dashboard/links/links-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Folder} from '@app/gen/schemas/folder';
import {Link} from '@app/gen/schemas/link';
import {AdHost} from '@common/admin/ads/ad-host';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {CsvExportInfoDialog} from '@common/datatable/csv-export/csv-export-info-dialog';
import {AddFilterButton} from '@common/datatable/filters/add-filter-button';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Footer} from '@common/ui/footer/footer';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSortButton} from '@shadcn/table/utils/table-sort-button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {
  ChevronDownIcon,
  DownloadIcon,
  FileStackIcon,
  FolderIcon,
  LinkIcon,
  PlusIcon,
} from 'lucide-react';
import {use, useMemo, useState} from 'react';
import {CreateLinkDialog} from '../dialogs/create-link-dialog';
import {LinksDatatableFilters} from './links-datatable-filters';

export function Component() {
  const {links} = useSettings();
  const {routeType, isForCurrentUser} = useDatatableRouteType();
  const [viewMode] = useLinksDataTableViewMode();

  const filters = useMemo(() => {
    return !isForCurrentUser
      ? LinksDatatableFilters
      : LinksDatatableFilters.filter(filter => filter.key !== 'user_id');
  }, [isForCurrentUser]);

  const [selectedLinks, setSelectedLinks] = useState<Link[]>([]);
  const toggleLink = (link: Link) => {
    setSelectedLinks(prev =>
      prev.some(item => item.id === link.id)
        ? prev.filter(item => item.id !== link.id)
        : [...prev, link],
    );
  };

  const {queryState, setQueryState, isFiltering, searchParams, isLoading} =
    useTableQueryState({filters});

  const query = useSuspenseQuery(listLinksOptions(routeType, searchParams));

  const items = query.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Links" />
        </DashboardLayout.SectionTitle>
        <NewLinkButton />
      </DashboardLayout.SectionHeader>
      {selectedLinks.length > 0 ? (
        <LinksFloatingActions
          selectedLinks={selectedLinks}
          setSelectedLinks={setSelectedLinks}
          onSelectAll={
            items.length > selectedLinks.length
              ? () => setSelectedLinks(items)
              : undefined
          }
        >
          <PermissionAwareButton resource="link" action="update">
            <UpdateLinksFolderDialog
              linkIds={selectedLinks.map(link => link.id)}
              onSuccess={() => setSelectedLinks([])}
            >
              <Dialog.Trigger render={<Button variant="outline" size="sm" />}>
                <FolderIcon />
                <Trans message="Folder" />
              </Dialog.Trigger>
            </UpdateLinksFolderDialog>
          </PermissionAwareButton>
        </LinksFloatingActions>
      ) : null}

      <DashboardLayout.SectionContent>
        <AdHost slot="dashboard" className="mb-6" />
        <DashboardLayout.SectionContentHeader>
          <AddFilterButton filters={filters} color={null} />
          <TableSortButton
            className="mr-auto"
            sortDescriptor={queryState.sort}
            onSortChange={sort => setQueryState({sort})}
            sortOptions={linkSortOptions}
          />
          <ViewModeButton />
          <LinksDatatableMoreOptionsButton />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={filters} />
        <DashboardLayout.SectionScrollContainer
          className={
            viewMode === 'cards'
              ? 'flex flex-col gap-4'
              : 'mx-0 divide-y rounded-card border px-0'
          }
        >
          {items.map(link => (
            <LinkCard
              isSelected={selectedLinks.some(item => item.id === link.id)}
              onToggle={() => toggleLink(link)}
              key={link.id}
              link={link}
              onDelete={() => setSelectedLinks([])}
              onRemoveFromFolder={() => setSelectedLinks([])}
            />
          ))}
          <BackendPagination
            response={query.data}
            onPageChange={page => setQueryState({page})}
          />

          {items.length === 0 && <EmptyState isFiltering={isFiltering} />}
        </DashboardLayout.SectionScrollContainer>
        {links?.dash_footer && <Footer padding="mt-11" />}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function EmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <LinkIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching links" />
          ) : (
            <Trans message="No links yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by creating your first link." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <NewLinkButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

function ViewModeButton() {
  const {isMobileMode} = use(DashboardLayoutContext);
  return !isMobileMode ? <LinksDataTableViewModeButton /> : null;
}

type LinksDatatableMoreOptionsButtonProps = {
  folder?: Folder | null;
};
export function LinksDatatableMoreOptionsButton({
  folder,
}: LinksDatatableMoreOptionsButtonProps) {
  const [multipleLinksDialogIsOpen, setMultipleLinksDialogIsOpen] =
    useState(false);
  const [csvExportInfoDialogOpen, setCsvExportInfoDialogOpen] = useState(false);
  const {routeType} = useDatatableRouteType();
  const exportCsv = useMutation(
    exportLinksCsvOptions({
      type: routeType === 'admin' ? 'all' : 'current',
      ...(folder ? {folderId: folder.id} : {}),
    }),
  );

  const handleCsvExport = () => {
    exportCsv.mutate(undefined, {
      onSuccess: response => {
        if (response.downloadPath) {
          downloadFileFromUrl(response.downloadPath);
        } else {
          setCsvExportInfoDialogOpen(true);
        }
      },
    });
  };

  return (
    <>
      <CreateMultipleLinksDialog
        folder={folder}
        open={multipleLinksDialogIsOpen}
        onOpenChange={setMultipleLinksDialogIsOpen}
      />
      <CsvExportInfoDialog
        open={csvExportInfoDialogOpen}
        onOpenChange={setCsvExportInfoDialogOpen}
      />
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="outline" />}>
          <Trans message="More" />
          <ChevronDownIcon data-icon="inline-end" />
        </Dropdown.Trigger>
        <Dropdown.Content className="w-auto">
          <Dropdown.Item onClick={() => setMultipleLinksDialogIsOpen(true)}>
            <FileStackIcon />
            <Trans message="Shorten multiple links" />
          </Dropdown.Item>
          <Dropdown.Item onClick={() => handleCsvExport()}>
            <DownloadIcon />
            <Trans message="Export links" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

function NewLinkButton() {
  return (
    <PermissionAwareButton resource="link" action="create">
      <CreateLinkDialog>
        <Dialog.Trigger render={<Button variant="default" color="primary" />}>
          <PlusIcon />
          <Trans message="New link" />
        </Dialog.Trigger>
      </CreateLinkDialog>
    </PermissionAwareButton>
  );
}
