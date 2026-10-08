import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {Empty} from '@shadcn/empty/empty';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {StarIcon} from 'lucide-react';
import {adminProductReviewColumns} from './admin-product-reviews-datatable-columns';
import {AdminProductReviewsDatatableFilters} from './admin-product-reviews-datatable-filters';
import {adminProductReviewsOptions} from './admin-product-reviews-queries';

interface AdminProductReviewsTableProps {
  productId: string;
}

export function AdminProductReviewsTable({
  productId,
}: AdminProductReviewsTableProps) {
  const {queryState, setQueryState, deferredSearchParams, isFiltering, isLoading} =
    useTableQueryState({
      filters: AdminProductReviewsDatatableFilters,
    });

  const query = useQuery(
    adminProductReviewsOptions(productId, deferredSearchParams),
  );
  const items = query.data?.data ?? [];
  const productPublicUrl = query.data?.product?.public_url ?? null;

  const table = useTable({
    data: items,
    columns: adminProductReviewColumns(productPublicUrl),
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

  if (query.isPending) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
        <Trans message="Loading reviews…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <TableSearchInput />
        <AddFilterPopover
          filters={AdminProductReviewsDatatableFilters}
          className="mr-auto"
        />
      </div>
      <FilterList filters={AdminProductReviewsDatatableFilters} />
      <GenericTable table={table} />
      {!items.length && <ProductReviewsEmptyState isFiltering={isFiltering} />}
      <TablePagination table={table} />
    </div>
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
            <Trans message="Try adjusting your search or filters." />
          ) : null}
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}