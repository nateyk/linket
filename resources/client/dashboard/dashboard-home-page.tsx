import {trackedEventsReportOptions} from '@app/dashboard/reports/tracked-events-queries';
import {CreatorSetupChecklist} from './creator-setup-checklist';
import type {GenerateTrackedEventsReport200Data} from '@app/gen/schemas/generate-tracked-events-report200-data';
import {PaymentStatusLabel} from '@app/dashboard/digital-products/payment-status-badge';
import {ReportDateSelector} from '@common/admin/analytics/report-date-selector';
import {apiClient} from '@common/http/query-client';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button, LinkButton} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {formatMoney, getSiteCurrency} from '@ui/i18n/format-money';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {
  generateTimeChartLabel,
  generateTimeChartTooltip,
} from '@shadcn/chart/chart-utils';
import {Empty} from '@shadcn/empty/empty';
import {Progress} from '@shadcn/progress/progress';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {
  type Column,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ArrowRightIcon,
  ChartNoAxesCombinedIcon,
  CircleAlertIcon,
  CircleDollarSignIcon,
  LandmarkIcon,
  Link2Icon,
  MapPinIcon,
  MousePointerClickIcon,
  ReceiptTextIcon,
  ArrowUpDownIcon,
  Columns3Icon,
  SearchIcon,
  WalletCardsIcon,
  type LucideIcon,
} from 'lucide-react';
import {ReactNode, useCallback, useMemo, useRef, useState} from 'react';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import {Link} from 'react-router';

type SalesSummary = {
  verified_sales_count: number;
  verified_revenue_cents: number;
  pending_count: number;
  manual_review_count: number;
  currency: string;
};

type SalesResponse = {
  summary: SalesSummary;
  data: {data: DashboardOrder[]};
  sales_trend: {date: string; amount_cents: number}[];
  verification_allowance: {consumed: number; remaining: number; reserved: number; limit: number; is_pro: boolean};
};

type DashboardOrder = {
  uuid: string;
  status: string;
  gross_amount_cents: number;
  currency: string;
  buyer_name?: string | null;
  created_at?: string;
  paid_at?: string;
  product?: {title: string} | null;
};

export function Component() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    DateRangePresets[2]!.getRangeValue(),
  );

  const title = <Trans message="Overview" />;

  return (
    <>
      <StaticPageTitle>{title}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle render={<h1 />}>{title}</DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
            <StatCards dateRange={dateRange} />
            <CreatorSetupChecklist />
            <AllowanceCards />
            <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
              <EngagementTrend
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              <TopLocations dateRange={dateRange} />
              <SalesTrend dateRange={dateRange} />
              <RecentOrders />
              <TopReferrers dateRange={dateRange} />
            </div>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

function AllowanceCards() {
  const {data, isLoading, isError} = useDashboardSales();
  const allowance = data?.verification_allowance;
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <Card size="sm"><Card.Header><Card.Title><Trans message="Payments needing manual review" /></Card.Title></Card.Header><Card.Content>{isLoading ? <Skeleton className="h-8 w-20" /> : isError ? <SalesErrorState /> : <FormattedNumber value={data?.summary.manual_review_count ?? 0} />}</Card.Content></Card>
    <Card size="sm"><Card.Header><Card.Title><Trans message="Verification allowance" /></Card.Title></Card.Header><Card.Content>{isLoading ? <Skeleton className="h-8 w-20" /> : isError || !allowance ? <SalesErrorState /> : allowance.is_pro ? <Trans message="Unlimited eligible verified sales" /> : <><p><Trans message=":used of :limit used" values={{used: allowance.consumed, limit: allowance.limit}} /></p><p><Trans message=":remaining remaining · :reserved reserved" values={{remaining: allowance.remaining, reserved: allowance.reserved}} /></p>{allowance.remaining <= 2 && <Link to="/account-settings/billing" className="text-primary underline"><Trans message="Explore Pro" /></Link>}</>}</Card.Content></Card>
    <Card size="sm"><Card.Header><Card.Title><Trans message="Current subscription" /></Card.Title></Card.Header><Card.Content>{isLoading ? <Skeleton className="h-8 w-20" /> : isError || !allowance ? <SalesErrorState /> : allowance.is_pro ? <Trans message="Pro" /> : <Trans message="Free" />}</Card.Content></Card>
  </section>;
}

function SalesTrend({dateRange}: {dateRange: DateRangeValue}) {
  const {data, isLoading, isError} = useDashboardSales(dateRange);
  return <Card size="sm" className="min-w-0 lg:col-span-12"><Card.Header><Card.Title><Trans message="Verified sales trend" /></Card.Title><Card.Description><Trans message="Verified revenue in the selected period" /></Card.Description></Card.Header><Card.Content className="min-h-52">
    {isLoading ? <Skeleton className="h-48 w-full" /> : isError ? <SalesErrorState /> : !data?.sales_trend.length ? <OverviewEmptyState icon={CircleDollarSignIcon} title={<Trans message="No verified sales in this period" />} description={<Trans message="Verified sales will appear here." />} /> : <Chart.Container className="h-52 w-full"><AreaChart data={data.sales_trend}><CartesianGrid vertical={false} /><XAxis dataKey="date" /><YAxis hide /><Chart.Tooltip formatter={value => formatMoney(Number(value), 'ETB')} /><Area dataKey="amount_cents" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} /></AreaChart></Chart.Container>}
  </Card.Content></Card>;
}

