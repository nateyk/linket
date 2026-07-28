import {AdminDocsUrls} from '@app/admin/admin-config';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {subscriptionDatatableColumns} from '@common/admin/subscriptions/subscriptions-datatable-columns';
import {SubscriptionDatatableFilters} from '@common/admin/subscriptions/subscriptions-datatable-filters';
import {listSubscriptionsOptions} from '@common/admin/subscriptions/subscriptions-queries';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {CreditCardIcon, PlusIcon} from 'lucide-react';
import {CreateSubscriptionDialog} from './create-subscription-dialog';

export function Component() {
  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState({filters: SubscriptionDatatableFilters});

  const query = useSuspenseQuery(
    listSubscriptionsOptions(deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: subscriptionDatatableColumns,
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
        <Trans message="Subscriptions" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Subscriptions" />
          </h1>
        </DashboardLayout.SectionTitle>
        {AdminDocsUrls.pages.subscriptions ? (
          <DocsLink
            variant="button"
            link={AdminDocsUrls.pages.subscriptions}
            size="sm"
          />
        ) : null}
        <AddNewSubscriptionButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <AddFilterPopover
            filters={SubscriptionDatatableFilters}
            className="mr-auto"
          />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={SubscriptionDatatableFilters} />
        <DashboardLayout.SectionScrollContainer>
          <GenericTable table={table} />
          {!items.length && (
            <SubscriptionsEmptyState isFiltering={isFiltering} />
          )}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function AddNewSubscriptionButton() {
  return (
    <CreateSubscriptionDialog>
      <Dialog.Trigger render={<Button variant="default" color="primary" />}>
        <PlusIcon />
        <Trans message="Add new subscription" />
      </Dialog.Trigger>
    </CreateSubscriptionDialog>
  );
}

function SubscriptionsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <CreditCardIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching subscriptions" />
          ) : (
            <Trans message="No subscriptions have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : null}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <AddNewSubscriptionButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
