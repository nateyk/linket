import {DetachLinksDialog} from '@app/dashboard/folders/folder-links-datatable-page/detach-links-dialog';
import {retrieveFolderOptions} from '@app/dashboard/folders/folders-queries';
import {LinkCard} from '@app/dashboard/links/links-datatable-page/link-card';
import {linkSortOptions} from '@app/dashboard/links/links-datatable-page/link-sort-options';
import {LinksDatatableFilters} from '@app/dashboard/links/links-datatable-page/links-datatable-filters';
import {LinksDatatableMoreOptionsButton} from '@app/dashboard/links/links-datatable-page/links-datatable-page';
import {
  LinksDataTableViewModeButton,
  useLinksDataTableViewMode,
} from '@app/dashboard/links/links-datatable-page/links-datatable-view-mode-button';
import {LinksFloatingActions} from '@app/dashboard/links/links-datatable-page/links-floating-actions';
import {listLinksOptions} from '@app/dashboard/links/links-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Link} from '@app/gen/schemas/link';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSortButton} from '@shadcn/table/utils/table-sort-button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {LinkIcon, MinusIcon} from 'lucide-react';
import {use, useMemo, useState} from 'react';

export function Component() {
  const {isMobileMode} = use(DashboardLayoutContext);
  const {folderId} = useRequiredParams(['folderId']);
  const {routeType, isForCurrentUser} = useDatatableRouteType();
  const [viewMode] = useLinksDataTableViewMode();

  const filters = useMemo(() => {
    return !isForCurrentUser
      ? LinksDatatableFilters
      : LinksDatatableFilters.filter(filter => filter.key !== 'user_id');
  }, [isForCurrentUser]);

  const {queryState, setQueryState, isFiltering, searchParams, isLoading} =
    useTableQueryState({filters});

  const folderQuery = useSuspenseQuery(retrieveFolderOptions(Number(folderId)));
  const folder = folderQuery.data.data;

  const linksQuery = useSuspenseQuery(
    listLinksOptions(routeType, {
      ...searchParams,
      folder_id: Number(folderId),
    }),
  );
  const items = linksQuery.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  const [selectedLinks, setSelectedLinks] = useState<Link[]>([]);
  const toggleLink = (link: Link) => {
    setSelectedLinks(prev =>
      prev.some(item => item.id === link.id)
        ? prev.filter(item => item.id !== link.id)
        : [...prev, link],
    );
  };

  const clearSelection = () => setSelectedLinks([]);

  return (
    <>
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
          <PermissionAwareButton resource="folder" action="update">
            <DetachLinksDialog
              linkIds={selectedLinks.map(link => link.id)}
              onDetach={() => setSelectedLinks([])}
            >
              <AlertDialog.Trigger
                render={<Button variant="outline" size="sm" />}
              >
                <MinusIcon />
                <Trans message="Remove" />
              </AlertDialog.Trigger>
            </DetachLinksDialog>
          </PermissionAwareButton>
        </LinksFloatingActions>
      ) : null}

      <DashboardLayout.SectionContentHeader>
        <AddFilterPopover filters={filters} color={null} />
        <TableSortButton
          className="mr-auto"
          sortDescriptor={queryState.sort}
          onSortChange={sort => setQueryState({sort})}
          sortOptions={linkSortOptions}
        />
        {!isMobileMode && <LinksDataTableViewModeButton />}
        <LinksDatatableMoreOptionsButton folder={folder} />
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
            onDelete={clearSelection}
            onRemoveFromFolder={clearSelection}
          />
        ))}
        <BackendPagination
          response={linksQuery.data}
          onPageChange={page => setQueryState({page})}
        />
        {items.length === 0 && (
          <FolderLinksEmptyState isFiltering={isFiltering} />
        )}
      </DashboardLayout.SectionScrollContainer>
    </>
  );
}

function FolderLinksEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <div>
      <Empty.Root>
        <Empty.Header>
          <Empty.Media variant="icon">
            <LinkIcon />
          </Empty.Media>
          <Empty.Title>
            {isFiltering ? (
              <Trans message="No matching links" />
            ) : (
              <Trans message="No links in this folder yet" />
            )}
          </Empty.Title>
          <Empty.Description>
            {isFiltering ? (
              <Trans message="Try another search query or different filters." />
            ) : (
              <Trans message="Get started by adding a new link." />
            )}
          </Empty.Description>
        </Empty.Header>
      </Empty.Root>
    </div>
  );
}
