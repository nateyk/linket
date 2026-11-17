import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterButton} from '@common/datatable/filters/add-filter-button';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowRightLeftIcon,
  CheckCircle2Icon,
  Clock3Icon,
  InboxIcon,
  RefreshCwIcon,
  WalletCardsIcon,
  XCircleIcon,
} from 'lucide-react';
import {parseAsString} from 'nuqs';
import {Link} from 'react-router';
import {adminWithdrawalsColumns} from './admin-withdrawals-datatable-columns';
import {AdminWithdrawalsDatatableFilters} from './admin-withdrawals-datatable-filters';
import {adminWithdrawalsOptions} from './admin-withdrawals-queries';

type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'rejected' | 'cancelled';
type WithdrawalCounter = {
  total: number;
  amounts_by_currency: Record<string, number>;
};
type WithdrawalMethod = {id: number | string; name: string};

const statuses = [
  {key: 'requested', label: 'Requested', detail: 'Awaiting admin review', icon: Clock3Icon},
  {key: 'processing', label: 'Processing', detail: 'Approved or awaiting settlement', icon: ArrowRightLeftIcon},
  {key: 'paid', label: 'Paid', detail: 'Settled withdrawals', icon: CheckCircle2Icon},
  {key: 'rejected', label: 'Rejected', detail: 'Declined after review', icon: XCircleIcon},
  {key: 'cancelled', label: 'Cancelled', detail: 'Cancelled requests', icon: WalletCardsIcon},
] as const;

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
  const counters = query.data?.meta?.counters as Record<WithdrawalStatus, WithdrawalCounter> | undefined;
  const methods = (query.data?.meta?.withdrawal_methods ?? []) as WithdrawalMethod[];

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
        <div className="min-w-0 flex-1">
          <DashboardLayout.SectionTitle>
            <Trans message="Withdrawals" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Trans message="Review creator requests and track Chapa settlement." />
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link to="/admin/payout-accounts" />}>
          <WalletCardsIcon aria-hidden="true" />
          <Trans message="Payout accounts" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 px-3 py-4 sm:px-5">
          <WithdrawalTotals counters={counters} />

          <Card.Root size="sm" className="min-w-0 gap-0">
            <Card.Header className="gap-1 border-b">
              <Card.Title><Trans message="Withdrawal requests" /></Card.Title>
              <Card.Description>
                <Trans message="Search and filter payout requests. Confirm settlement before marking a transfer paid." />
              </Card.Description>
            </Card.Header>
            <Card.Content className="min-w-0 p-0">
              <DashboardLayout.SectionContentHeader className="flex-wrap gap-2">
                <TableSearchInput />
                <AddFilterButton filters={AdminWithdrawalsDatatableFilters} className="mr-auto" />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                  aria-label="Refresh withdrawals"
                >
                  <RefreshCwIcon aria-hidden="true" className={query.isFetching ? 'animate-spin' : undefined} />
                  <Trans message="Refresh" />
                </Button>
              </DashboardLayout.SectionContentHeader>

              <div className="grid grid-cols-1 gap-2 border-b px-3 py-3 sm:grid-cols-3">
                <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                  <Trans message="From date" />
                  <Input
                    bindToHookForm={false}
                    type="date"
                    aria-label="From date"
                    value={queryState.date_from ?? ''}
                    max={queryState.date_to ?? undefined}
                    onChange={event => setQueryState({date_from: event.target.value || null, page: 1})}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                  <Trans message="To date" />
                  <Input
                    bindToHookForm={false}
                    type="date"
                    aria-label="To date"
                    value={queryState.date_to ?? ''}
                    min={queryState.date_from ?? undefined}
                    onChange={event => setQueryState({date_to: event.target.value || null, page: 1})}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                  <Trans message="Withdrawal method" />
                  <select
                    aria-label="Withdrawal method"
                    value={queryState.withdrawal_method ?? ''}
                    onChange={event => setQueryState({withdrawal_method: event.target.value || null, page: 1})}
                    className="h-9 w-full min-w-0 rounded-input border border-input bg-background px-3 text-sm text-foreground hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    <option value="">All methods</option>
                    {methods.map(method => (
                      <option key={method.id} value={method.name}>{method.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <FilterList filters={AdminWithdrawalsDatatableFilters} />
              <div className="min-w-0 overflow-x-auto">
                <GenericTable table={table} />
              </div>
              {!items.length && <WithdrawalsEmptyState isFiltering={isFiltering} />}
              <TablePagination table={table} />
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function WithdrawalTotals({
  counters,
}: {
  counters?: Record<WithdrawalStatus, WithdrawalCounter>;
}) {
  return (
    <section aria-label="Withdrawal status totals" className="space-y-2">
      <p className="text-xs text-muted-foreground">
        <Trans message="Amounts by status · matching current filters" />
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {statuses.map(item => {
          const Icon = item.icon;
          const counter = counters?.[item.key];
          const amounts = Object.entries(counter?.amounts_by_currency ?? {});
          return (
            <Card.Root key={item.key} size="sm" className="min-w-0 gap-2">
              <Card.Header>
                <Card.Title className="text-sm font-normal text-muted-foreground">
                  <Trans message={item.label} />
                </Card.Title>
                <Card.Action>
                  <span className="flex size-8 items-center justify-center rounded-card-sm bg-muted text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                </Card.Action>
              </Card.Header>
              <Card.Content className="space-y-1">
                <p className="text-2xl font-semibold tabular-nums">
                  {counter?.total ?? '—'}
                </p>
                <div className="flex flex-wrap gap-x-2 text-xs font-medium tabular-nums">
                  {counter && !amounts.length ? formatMoney(0, 'ETB') : amounts.map(([currency, cents]) => (
                    <span key={currency}>{formatMoney(cents, currency)}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <Trans message={item.detail} />
                </p>
              </Card.Content>
            </Card.Root>
          );
        })}
      </div>
    </section>
  );
}

function WithdrawalsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon"><InboxIcon /></Empty.Media>
        <Empty.Title>
          {isFiltering
            ? <Trans message="No matching withdrawal requests" />
            : <Trans message="No withdrawal requests found" />}
        </Empty.Title>
        <Empty.Description>
          {isFiltering
            ? <Trans message="Try another search query or different filters." />
            : <Trans message="Requests will appear here when creators request payouts." />}
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}
