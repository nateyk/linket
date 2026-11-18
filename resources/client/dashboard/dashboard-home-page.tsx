import {trackedEventsReportOptions} from '@app/dashboard/reports/tracked-events-queries';
import {CreatorSetupChecklist} from './creator-setup-checklist';
import type {GenerateTrackedEventsReport200Data} from '@app/gen/schemas/generate-tracked-events-report200-data';
import {ReportDateSelector} from '@common/admin/analytics/report-date-selector';
import {apiClient} from '@common/http/query-client';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {LinkButton} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {formatMoney, getSiteCurrency} from '@ui/i18n/format-money';
import {
  generateTimeChartLabel,
  generateTimeChartTooltip,
} from '@shadcn/chart/chart-utils';
import {Empty} from '@shadcn/empty/empty';
import {Progress} from '@shadcn/progress/progress';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ChartNoAxesCombinedIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  Link2Icon,
  MapPinIcon,
  ReceiptTextIcon,
  PackageCheckIcon,
  type LucideIcon,
} from 'lucide-react';
import {ReactNode, useCallback, useRef, useState} from 'react';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import {Link} from 'react-router';

type SalesSummary = {
  net_sales_cents: number;
  paid_orders_count: number;
  items_sold_count: number;
  average_order_cents: number;
  currency: string;
};

type SalesResponse = {
  summary: SalesSummary;
  data: {data: DashboardOrder[]};
  sales_trend: {date: string; amount_cents: number}[];
};

type DashboardOrder = {
  uuid: string;
  status: string;
  gross_amount_cents: number;
  currency: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  created_at?: string;
  paid_at?: string;
  product?: {title: string; cover_url?: string | null} | null;
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
            <StatCards />
            <CreatorSetupChecklist />
            <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
              <RecentOrders />
              <TopReferrers dateRange={dateRange} />
              <SalesTrend dateRange={dateRange} />
              <EngagementTrend
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              <TopLocations dateRange={dateRange} />
            </div>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

function SalesTrend({dateRange}: {dateRange: DateRangeValue}) {
  const {data, isLoading, isError} = useDashboardSales(dateRange);
  return <Card size="sm" className="min-w-0 lg:col-span-12"><Card.Header><Card.Title><Trans message="Sales trend" /></Card.Title><Card.Description><Trans message="Gross revenue from completed orders in the selected period" /></Card.Description></Card.Header><Card.Content className="min-h-52">
    {isLoading ? <Skeleton className="h-48 w-full" /> : isError ? <SalesErrorState /> : !data?.sales_trend.length ? <OverviewEmptyState icon={CircleDollarSignIcon} title={<Trans message="No completed sales in this period" />} description={<Trans message="Completed sales will appear here." />} /> : <Chart.Container className="h-52 w-full"><AreaChart data={data.sales_trend}><CartesianGrid vertical={false} /><XAxis dataKey="date" /><YAxis hide /><Chart.Tooltip formatter={value => formatMoney(Number(value), 'ETB')} /><Area dataKey="amount_cents" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} /></AreaChart></Chart.Container>}
  </Card.Content></Card>;
}

