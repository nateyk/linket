import {StaticPageTitle} from '@common/seo/static-page-title';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Field} from '@shadcn/forms/field';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  BadgeCheckIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  LandmarkIcon,
  PackageIcon,
  PackageSearchIcon,
  RefreshCwIcon,
  SearchIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import {parseAsString} from 'nuqs';
import {useMutation, useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import {adminDigitalProductColumns} from './admin-digital-products-datatable-columns';
import {AdminDigitalProductsDatatableFilters} from './admin-digital-products-datatable-filters';
import {
  adminDigitalProductsBaseKey,
  adminDigitalProductsOptions,
} from './admin-digital-products-queries';
import {ReactNode, useEffect, useState} from 'react';

export function Component() {
  const {trans} = useTrans();
  const {queryState, setQueryState, deferredSearchParams, isFiltering, isLoading} =
    useTableQueryState({
      filters: AdminDigitalProductsDatatableFilters,
      parsers: {scope: parseAsString.withDefault('')},
    });

  const query = useSuspenseQuery(adminDigitalProductsOptions(deferredSearchParams));
  const items = query.data?.data ?? [];
  const counters = (query.data?.meta?.counters as Record<string, {total: number}>) ?? {};
  const total = counters?.total?.total ?? items.length;
  const pending = counters?.pending_approval?.total ?? 0;
  const approved = counters?.approved?.total ?? 0;
  const rejected = counters?.rejected?.total ?? 0;
  const updated = counters?.updated?.total ?? 0;
  const scope = queryState.scope;
  const isScopeFiltering = scope === 'updated';

  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState('');

  useEffect(() => {
    setSelectedIds([]);
  }, [deferredSearchParams]);

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: adminDigitalProductsBaseKey});

  const bulkApprove = useMutation({
    mutationFn: () =>
      apiClient.post('/api/v1/admin/digital-products/bulk-approve', {
        ids: selectedIds,
      }),
    onSuccess: response => {
      const approvedCount = response.data?.approved ?? 0;
      const skipped = response.data?.skipped ?? 0;
      setSelectedIds([]);
      invalidate();
      toast.success(
        <Trans
          message=":approved approved, :skipped skipped"
          values={{approved: approvedCount, skipped}}
        />,
      );
    },
    onError: error => showHttpErrorToast(error),
  });

  const bulkReject = useMutation({
    mutationFn: () =>
      apiClient.post('/api/v1/admin/digital-products/bulk-reject', {
        ids: selectedIds,
        reason: bulkReason.trim() || null,
      }),
    onSuccess: response => {
      const rejectedCount = response.data?.rejected ?? 0;
      const skipped = response.data?.skipped ?? 0;
      setRejectOpen(false);
      setBulkReason('');
      setSelectedIds([]);
      invalidate();
      toast.success(
        <Trans
          message=":rejected rejected, :skipped skipped"
          values={{rejected: rejectedCount, skipped}}
        />,
      );
    },
    onError: error => showHttpErrorToast(error),
  });

  const table = useTable({
    data: items,
    columns: adminDigitalProductColumns,
    enableMultiRowSelection: true,
    selectedRows: selectedIds,
    onSelectedRowsChange: setSelectedIds,
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

  const searchValue = (deferredSearchParams.query as string) ?? '';

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Digital Products" />
      </StaticPageTitle>

      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Digital Products" />
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label="About digital products"
                  />
                }
              >
                <InfoIcon className="size-4" />
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" className="max-w-xs">
                <Trans message="Review, approve, and manage creator submissions. Products must be approved before they appear on storefronts." />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/digital-products/payouts" />}
          >
            <LandmarkIcon />
            <Trans message="Payout requests" />
          </Button>
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-5 py-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="All products"
              value={String(total)}
              icon={<PackageIcon />}
            />
            <MetricCard
              label="Pending review"
              value={String(pending)}
              icon={<ClockIcon />}
              tone={pending > 0 ? 'warning' : 'default'}
            />
            <MetricCard
              label="Approved"
              value={String(approved)}
              icon={<BadgeCheckIcon />}
              tone="positive"
            />
            <MetricCard
              label="Rejected"
              value={String(rejected)}
              icon={<XCircleIcon />}
              tone={rejected > 0 ? 'warning' : 'default'}
            />
            <MetricCard
              label="Updates pending"
              value={String(updated)}
              icon={<RefreshCwIcon />}
              tone={updated > 0 ? 'warning' : 'default'}
              active={isScopeFiltering}
              onClick={() =>
                setQueryState(
                  {scope: scope === 'updated' ? null : 'updated'},
                  {resetPage: true},
                )
              }
            />
          </div>

          <Card.Root>
            <Card.Header className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title>
                  <Trans message="Products" />
                </Card.Title>
                <Card.Description>
                  <Trans message="Moderate creator submissions and manage their lifecycle." />
                </Card.Description>
              </div>
              {(isFiltering || isScopeFiltering) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setQueryState({status: null, query: null, scope: null})
                  }
                >
                  <Trans message="Clear filters" />
                </Button>
              )}
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchValue}
                    onChange={e => setQueryState({query: e.target.value || null})}
                    placeholder="Search by title or creator…"
                    className="ps-9"
                  />
                </div>
                <AddFilterPopover filters={AdminDigitalProductsDatatableFilters} />
              </div>

              <FilterList filters={AdminDigitalProductsDatatableFilters} />

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-card border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium">
                    <Trans
                      message=":count selected"
                      values={{count: selectedIds.length}}
                    />
                  </span>
                  <div className="ms-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedIds([])}
                    >
                      <Trans message="Clear" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      color="danger"
                      disabled={bulkReject.isPending}
                      onClick={() => setRejectOpen(true)}
                    >
                      <XIcon />
                      <Trans message="Reject" />
                    </Button>
                    <Button
                      size="sm"
                      disabled={bulkApprove.isPending}
                      onClick={() => bulkApprove.mutate()}
                    >
                      <CheckIcon />
                      <Trans message="Approve" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-card border">
                <div className="[&_thead]:bg-muted/30 [&_thead_tr]:border-b [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:border-b [&_tbody_tr:last-child]:border-0 [&_tbody_tr:hover]:bg-muted/30 [&_tbody_tr]:transition-colors [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  <GenericTable table={table} />
                </div>
                {!items.length && (
                  <DigitalProductsEmptyState
                    isFiltering={isFiltering || isScopeFiltering}
                    onClearFilters={() =>
                      setQueryState({status: null, query: null, scope: null})
                    }
                  />
                )}
              </div>
              <TablePagination table={table} />
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      <Dialog.Root open={rejectOpen} onOpenChange={setRejectOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Reject products" />
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="Explain what the creators should change. This is sent with each rejection." />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Root>
                <Field.Label htmlFor="bulk-rejection-reason">
                  <Trans message="Rejection reason" />
                </Field.Label>
                <Textarea
                  id="bulk-rejection-reason"
                  rows={4}
                  value={bulkReason}
                  onChange={e => setBulkReason(e.target.value)}
                  placeholder={trans({
                    message: 'Explain what the creator should change.',
                  })}
                />
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseButton>
                <Trans message="Cancel" />
              </Dialog.CloseButton>
              <Button
                variant="outline"
                color="danger"
                disabled={bulkReject.isPending}
                onClick={() => bulkReject.mutate()}
              >
                <XIcon />
                <Trans message="Reject" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout.MainSection>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = 'default',
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'default' | 'positive' | 'warning';
  active?: boolean;
  onClick?: () => void;
}) {
  const iconClass =
    tone === 'positive'
      ? 'text-positive bg-positive/10'
      : tone === 'warning'
        ? 'text-amber-600 bg-amber-500/10 dark:text-amber-400'
        : 'text-muted-foreground bg-muted';

  const card = (
    <Card size="sm" className="gap-3">
      <Card.Header>
        <Card.Title className="truncate text-sm font-normal text-muted-foreground">
          <Trans message={label} />
        </Card.Title>
        <Card.Action>
          <span
            className={`flex size-9 items-center justify-center rounded-card-sm [&>svg]:size-4 ${iconClass}`}
          >
            {icon}
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </Card.Content>
    </Card>
  );

  if (!onClick) {
    return card;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-card text-left transition-opacity hover:opacity-90 ${
        active ? 'ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background' : ''
      }`}
    >
      {card}
    </button>
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
    <Empty.Root className="border-0 py-8">
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