function StatCards({dateRange}: {dateRange: DateRangeValue}) {
  const workspaceId = useWorkspaceStore(s => s.activeWorkspace?.id);
  const {
    data: salesData,
    isLoading: salesLoading,
    isError: salesError,
  } = useDashboardSales();

  const {
    data: engagementReport,
    isLoading: engagementLoading,
    isError: engagementError,
  } = useQuery({
    ...trackedEventsReportOptions({
      ...{dashboard: '1'},
      workspace_id: workspaceId ? String(workspaceId) : undefined,
      metric: 'events',
      start_date: dateRange.start.toAbsoluteString(),
      end_date: dateRange.end.toAbsoluteString(),
      timezone: dateRange.start.timeZone,
    }),
    placeholderData: keepPreviousData,
  });

  const summary = salesData?.summary;
  const currency = summary?.currency ?? getSiteCurrency();
  const engagements = engagementReport?.data?.events?.total ?? 0;

  const cards: Array<{
    key: string;
    label: ReactNode;
    scope: ReactNode;
    value: number | null | undefined;
    icon: LucideIcon;
    format: 'currency' | 'number';
    tone: string;
  }> = [
    {
      key: 'verified-revenue',
      label: <Trans message="Verified sales revenue" />,
      scope: <Trans message="Lifetime" />,
      value: salesLoading
        ? null
        : salesError
          ? undefined
          : (summary?.verified_revenue_cents ?? 0),
      icon: CircleDollarSignIcon,
      format: 'currency',
      tone: 'text-primary bg-primary/10',
    },
    {
      key: 'verified-sales',
      label: <Trans message="Verified sales" />,
      scope: <Trans message="Lifetime" />,
      value: salesLoading
        ? null
        : salesError
          ? undefined
          : (summary?.verified_sales_count ?? 0),
      icon: WalletCardsIcon,
      format: 'number',
      tone: 'text-positive bg-positive/10',
    },
    {
      key: 'pending-verification',
      label: <Trans message="Awaiting payment or verification" />,
      scope: <Trans message="Lifetime" />,
      value: salesLoading
        ? null
        : salesError
          ? undefined
          : (summary?.pending_count ?? 0),
      icon: LandmarkIcon,
      format: 'number',
      tone: 'text-warning bg-warning/10',
    },
    {
      key: 'engagements',
      label: <Trans message="Engagements" />,
      scope: <Trans message="Selected period" />,
      value: engagementLoading
        ? null
        : engagementError
          ? undefined
          : engagements,
      icon: MousePointerClickIcon,
      format: 'number',
      tone: 'text-muted-foreground bg-muted',
    },
  ];

  return (
    <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => {
        const Icon = card.icon;

        return (
          <Card key={card.key} size="sm" className="min-h-32 gap-3">
            <Card.Header>
              <Card.Title className="text-sm font-normal leading-snug text-muted-foreground whitespace-normal">
                {card.label}
              </Card.Title>
              <Card.Description className="text-xs">
                {card.scope}
              </Card.Description>
              <Card.Action>
                <span
                  className={`flex size-9 items-center justify-center rounded-card-sm [&>svg]:size-4 ${card.tone}`}
                >
                  <Icon aria-hidden="true" />
                </span>
              </Card.Action>
            </Card.Header>
            <Card.Content>
              {card.value === null ? (
                <Skeleton className="h-8 w-28" />
              ) : card.value === undefined ? (
                <p className="text-2xl font-semibold tracking-tight text-muted-foreground tabular-nums">
                  —
                </p>
              ) : card.format === 'currency' ? (
                <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
                  <FormattedCurrency
                    valueInCents={card.value}
                    currency={currency}
                  />
                </p>
              ) : (
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  <FormattedNumber value={card.value} />
                </p>
              )}
            </Card.Content>
          </Card>
        );
      })}
    </section>
  );
}

