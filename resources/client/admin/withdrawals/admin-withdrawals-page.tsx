import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterButton} from '@common/datatable/filters/add-filter-button';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {StaticPageTitle} from '@common/seo/static-page-title';
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
import {BanknoteIcon, InboxIcon} from 'lucide-react';
import {parseAsString} from 'nuqs';
import {Link} from 'react-router';
import {adminWithdrawalsColumns} from './admin-withdrawals-datatable-columns';
import {AdminWithdrawalsDatatableFilters} from './admin-withdrawals-datatable-filters';
import {adminWithdrawalsOptions} from './admin-withdrawals-queries';

export function Component() {
  const {queryState, setQueryState, deferredSearchParams, isFiltering, isLoading} =
    useTableQueryState({
      filters: AdminWithdrawalsDatatableFilters,
      parsers: {
        date_from: parseAsString,
        date_to: parseAsString,
        withdrawal_method: parseAsString,
      },
    });

  const query = useSuspenseQuery(adminWithdrawalsOptions(deferredSearchParams));
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: adminWithdrawalsColumns,
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
        <Trans message="Withdrawals" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Withdrawals" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/financial/withdrawal-methods/legacy" />}
        >
          <BanknoteIcon />
          <Trans message="Withdrawal methods" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <AddFilterButton
            filters={AdminWithdrawalsDatatableFilters}
            className="mr-auto"
          />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={AdminWithdrawalsDatatableFilters} />
        <DashboardLayout.SectionScrollContainer>
          <GenericTable table={table} />
          {!items.length && <WithdrawalsEmptyState isFiltering={isFiltering} />}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function WithdrawalsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <InboxIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching withdrawal requests" />
          ) : (
            <Trans message="No withdrawal requests found" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans
              message="Requests will appear here when creators request payouts."
            />
          )}
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}