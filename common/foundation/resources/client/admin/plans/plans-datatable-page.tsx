import {AdminDocsUrls} from '@app/admin/admin-config';
import {plansDatatableColumns} from '@common/admin/plans/plans-datatable-columns';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {
  listProductsOptions,
  syncProductsOptions,
} from '@common/admin/subscriptions/products-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Button, LinkButton} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {LayersIcon, PlusIcon, RefreshCcwIcon} from 'lucide-react';

export function Component() {
  const navigate = useNavigate();
  const {queryState, setQueryState, isFiltering} = useTableQueryState();

  const query = useSuspenseQuery(listProductsOptions());
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: plansDatatableColumns,
    enableMultiRowSelection: false,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    isClientSide: true,
    globalFilter: queryState.query,
    pagination: {
      per_page: queryState.per_page,
      page: queryState.page,
    },
    onPaginationChange: pagination => setQueryState({...pagination}),
  });

  const isEmpty = table.getRowCount() === 0;

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Subscription plans" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Subscription plans" />
          </h1>
        </DashboardLayout.SectionTitle>
        {AdminDocsUrls.pages.subscriptions ? (
          <DocsLink
            variant="button"
            link={AdminDocsUrls.pages.subscriptions}
            size="sm"
          />
        ) : null}
        <AddNewPlanButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput className="mr-auto" debounce={false} />
          <SyncPlansButton />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer>
          {(!isEmpty || isFiltering) && (
            <GenericTable
              table={table}
              onRowClick={row =>
                navigate(`/admin/plans/${row.original.id}/edit`)
              }
            />
          )}
          {isEmpty ? <PlansEmptyState isFiltering={isFiltering} /> : null}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function AddNewPlanButton() {
  return (
    <LinkButton variant="default" color="primary" to="/admin/plans/new">
      <PlusIcon />
      <Trans message="Add new plan" />
    </LinkButton>
  );
}

function SyncPlansButton() {
  const syncPlans = useMutation(syncProductsOptions());

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={syncPlans.isPending}
      onClick={() => {
        syncPlans.mutate(undefined, {
          onSuccess: () => {
            toast.success(<Trans message="Plans synced" />);
          },
          onError: err =>
            showHttpErrorToast(err, <Trans message="Could not sync plans" />),
        });
      }}
    >
      <RefreshCcwIcon />
      <Trans message="Sync plans" />
    </Button>
  );
}

function PlansEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <LayersIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching plans" />
          ) : (
            <Trans message="No plans have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by creating a new plan." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <AddNewPlanButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
