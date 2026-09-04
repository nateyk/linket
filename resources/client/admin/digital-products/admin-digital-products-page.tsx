import {StaticPageTitle} from '@common/seo/static-page-title';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Badge} from '@shadcn/badge/badge';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {Tabs} from '@shadcn/tabs/tabs';
import {message} from '@ui/i18n/message';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {
  LandmarkIcon,
  PackageSearchIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  PackageIcon,
  LayersIcon,
  ShieldCheckIcon,
  ArrowUpRightIcon,
} from 'lucide-react';
import {Link} from 'react-router';
import {adminDigitalProductColumns} from './admin-digital-products-datatable-columns';
import {AdminDigitalProductsDatatableFilters} from './admin-digital-products-datatable-filters';
import {adminDigitalProductsOptions} from './admin-digital-products-queries';

const statusTabs = [
  {value: '', label: 'All', icon: LayersIcon},
  {value: 'pending_approval', label: 'Pending', icon: ClockIcon},
  {value: 'approved', label: 'Approved', icon: CheckCircle2Icon},
  {value: 'rejected', label: 'Rejected', icon: XCircleIcon},
] as const;

export function Component() {
  const {queryState, setQueryState, deferredSearchParams, isFiltering, isLoading} =
    useTableQueryState({
      filters: AdminDigitalProductsDatatableFilters,
    });

  const query = useSuspenseQuery(adminDigitalProductsOptions(deferredSearchParams));
  const items = query.data?.data ?? [];
  const counters = query.data?.meta?.counters as
    | Record<string, {total: number}>
    | undefined;
  const activeStatus = (deferredSearchParams.status as string) ?? '';

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

  const pendingCount = counters?.pending_approval?.total ?? 0;
  const approvedCount = counters?.approved?.total ?? 0;
  const rejectedCount = counters?.rejected?.total ?? 0;
  const totalCount = counters?.total?.total ?? items.length;
  const draftCount = counters?.draft?.total ?? 0;

  return (
    <DashboardLayout.MainSection aria-labelledby="digital-products-heading">
      <StaticPageTitle>
        <Trans message="Digital Products" />
      </StaticPageTitle>

      <DashboardLayout.SectionHeader className="gap-4">
        <DashboardLayout.SidebarToggle aria-label="Toggle sidebar" />
        <div className="min-w-0 flex-1">
          <DashboardLayout.SectionTitle
            id="digital-products-heading"
            className="flex items-center gap-3"
          >
            <span className="flex size-9 items-center justify-center rounded-card-sm bg-primary/10 text-primary">
              <PackageIcon className="size-5" aria-hidden="true" />
            </span>
            <Trans message="Digital Products" />
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300" aria-label={`${pendingCount} pending review`}>
                <ClockIcon className="size-3.5" aria-hidden="true" />
                {pendingCount} <Trans message="pending" />
              </Badge>
            )}
          </DashboardLayout.SectionTitle>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            <Trans message="Review, approve, and manage creator submissions. Products must be approved before they appear on storefronts." />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link to="/admin/digital-products/payouts" />}
                    aria-label="View payout requests"
                  />
                }
              />
              <Tooltip.Content>
                <Trans message="Manage creator payout requests" />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/digital-products/payouts" />}
          >
            <LandmarkIcon aria-hidden="true" />
            <Trans message="Payout requests" />
            <ArrowUpRightIcon className="size-3.5 opacity-60" aria-hidden="true" />
          </Button>
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="gap-6">
        {/* Stats overview — uses existing Card component */}
        <section
          aria-label="Product statistics"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label={<Trans message="Total products" />}
            value={totalCount}
            description={<Trans message="All submissions" />}
            icon={PackageIcon}
            tone="bg-muted text-muted-foreground"
            isLoading={isLoading && !counters}
          />
          <StatCard
            label={<Trans message="Pending review" />}
            value={pendingCount}
            description={
              pendingCount > 0 ? (
                <Trans message="Needs attention" />
              ) : (
                <Trans message="All caught up" />
              )
            }
            icon={ClockIcon}
            tone={
              pendingCount > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20'
                : 'bg-muted text-muted-foreground'
            }
            isLoading={isLoading && !counters}
            isHighlighted={pendingCount > 0}
          />
          <StatCard
            label={<Trans message="Approved" />}
            value={approvedCount}
            description={<Trans message="Live on storefronts" />}
            icon={CheckCircle2Icon}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
            isLoading={isLoading && !counters}
          />
          <StatCard
            label={<Trans message="Rejected" />}
            value={rejectedCount}
            description={
              draftCount > 0 ? (
                <Trans
                  message=":rejected rejected, :draft drafts"
                  values={{rejected: rejectedCount, draft: draftCount}}
                />
              ) : (
                <Trans message="Not approved" />
              )
            }
            icon={XCircleIcon}
            tone="bg-destructive/10 text-destructive ring-destructive/20"
            isLoading={isLoading && !counters}
          />
        </section>

        {/* Status tabs — quick filtering, accessible, keyboard navigable */}
        <Tabs.Root
          value={activeStatus}
          onValueChange={value => setQueryState({status: value || null})}
          aria-label="Filter by product status"
        >
          <Tabs.List className="w-full justify-start overflow-x-auto">
            {statusTabs.map(tab => {
              const Icon = tab.icon;
              const count =
                tab.value === ''
                  ? totalCount
                  : tab.value === 'pending_approval'
                    ? pendingCount
                    : tab.value === 'approved'
                      ? approvedCount
                      : rejectedCount;
              return (
                <Tabs.Tab
                  key={tab.value || 'all'}
                  value={tab.value}
                  className="gap-2"
                  aria-label={`${tab.label} products, ${count} items`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {tab.label}
                  <Badge
                    variant={activeStatus === tab.value ? 'default' : 'outline'}
                    className="ml-1 min-w-6 justify-center px-1.5 py-0 text-xs tabular-nums"
                    aria-hidden="true"
                  >
                    {count}
                  </Badge>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.Root>

        {/* Table controls — search + filters in a clean card */}
        <Card size="sm" className="gap-4">
          <Card.Content className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <TableSearchInput
                  placeholder={message('Search by title or creator…')}
                  className="pr-9"
                />
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  /
                </kbd>
              </div>
              <AddFilterPopover
                filters={AdminDigitalProductsDatatableFilters}
                aria-label="Add filter"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
              <Trans message="Moderation queue" />
              {isLoading && (
                <span
                  className="inline-flex items-center gap-1.5"
                  role="status"
                  aria-live="polite"
                >
                  <span className="size-2 animate-pulse rounded-full bg-primary" />
                  <Trans message="Updating…" />
                </span>
              )}
            </div>
          </Card.Content>
          {isFiltering && (
            <Card.Content className="pt-0">
              <FilterList
                filters={AdminDigitalProductsDatatableFilters}
                aria-label="Active filters"
              />
            </Card.Content>
          )}
        </Card>

        {/* Table — wrapped in card for cleaner elevation */}
        <Card className="overflow-hidden py-0">
          <div
            role="region"
            aria-label="Digital products table"
            aria-busy={isLoading}
            className="overflow-x-auto"
          >
            <DashboardLayout.SectionScrollContainer className="min-h-[320px]">
              <div className="[&_thead_th]:bg-muted/40 [&_thead_th]:font-medium [&_tbody_tr:hover]:bg-muted/40 [&_tbody_tr]:transition-colors">
                <GenericTable table={table} />
              </div>
              {!items.length && (
                <DigitalProductsEmptyState
                  isFiltering={isFiltering}
                  activeStatus={activeStatus}
                  onClearFilters={() => setQueryState({status: null, query: null})}
                />
              )}
              <div className="border-t bg-card px-4 py-3 sm:px-6">
                <TablePagination table={table} />
              </div>
            </DashboardLayout.SectionScrollContainer>
          </div>
        </Card>

        <p className="px-1 text-xs text-muted-foreground" role="note">
          <Trans message="Tip: Press / to focus search, use tabs to filter by status, and sort by clicking column headers." />
        </p>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
  isLoading,
  isHighlighted,
}: {
  label: React.ReactNode;
  value: number;
  description: React.ReactNode;
  icon: React.ComponentType<{className?: string}>;
  tone: string;
  isLoading?: boolean;
  isHighlighted?: boolean;
}) {
  return (
    <Card
      size="sm"
      className={`gap-3 transition-all ${isHighlighted ? 'ring-1 shadow-sm' : ''} ${tone.includes('ring-') ? tone : ''}`}
      role="group"
      aria-label={`${typeof label === 'string' ? label : 'Stat'}: ${value}`}
    >
      <Card.Header className="pb-0">
        <Card.Title className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
          <span
            className={`flex size-8 items-center justify-center rounded-card-sm ${tone} ${!tone.includes('ring-') ? 'ring-1 ring-foreground/5' : ''}`}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </span>
          {label}
        </Card.Title>
        <Card.Description className="sr-only">{description}</Card.Description>
      </Card.Header>
      <Card.Content>
        {isLoading ? (
          <Skeleton className="h-7 w-16" aria-label="Loading" />
        ) : (
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold tracking-tight tabular-nums" aria-live="polite">
              {value}
            </p>
            <span className="text-xs text-muted-foreground">{description}</span>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function DigitalProductsEmptyState({
  isFiltering,
  activeStatus,
  onClearFilters,
}: {
  isFiltering: boolean;
  activeStatus: string;
  onClearFilters: () => void;
}) {
  const statusLabel =
    activeStatus === 'pending_approval'
      ? 'pending'
      : activeStatus === 'approved'
        ? 'approved'
        : activeStatus === 'rejected'
          ? 'rejected'
          : null;

  return (
    <Empty.Root className="min-h-[280px] border-0 py-12">
      <Empty.Header>
        <Empty.Media variant="icon" className="bg-muted">
          <PackageSearchIcon className="size-6" aria-hidden="true" />
        </Empty.Media>
        <Empty.Title className="text-base">
          {isFiltering ? (
            <Trans message="No matching products" />
          ) : (
            <Trans message="No digital products have been submitted yet" />
          )}
        </Empty.Title>
        <Empty.Description className="max-w-sm">
          {isFiltering ? (
            statusLabel ? (
              <Trans
                message="No :status products match your filters. Try clearing filters or searching differently."
                values={{status: statusLabel as any}}
              />
            ) : (
              <Trans message="Try another search query or different filters." />
            )
          ) : (
            <Trans message="When creators submit products for review, they'll appear here for moderation." />
          )}
        </Empty.Description>
      </Empty.Header>
      {isFiltering && (
        <Empty.Content className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={onClearFilters} aria-label="Clear all filters">
            <Trans message="Clear filters" />
          </Button>
          <Button
            variant="default"
            size="sm"
            nativeButton={false}
            render={<Link to="/admin/digital-products" />}
          >
            <Trans message="View all products" />
          </Button>
        </Empty.Content>
      )}
    </Empty.Root>
  );
}
