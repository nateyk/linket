import {BiolinkCard} from '@app/admin/biolinks-datatable-page/biolink-card';
import {BiolinksDatatableFilters} from '@app/admin/biolinks-datatable-page/biolinks-datatable-filters';
import {CreateBiolinkDialog} from '@app/dashboard/biolink/biolink-editor/create-biolink-dialog';
import {listBiolinksOptions} from '@app/dashboard/biolink/biolinks-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {AdHost} from '@common/admin/ads/ad-host';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Footer} from '@common/ui/footer/footer';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSortButton} from '@shadcn/table/utils/table-sort-button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {LayoutPanelTop, PlusIcon} from 'lucide-react';

const sortOptions = [
  {
    label: <Trans message="Last updated" />,
    orderBy: 'updated_at',
  },
  {
    label: <Trans message="Date created" />,
    orderBy: 'created_at',
    isDefault: true,
  },
  {
    label: <Trans message="Name" />,
    orderBy: 'name',
  },
  {
    label: <Trans message="Clicks" />,
    orderBy: 'clicks_count',
  },
  {
    label: <Trans message="Links" />,
    orderBy: 'links_count',
  },
];

export function Component() {
  const {links} = useSettings();

  const {queryState, setQueryState, isFiltering, searchParams, isLoading} =
    useTableQueryState({filters: BiolinksDatatableFilters});

  const query = useSuspenseQuery(
    listBiolinksOptions('admin', {
      ...searchParams,
      fields_preset: 'datatable',
    }),
  );
  const items = query.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Biolinks" />
        </DashboardLayout.SectionTitle>
        <NewBiolinkButton />
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent>
        <AdHost slot="dashboard" className="mb-6" />

        <DashboardLayout.SectionContentHeader>
          <AddFilterPopover filters={BiolinksDatatableFilters} />
          <TableSortButton
            className="mr-auto"
            sortDescriptor={queryState.sort}
            onSortChange={sort => setQueryState({sort})}
            sortOptions={sortOptions}
          />
        </DashboardLayout.SectionContentHeader>

        <FilterList filters={BiolinksDatatableFilters} />

        <DashboardLayout.SectionScrollContainer className="space-y-4">
          {items.map(biolink => (
            <BiolinkCard key={biolink.id} biolink={biolink} />
          ))}
          <BackendPagination
            response={query.data}
            onPageChange={page => setQueryState({page})}
            onPageSizeChange={perPage => setQueryState({per_page: perPage})}
          />
          {items.length === 0 && (
            <BiolinksEmptyState isFiltering={isFiltering} />
          )}
        </DashboardLayout.SectionScrollContainer>

        {links?.dash_footer && <Footer padding="mt-11" />}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function NewBiolinkButton() {
  return (
    <PermissionAwareButton resource="biolink" action="create">
      <CreateBiolinkDialog>
        <Dialog.Trigger render={<Button color="primary" />}>
          <PlusIcon data-icon="inline-start" />
          <Trans message="New link in bio" />
        </Dialog.Trigger>
      </CreateBiolinkDialog>
    </PermissionAwareButton>
  );
}

function BiolinksEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <LayoutPanelTop />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching biolinks" />
          ) : (
            <Trans message="No biolinks have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by creating your first link in bio." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <NewBiolinkButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