function StatCards() {
  const {
    data: salesData,
    isLoading: salesLoading,
    isError: salesError,
  } = useDashboardSales();

  const summary = salesData?.summary;
  const currency = summary?.currency ?? getSiteCurrency();
  // Missing API totals are unknown, not zero. Preserve loading and error states.
  const metricValue = (value: number | undefined): number | null | undefined => {
    if (salesLoading) return null;
    if (salesError) return undefined;
    return value;
  };

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
      key: 'sales',
      label: <Trans message="Sales" />,
      scope: <Trans message="Net of completed refunds" />,
      value: metricValue(summary?.net_sales_cents),
      icon: CircleDollarSignIcon,
      format: 'currency',
      tone: 'text-primary bg-primary/10',
    },
    {
      key: 'orders',
      label: <Trans message="Orders" />,
      scope: <Trans message="Paid Chapa orders" />,
      value: metricValue(summary?.paid_orders_count),
      icon: ReceiptTextIcon,
      format: 'number',
      tone: 'text-positive bg-positive/10',
    },
    {
      key: 'items-sold',
      label: <Trans message="Items sold" />,
      scope: <Trans message="Units in paid orders" />,
      value: metricValue(summary?.items_sold_count),
      icon: PackageCheckIcon,
      format: 'number',
      tone: 'text-muted-foreground bg-muted',
    },
    {
      key: 'average-order',
      label: <Trans message="Average order" />,
      scope: <Trans message="Net sales per paid order" />,
      value: metricValue(summary?.average_order_cents),
      icon: ChartNoAxesCombinedIcon,
      format: 'currency',
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

function RecentOrders() {
  const {data: salesData, isLoading, isError} = useDashboardSales();
  const {trans} = useTrans();
  const orders = salesData?.data.data?.slice(0, 5) ?? [];

  return (
    <Card size="sm" className="min-w-0 lg:col-span-8">
      <Card.Header>
        <Card.Title>
          <Trans message="Recent orders" />
        </Card.Title>
        <Card.Action>
          <LinkButton to="/dashboard/orders" variant="outline" size="sm">
            <Trans message="View all" />
            <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
          </LinkButton>
        </Card.Action>
      </Card.Header>

      <Card.Content className="min-w-0">
        {isLoading ? (
          <div
            className="divide-y"
            aria-busy="true"
            aria-label={trans({message: 'Loading recent orders'})}
          >
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-3 py-3 md:grid-cols-[2fr_1.4fr_1fr_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-card-sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="hidden h-4 w-24 md:block" />
                <Skeleton className="hidden h-5 w-20 rounded-card-sm md:block" />
                <Skeleton className="h-4 w-16 justify-self-end" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <SalesErrorState />
        ) : orders.length ? (
          <div role="list" aria-label={trans({message: 'Recent orders'})}>
            <div className="hidden grid-cols-[2fr_1.4fr_1fr_auto] gap-4 rounded-card-sm bg-muted px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
              <span>
                <Trans message="Order" />
              </span>
              <span>
                <Trans message="Customer" />
              </span>
              <span>
                <Trans message="Status" />
              </span>
              <span className="w-24 text-end">
                <Trans message="Total" />
              </span>
            </div>
            {orders.map(order => (
              <RecentOrderRow key={order.uuid} order={order} />
            ))}
          </div>
        ) : (
          <OverviewEmptyState
            icon={ReceiptTextIcon}
            title={<Trans message="No orders yet" />}
            description={
              <Trans message="Your latest digital product orders will appear here." />
            }
          />
        )}
      </Card.Content>
    </Card>
  );
}

function RecentOrderRow({order}: {order: DashboardOrder}) {
  const buyerLabel = order.buyer_name?.trim() || null;
  const buyerEmail = order.buyer_email?.trim() || null;
  const productTitle = order.product?.title;
  const orderDate = order.paid_at ?? order.created_at;

  return (
    <Link
      to="/dashboard/orders"
      data-slot="recent-order-row"
      role="listitem"
      className="grid grid-cols-[1fr_auto] items-center gap-4 border-b px-3 py-3 text-sm last:border-b-0 hover:bg-muted/50 md:grid-cols-[2fr_1.4fr_1fr_auto]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 overflow-hidden rounded-card-sm bg-muted">
          {order.product?.cover_url ? (
            <img src={order.product.cover_url} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-xs font-medium text-muted-foreground">
              {Avatar.initials(productTitle) || 'P'}
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-mono font-medium tabular-nums">
            #{order.uuid.slice(0, 8)}
          </span>
          <span
            className="truncate text-xs text-muted-foreground"
            title={productTitle ?? undefined}
          >
            {productTitle ?? <Trans message="Digital product" />}
          </span>
        </span>
      </span>
      <span className="hidden min-w-0 flex-col md:flex">
        <span className="truncate">
          {buyerLabel || <Trans message="Guest buyer" />}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {buyerEmail ? (
            buyerEmail
          ) : orderDate ? (
            <FormattedRelativeTime date={orderDate} />
          ) : (
            <Trans message="Date unavailable" />
          )}
        </span>
      </span>
      <span className="hidden md:block">
        <OrderStatusBadge status={order.status} />
      </span>
      <span className="w-24 text-end font-mono font-medium tabular-nums">
        <FormattedCurrency
          valueInCents={order.gross_amount_cents}
          currency={order.currency}
        />
      </span>
    </Link>
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
  const label = recentOrderStatusLabel(status);
  if (!label) {
    return null;
  }

  return (
    <Badge
      variant={recentOrderStatusVariant(status)}
      className={
        status === 'manual_review' ||
        status === 'pending' ||
        status === 'pending_payment' ||
        status === 'verifying'
          ? 'bg-warning/10 text-warning'
          : undefined
      }
    >
      <span
        className={
          recentOrderStatusDotClass(status)
        }
        aria-hidden="true"
      />
      {label}
    </Badge>
  );
}

function recentOrderStatusLabel(status: string) {
  switch (status) {
    case 'pending':
    case 'pending_payment':
      return <Trans message="Pending" />;
    case 'verifying':
      return <Trans message="Verifying" />;
    case 'paid':
    case 'completed':
    case 'fulfilled':
      return <Trans message="Paid" />;
    case 'failed_verification':
      return <Trans message="Rejected" />;
    case 'manual_review':
      return <Trans message="Review" />;
    case 'expired':
      return <Trans message="Expired" />;
    default:
      return null;
  }
}

function recentOrderStatusVariant(
  status: string,
): 'positive' | 'destructive' | 'outline' | 'secondary' {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'fulfilled':
      return 'positive';
    case 'failed_verification':
    case 'expired':
      return 'destructive';
    case 'manual_review':
      return 'outline';
    default:
      return 'secondary';
  }
}

function recentOrderStatusDotClass(status: string) {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'fulfilled':
      return 'size-1.5 rounded-full bg-positive';
    case 'failed_verification':
    case 'expired':
      return 'size-1.5 rounded-full bg-destructive';
    default:
      return 'size-1.5 rounded-full bg-warning';
  }
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
        '/api/v1/storefront/direct-orders', {params: {gateway: 'chapa', from, to, per_page: 5}},
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
