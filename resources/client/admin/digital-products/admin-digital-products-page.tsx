import {StaticPageTitle} from '@common/seo/static-page-title';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {LandmarkIcon, PackageSearchIcon} from 'lucide-react';
import {Link} from 'react-router';
import {adminDigitalProductColumns} from './admin-digital-products-datatable-columns';
import {AdminDigitalProductsDatatableFilters} from './admin-digital-products-datatable-filters';
import {adminDigitalProductsOptions} from './admin-digital-products-queries';

export function Component() {
  const {queryState, setQueryState, deferredSearchParams, isFiltering, isLoading} =
    useTableQueryState({
      filters: AdminDigitalProductsDatatableFilters,
    });

  const query = useSuspenseQuery(adminDigitalProductsOptions(deferredSearchParams));
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: adminDigitalProductColumns,
    enableMultiRowSelection: false,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
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
        <Trans message="Digital Products" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Digital Products" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/digital-products/payouts" />}
        >
          <LandmarkIcon />
          <Trans message="Payout requests" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <AddFilterPopover
            filters={AdminDigitalProductsDatatableFilters}
            className="mr-auto"
          />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={AdminDigitalProductsDatatableFilters} />
        <DashboardLayout.SectionScrollContainer>
          <GenericTable table={table} />
          {!items.length && (
            <DigitalProductsEmptyState isFiltering={isFiltering} />
          )}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function DigitalProductsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <PackageSearchIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching products" />
          ) : (
            <Trans message="No digital products have been submitted yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : null}
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}