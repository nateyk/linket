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
import {ArrowLeftIcon, StarIcon} from 'lucide-react';
import {Link, useParams} from 'react-router';
import {adminProductReviewColumns} from './admin-product-reviews-datatable-columns';
import {AdminProductReviewsDatatableFilters} from './admin-product-reviews-datatable-filters';
import {adminProductReviewsOptions} from './admin-product-reviews-queries';

export function Component() {
  const {productId} = useParams();
  const {queryState, setQueryState, deferredSearchParams, isFiltering, isLoading} =
    useTableQueryState({
      filters: AdminProductReviewsDatatableFilters,
    });

  const query = useSuspenseQuery(
    adminProductReviewsOptions(productId ?? '', deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: adminProductReviewColumns,
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
        <Trans message="Product Reviews" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>{query.data?.product?.title}</h1>
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/digital-products" />}
        >
          <ArrowLeftIcon />
          <Trans message="Back to products" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <AddFilterPopover
            filters={AdminProductReviewsDatatableFilters}
            className="mr-auto"
          />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={AdminProductReviewsDatatableFilters} />
        <DashboardLayout.SectionScrollContainer>
          <GenericTable table={table} />
          {!items.length && (
            <ProductReviewsEmptyState isFiltering={isFiltering} />
          )}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function ProductReviewsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <StarIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching reviews" />
          ) : (
            <Trans message="No reviews have been submitted yet" />
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