function EngagementTrend({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: DateRangeValue;
  onDateRangeChange: (dateRange: DateRangeValue) => void;
}) {
  const {localeCode} = useSelectedLocale();
  const {report, contentRef, isLoading, isError} = useAsyncChart({
    dateRange,
    metric: 'events',
  });

  const isEmpty = !isLoading && !isError && !report?.data.length;

  return (
    <Card size="sm" className="min-w-0 lg:col-span-8">
      <Card.Header>
        <Card.Title>
          <Trans message="Engagement trend" />
        </Card.Title>
        <Card.Description>
          <Trans
            message=":count engagements in the selected period"
            values={{count: <FormattedNumber value={report?.total ?? 0} />}}
          />
        </Card.Description>
        <Card.Action className="max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-3 max-sm:mt-2 max-sm:w-full max-sm:[&>button]:w-full">
          <ReportDateSelector
            value={dateRange}
            onChange={onDateRangeChange}
            compactOnMobile
          />
        </Card.Action>
      </Card.Header>
      <Card.Content ref={contentRef} className="relative h-72 min-w-0 flex-1">
        {!isLoading && !isError && !isEmpty && (
          <Chart.Container className="size-full">
            <AreaChart data={report?.data} margin={{left: 0, right: 8}}>
              <defs>
                <linearGradient
                  id="fillEngagements"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  const dataItem = report?.data[index];
                  if (!dataItem) return value;

                  return generateTimeChartLabel({
                    locale: localeCode,
                    granularity: report.granularity,
                    dataItem,
                  });
                }}
              />
              <YAxis dataKey="value" domain={[0, 'dataMax']} hide />
              <Chart.Tooltip
                content={
                  <Chart.TooltipContent
                    itemName={<Trans message="Engagements" />}
                    labelFormatter={(_, payload) =>
                      generateTimeChartTooltip({
                        locale: localeCode,
                        granularity: report?.granularity,
                        dataItem: payload?.[0]?.payload,
                      })
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                fill="url(#fillEngagements)"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{r: 4}}
              />
            </AreaChart>
          </Chart.Container>
        )}
        {isLoading && <Chart.LoadingIndicator />}
        {isError && <AnalyticsErrorState />}
        {isEmpty && (
          <OverviewEmptyState
            icon={ChartNoAxesCombinedIcon}
            title={<Trans message="No engagement activity yet" />}
            description={
              <Trans message="Activity in this date range will appear here." />
            }
          />
        )}
      </Card.Content>
    </Card>
  );
}

