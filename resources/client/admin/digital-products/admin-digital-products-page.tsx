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
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {InfoIcon, LandmarkIcon, PackageSearchIcon} from 'lucide-react';
import {useSuspenseQuery} from '@tanstack/react-query';
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
    enableMultiRowSelection: true,
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
        <DashboardLayout.SectionTitle className="gap-2">
          <Trans message="Digital Products" />
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-button border-transparent bg-transparent text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-solid"
                    aria-label="About digital products"
                  >
                    <InfoIcon className="size-4" aria-hidden="true" />
                  </button>
                }
              />
              <Tooltip.Content side="bottom" className="max-w-xs">
                <Trans message="Review, approve, and manage creator submissions. Products must be approved before they appear on storefronts." />
              </Tooltip.Content>
              </Tooltip.Root>
          </Tooltip.Provider>
        </DashboardLayout.SectionTitle>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/digital-products/payouts" />}
          >
            <LandmarkIcon className="size-4" aria-hidden="true" />
            <Trans message="Payout requests" />
          </Button>
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <TableSearchInput placeholder={message('Search by title or creator…')} className="max-w-sm" />
            <AddFilterPopover
              filters={AdminDigitalProductsDatatableFilters}
            />
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <span className="text-sm text-muted-foreground">
              <Trans
                message=":count selected"
                values={{count: table.getSelectedRowModel().rows.length}}
              />
            </span>
          )}
        </div>

        <FilterList filters={AdminDigitalProductsDatatableFilters} />

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <div className="[&_thead]:bg-muted/50 [&_thead_tr]:border-b [&_th]:p-4 [&_th]:text-left [&_td]:p-4 [&_tbody_tr]:border-b [&_tbody_tr:last-child]:border-0 [&_tbody_tr:hover]:bg-muted/30">
              <GenericTable table={table} />
            </div>
          </div>
          {!items.length && (
            <DigitalProductsEmptyState
              isFiltering={isFiltering}
              onClearFilters={() => setQueryState({status: null, query: null})}
            />
          )}
          <div className="border-t bg-card px-4 py-3">
            <TablePagination table={table} />
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function DigitalProductsEmptyState({
  isFiltering,
  onClearFilters,
}: {
  isFiltering: boolean;
  onClearFilters: () => void;
}) {
  return (
    <Empty.Root className="border-0">
      <Empty.Header>
        <Empty.Media variant="icon">
          <PackageSearchIcon aria-hidden="true" />
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
          ) : (
            <Trans message="When creators submit products for review, they'll appear here for moderation." />
          )}
        </Empty.Description>
      </Empty.Header>
      {isFiltering && (
        <Empty.Content>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <Trans message="Clear filters" />
          </Button>
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