function TopLocations({dateRange}: {dateRange: DateRangeValue}) {
  const {report, contentRef, isLoading, isError} = useAsyncChart({
    dateRange,
    metric: 'countries',
  });

  const locations = report?.data.slice(0, 5) ?? [];

  return (
    <Card size="sm" className="min-w-0 lg:col-span-4">
      <Card.Header>
        <Card.Title>
          <Trans message="Top locations" />
        </Card.Title>
        <Card.Description>
          <Trans message="Engagements by country" />
        </Card.Description>
        <Card.Action>
          <span className="flex size-8 items-center justify-center rounded-card-sm bg-muted text-muted-foreground [&>svg]:size-4">
            <MapPinIcon aria-hidden="true" />
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content ref={contentRef} className="min-h-64 flex-1">
        {isLoading ? (
          <RankedListSkeleton />
        ) : isError ? (
          <AnalyticsErrorState />
        ) : locations.length ? (
          <ol className="flex flex-col gap-4">
            {locations.map((location, index) => (
              <li key={`${location.code}-${location.label}`}>
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {location.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    <FormattedNumber value={location.value} /> ·{' '}
                    <FormattedNumber
                      value={location.percentage / 100}
                      style="percent"
                      maximumFractionDigits={0}
                    />
                  </span>
                </div>
                <Progress.Root
                  aria-label={location.label}
                  value={Math.min(location.percentage, 100)}
                  className="mt-2"
                >
                  <Progress.Track>
                    <Progress.Indicator />
                  </Progress.Track>
                </Progress.Root>
              </li>
            ))}
          </ol>
        ) : (
          <OverviewEmptyState
            icon={MapPinIcon}
            title={<Trans message="No location data yet" />}
            description={
              <Trans message="Country activity will appear after people engage with your content." />
            }
          />
        )}
      </Card.Content>
    </Card>
  );
}

type RecentOrderFilter = 'all' | 'verified' | 'pending' | 'review' | 'expired';

/** The overview only has the latest five orders, so filtering is intentionally local. */
function recentOrderMatchesStatus(status: string, filter: RecentOrderFilter) {
  switch (filter) {
    case 'all':
      return true;
    case 'verified':
      return ['paid', 'completed', 'fulfilled'].includes(status);
    case 'pending':
      return ['pending', 'pending_payment', 'verifying'].includes(status);
    case 'review':
      return status === 'manual_review';
    case 'expired':
      return ['expired', 'failed_verification'].includes(status);
  }
}

function RecentOrderSortHeader({
  column,
  children,
}: {
  column: Column<DashboardOrder>;
  children: ReactNode;
}) {
  const direction = column.getIsSorted();
  return (
    <button
      type="button"
      className="inline-flex min-h-9 items-center gap-1 rounded-input px-1 text-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      onClick={() => column.toggleSorting(direction === 'asc')}
    >
      {children}
      <ArrowUpDownIcon className="size-3.5 shrink-0" aria-hidden="true" />
    </button>
  );
}

function RecentOrders() {
  const {data: salesData, isLoading, isError} = useDashboardSales();
  const {trans} = useTrans();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecentOrderFilter>('all');
  const [sorting, setSorting] = useState<SortingState>([{id: 'date', desc: true}]);
  // Three useful columns fit the dashboard card. The other two are opt-in.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    buyer: false,
    date: false,
  });

  // TanStack Table requires referentially stable data. Creating fresh slice/filter
  // arrays during each render makes its sorting/visibility updates re-render forever.
  const fetchedOrders = salesData?.data.data;
  const orders = useMemo(() => fetchedOrders?.slice(0, 5) ?? [], [fetchedOrders]);
  const query = search.trim().toLocaleLowerCase();
  const visibleOrders = useMemo(() => {
    if (!query && statusFilter === 'all') return orders;
    return orders.filter(order => {
      if (!recentOrderMatchesStatus(order.status, statusFilter)) return false;
      if (!query) return true;
      return [
        order.uuid,
        order.product?.title,
        order.buyer_name,
        order.status.replaceAll('_', ' '),
      ].some(value => value?.toLocaleLowerCase().includes(query));
    });
  }, [orders, query, statusFilter]);

  const columns = useMemo<ColumnDef<DashboardOrder>[]>(() => [
    {
      id: 'product',
      accessorFn: order => order.product?.title ?? '',
      enableHiding: false,
      header: ({column}) => (
        <RecentOrderSortHeader column={column}><Trans message="Product" /></RecentOrderSortHeader>
      ),
      cell: ({row, table}) => {
        const order = row.original;
        return (
          <div className="min-w-0">
            <span className="block truncate font-medium" title={order.product?.title ?? undefined}>
              {order.product?.title ?? <Trans message="Digital product" />}
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-mono">#{order.uuid.slice(0, 8)}</span>
              {!table.getColumn('buyer')?.getIsVisible() && (
                <span className="min-w-0 truncate">
                  {order.buyer_name || <Trans message="Guest buyer" />}
                </span>
              )}
              {!table.getColumn('date')?.getIsVisible() && (
                <span className="whitespace-nowrap"><OrderDate order={order} /></span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'buyer',
      accessorFn: order => order.buyer_name || '',
      header: ({column}) => (
        <RecentOrderSortHeader column={column}><Trans message="Buyer" /></RecentOrderSortHeader>
      ),
      cell: ({row}) => (
        <span className="block max-w-36 truncate">
          {row.original.buyer_name || <Trans message="Guest buyer" />}
        </span>
      ),
    },
    {
      id: 'date',
      accessorFn: order => order.paid_at ?? order.created_at ?? '',
      header: ({column}) => (
        <RecentOrderSortHeader column={column}><Trans message="Date" /></RecentOrderSortHeader>
      ),
      cell: ({row}) => (
        <span className="whitespace-nowrap text-muted-foreground">
          <OrderDate order={row.original} />
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      enableHiding: false,
      header: ({column}) => (
        <RecentOrderSortHeader column={column}><Trans message="Status" /></RecentOrderSortHeader>
      ),
      cell: ({row}) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      id: 'amount',
      accessorKey: 'gross_amount_cents',
      enableHiding: false,
      header: ({column}) => (
        <RecentOrderSortHeader column={column}><Trans message="Amount" /></RecentOrderSortHeader>
      ),
      cell: ({row}) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          <FormattedCurrency
            valueInCents={row.original.gross_amount_cents}
            currency={row.original.currency}
          />
        </span>
      ),
    },
  ], []);

  const table = useReactTable({
    data: visibleOrders,
    columns,
    getRowId: row => row.uuid,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    enableSortingRemoval: false,
    state: {sorting, columnVisibility},
  });
  const rows = table.getRowModel().rows;
  const filtered = search.length > 0 || statusFilter !== 'all';
  const statusOptions: {value: RecentOrderFilter; label: string}[] = [
    {value: 'all', label: trans({message: 'All statuses'})},
    {value: 'verified', label: trans({message: 'Verified'})},
    {value: 'pending', label: trans({message: 'Awaiting payment'})},
    {value: 'review', label: trans({message: 'Needs review'})},
    {value: 'expired', label: trans({message: 'Failed or expired'})},
  ];
  const currentStatus = statusOptions.find(option => option.value === statusFilter)?.label;

  return (
    <Card size="sm" className="min-w-0 gap-0 overflow-hidden lg:col-span-8">
      <Card.Header className="gap-1 pb-3">
        <Card.Title id="recent-orders-title">
          <Trans message="Recent orders" />
        </Card.Title>
        <Card.Description>
          <Trans message="Latest digital product purchases" />
        </Card.Description>
        <Card.Action>
          <LinkButton to="/dashboard/orders" variant="ghost" size="sm" className="min-h-9 gap-1.5">
            <Trans message="See all orders" />
            <ArrowRightIcon className="size-4" data-icon="inline-end" aria-hidden="true" />
          </LinkButton>
        </Card.Action>
      </Card.Header>

      <Card.Content className="min-w-0 flex-1 border-t px-0 pb-0">
        {isLoading ? (
          <div className="divide-y" aria-busy="true" aria-label={trans({message: 'Loading recent orders'})}>
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3 max-w-48" />
                  <Skeleton className="h-3 w-1/2 max-w-28" />
                </div>
                <Skeleton className="h-5 w-20 shrink-0 rounded-pill" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-4"><SalesErrorState /></div>
        ) : orders.length ? (
          <>
            <div
              data-slot="recent-orders-toolbar"
              role="toolbar"
              aria-label={trans({message: 'Filter recent orders'})}
              className="flex min-w-0 flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="relative min-w-0 flex-1">
                <SearchIcon
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  bindToHookForm={false}
                  type="search"
                  aria-label={trans({message: 'Search recent orders'})}
                  placeholder={trans({message: 'Search recent orders'})}
                  className="h-9 ps-9"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Select.Root
                  value={statusFilter}
                  onValueChange={value => setStatusFilter((value || 'all') as RecentOrderFilter)}
                >
                  <Select.Trigger
                    aria-label={trans({message: 'Filter by payment status'})}
                    className="min-w-0 flex-1 sm:w-36 sm:flex-none"
                  >
                    <Select.Value>{currentStatus}</Select.Value>
                  </Select.Trigger>
                  <Select.Content align="end">
                    {statusOptions.map(option => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <div className="hidden md:block">
                  <Dropdown.Root>
                    <Dropdown.Trigger
                    render={<Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5" />}
                    aria-label={trans({message: 'Choose visible columns'})}
                  >
                    <Columns3Icon className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline"><Trans message="Columns" /></span>
                  </Dropdown.Trigger>
                  <Dropdown.Content align="end">
                    <Dropdown.Group>
                      <Dropdown.GroupLabel><Trans message="Show columns" /></Dropdown.GroupLabel>
                      {(['buyer', 'date'] as const).map(id => {
                        const column = table.getColumn(id);
                        return (
                          <Dropdown.CheckboxItem
                            key={id}
                            checked={column?.getIsVisible() ?? false}
                            onCheckedChange={value => column?.toggleVisibility(!!value)}
                          >
                            <Trans message={id === 'buyer' ? 'Buyer' : 'Date'} />
                          </Dropdown.CheckboxItem>
                        );
                      })}
                    </Dropdown.Group>
                  </Dropdown.Content>
                  </Dropdown.Root>
                </div>
              </div>
            </div>

            {rows.length ? (
              <>
                <div className="hidden min-w-0 overflow-x-auto md:block" data-slot="recent-orders-data-table">
                  <Table.Root className="min-w-[29rem] table-auto">
                    <Table.Caption className="sr-only"><Trans message="Recent orders" /></Table.Caption>
                    <Table.Header className="bg-muted/30">
                      {table.getHeaderGroups().map(group => (
                        <Table.Row key={group.id} className="hover:bg-transparent">
                          {group.headers.map(header => {
                            const sort = header.column.getIsSorted();
                            return (
                              <Table.Head
                                key={header.id}
                                scope="col"
                                aria-sort={sort ? (sort === 'asc' ? 'ascending' : 'descending') : undefined}
                                className={
                                  header.column.id === 'product' ? 'min-w-40 ps-4' :
                                    header.column.id === 'status' ? 'min-w-40' :
                                      header.column.id === 'amount' ? 'min-w-24 pe-4 text-end' :
                                        'min-w-28'
                                }
                              >
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                              </Table.Head>
                            );
                          })}
                        </Table.Row>
                      ))}
                    </Table.Header>
                    <Table.Body>
                      {rows.map(row => (
                        <Table.Row key={row.id} className="hover:bg-muted/30">
                          {row.getVisibleCells().map(cell => (
                            <Table.Cell
                              key={cell.id}
                              className={
                                cell.column.id === 'product' ? 'ps-4 py-3 whitespace-normal' :
                                  cell.column.id === 'status' ? 'py-3 whitespace-normal' :
                                    cell.column.id === 'amount' ? 'pe-4 py-3 text-end' :
                                      'py-3'
                              }
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Table.Cell>
                          ))}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </div>

                <ol className="divide-y md:hidden" aria-labelledby="recent-orders-title">
                  {rows.map(row => {
                    const order = row.original;
                    return (
                      <li key={order.uuid} className="min-w-0 px-4 py-3.5">
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium" title={order.product?.title ?? undefined}>
                              {order.product?.title ?? <Trans message="Digital product" />}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {order.buyer_name || <Trans message="Guest buyer" />}
                              <span aria-hidden="true"> · </span>
                              <span>#{order.uuid.slice(0, 8)}</span>
                            </p>
                          </div>
                          <span className="shrink-0 text-end font-medium tabular-nums">
                            <FormattedCurrency valueInCents={order.gross_amount_cents} currency={order.currency} />
                          </span>
                        </div>
                        <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                          <OrderStatusBadge status={order.status} />
                          <span className="text-xs text-muted-foreground"><OrderDate order={order} /></span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-4 py-6 text-center" role="status">
                <p className="text-sm font-medium"><Trans message="No matching orders" /></p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {setSearch(''); setStatusFilter('all');}}
                >
                  <Trans message="Clear filters" />
                </Button>
              </div>
            )}
            {filtered && rows.length > 0 && (
              <p className="sr-only" role="status" aria-live="polite">
                {rows.length} / {orders.length}
              </p>
            )}
          </>
        ) : (
          <div className="px-4">
            <OverviewEmptyState
              icon={ReceiptTextIcon}
              title={<Trans message="No orders yet" />}
              description={<Trans message="Your latest digital product orders will appear here." />}
            />
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function TopReferrers({dateRange}: {dateRange: DateRangeValue}) {
  const {report, contentRef, isLoading, isError} = useAsyncChart({
    dateRange,
    metric: 'referrers',
  });

  const referrers = report?.data.slice(0, 5) ?? [];

  return (
    <Card size="sm" className="min-w-0 lg:col-span-4">
      <Card.Header>
        <Card.Title>
          <Trans message="Top referrers" />
        </Card.Title>
        <Card.Description>
          <Trans message="Where engagement started" />
        </Card.Description>
        <Card.Action>
          <span className="flex size-8 items-center justify-center rounded-card-sm bg-muted text-muted-foreground [&>svg]:size-4">
            <Link2Icon aria-hidden="true" />
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content ref={contentRef} className="min-h-64 flex-1">
        {isLoading ? (
          <RankedListSkeleton />
        ) : isError ? (
          <AnalyticsErrorState />
        ) : referrers.length ? (
          <ol className="flex flex-col gap-4">
            {referrers.map((referrer, index) => (
              <li key={`${referrer.label}-${index}`}>
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {referrer.label ? (
                      formatReferrer(referrer.label)
                    ) : (
                      <Trans message="Direct, email or SMS" />
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    <FormattedNumber value={referrer.value} /> ·{' '}
                    <FormattedNumber
                      value={referrer.percentage / 100}
                      style="percent"
                      maximumFractionDigits={0}
                    />
                  </span>
                </div>
                <Progress.Root
                  aria-label={referrer.label}
                  value={Math.min(referrer.percentage, 100)}
                  className="mt-2"
                >
                  <Progress.Track>
                    <Progress.Indicator />
                  </Progress.Track>
                </Progress.Root>
              </li>
            ))}
          </ol>
        ) : (
          <OverviewEmptyState
            icon={Link2Icon}
            title={<Trans message="No referrer data yet" />}
            description={
              <Trans message="Traffic sources will appear after people engage with your content." />
            }
          />
        )}
      </Card.Content>
    </Card>
  );
}

function OrderStatusBadge({status}: {status: string}) {
  const verified =
    status === 'paid' || status === 'completed' || status === 'fulfilled';
  return (
    <Badge
      className="h-auto max-w-full min-w-0 shrink whitespace-normal break-words py-1 text-start leading-4"
      variant={
        verified
          ? 'positive'
          : status === 'failed_verification'
            ? 'destructive'
            : 'secondary'
      }
    >
      <PaymentStatusLabel status={status} />
    </Badge>
  );
}

function OrderDate({order}: {order: DashboardOrder}) {
  const date = order.paid_at ?? order.created_at;

  return date ? <FormattedDate date={date} /> : <Trans message="Date unavailable" />;
}

function RankedListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

function OverviewEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <Empty.Root className="min-h-52 border-0 p-6">
      <Empty.Header>
        <Empty.Media variant="icon">
          <Icon />
        </Empty.Media>
        <Empty.Title className="text-base">{title}</Empty.Title>
        <Empty.Description>{description}</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}

function AnalyticsErrorState() {
  return (
    <OverviewEmptyState
      icon={CircleAlertIcon}
      title={<Trans message="Unable to load analytics" />}
      description={<Trans message="Refresh the page to try again." />}
    />
  );
}

function SalesErrorState() {
  return (
    <OverviewEmptyState
      icon={CircleAlertIcon}
      title={<Trans message="Unable to load orders" />}
      description={<Trans message="Refresh the page to try again." />}
    />
  );
}

function useDashboardSales(dateRange?: DateRangeValue) {
  const workspaceId = useWorkspaceStore(s => s.activeWorkspace?.id);
  const from = dateRange?.start.toString().slice(0, 10);
  const to = dateRange?.end.toString().slice(0, 10);
  return useQuery({
    queryKey: ['dashboard-sales-summary', workspaceId, from, to],
    queryFn: async () => {
      const response = await apiClient.get<SalesResponse>(
        '/api/v1/storefront/direct-orders', {params: {from, to, per_page: 5}},
      );
      return response.data;
    },
  });
}

type ReportMetric = keyof GenerateTrackedEventsReport200Data;

function useAsyncChart<Metric extends ReportMetric>({
  dateRange,
  metric,
}: {
  dateRange: DateRangeValue;
  metric: Metric;
}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const workspaceId = useWorkspaceStore(s => s.activeWorkspace?.id);

  const params: Record<string, string> = {
    metric,
    dashboard: '1',
    ...(workspaceId ? {workspace_id: String(workspaceId)} : {}),
    start_date: dateRange.start.toAbsoluteString(),
    end_date: dateRange.end.toAbsoluteString(),
    timezone: dateRange.start.timeZone,
  };

  const query = useQuery({
    ...trackedEventsReportOptions(params),
    enabled: isEnabled,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

  const observerRef = useRef<IntersectionObserver>(null);

  const contentRef = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsEnabled(true);
            observerRef.current?.disconnect();
            observerRef.current = null;
          }
        },
        {threshold: 0.1},
      );
      observerRef.current = observer;
      observer.observe(element);
    } else if (observerRef.current) {
      observerRef.current.disconnect();
    }
  }, []);

  return {
    report: query.data?.data?.[metric] as
      | GenerateTrackedEventsReport200Data[Metric]
      | undefined,
    isLoading: !isEnabled || query.isLoading,
    isError: query.isError,
    contentRef,
  };
}

function formatReferrer(value: string): string {
  try {
    const url = new URL(value);
    return url.hostname || value;
  } catch {
    return value;
  }
}
