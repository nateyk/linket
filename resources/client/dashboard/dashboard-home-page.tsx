import {trackedEventsReportOptions} from '@app/dashboard/reports/tracked-events-queries';
import type {GenerateTrackedEventsReport200Data} from '@app/gen/schemas/generate-tracked-events-report200-data';
import type {StorefrontOrder} from '@app/gen/schemas/storefront-order';
import {ReportDateSelector} from '@common/admin/analytics/report-date-selector';
import {apiClient} from '@common/http/query-client';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {
  generateTimeChartLabel,
  generateTimeChartTooltip,
} from '@shadcn/chart/chart-utils';
import {Empty} from '@shadcn/empty/empty';
import {Progress} from '@shadcn/progress/progress';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Trans} from '@ui/i18n/trans';
import {
  ChartNoAxesCombinedIcon,
  CircleAlertIcon,
  CircleDollarSignIcon,
  LandmarkIcon,
  Link2Icon,
  MapPinIcon,
  MousePointerClickIcon,
  ReceiptTextIcon,
  WalletCardsIcon,
  type LucideIcon,
} from 'lucide-react';
import {ReactNode, useCallback, useRef, useState} from 'react';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';

type SalesSummary = {
  gross_sales_cents: number;
  creator_earnings_cents: number;
  available_for_payout_cents: number;
  held_earnings_cents: number;
  reserved_payout_cents: number;
  paid_out_cents: number;
  lifetime_earnings_cents: number;
  currency: string;
};

type SalesResponse = {
  summary: SalesSummary;
  orders: StorefrontOrder[];
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
          <DashboardLayout.SectionTitle>{title}</DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
            <StatCards dateRange={dateRange} />
            <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
              <EngagementTrend
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              <TopLocations dateRange={dateRange} />
              <RecentOrders />
              <TopReferrers dateRange={dateRange} />
            </div>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

function StatCards({dateRange}: {dateRange: DateRangeValue}) {
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
      metric: 'events',
      start_date: dateRange.start.toAbsoluteString(),
      end_date: dateRange.end.toAbsoluteString(),
      timezone: dateRange.start.timeZone,
    }),
    placeholderData: keepPreviousData,
  });

  const summary = salesData?.summary;
  const currency = summary?.currency ?? 'USD';
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
      key: 'gross-sales',
      label: <Trans message="Gross sales" />,
      scope: <Trans message="Lifetime" />,
      value: salesLoading
        ? null
        : salesError
          ? undefined
          : (summary?.gross_sales_cents ?? 0),
      icon: CircleDollarSignIcon,
      format: 'currency',
      tone: 'text-primary bg-primary/10',
    },
    {
      key: 'creator-earnings',
      label: <Trans message="Creator earnings" />,
      scope: <Trans message="Lifetime" />,
      value: salesLoading
        ? null
        : salesError
          ? undefined
          : (summary?.creator_earnings_cents ?? 0),
      icon: WalletCardsIcon,
      format: 'currency',
      tone: 'text-positive bg-positive/10',
    },
    {
      key: 'available-payout',
      label: <Trans message="Available for payout" />,
      scope: <Trans message="Lifetime" />,
      value: salesLoading
        ? null
        : salesError
          ? undefined
          : (summary?.available_for_payout_cents ?? 0),
      icon: LandmarkIcon,
      format: 'currency',
      tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
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
              <Card.Title className="truncate text-sm font-normal text-muted-foreground">
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
  const orders = salesData?.orders.slice(0, 5) ?? [];

  return (
    <Card size="sm" className="min-w-0 lg:col-span-8">
      <Card.Header>
        <Card.Title>
          <Trans message="Recent orders" />
        </Card.Title>
        <Card.Description>
          <Trans message="Latest digital product purchases" />
        </Card.Description>
        <Card.Action>
          <span className="flex size-8 items-center justify-center rounded-card-sm bg-muted text-muted-foreground [&>svg]:size-4">
            <ReceiptTextIcon aria-hidden="true" />
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content className="min-h-64 flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <SalesErrorState />
        ) : orders.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="Product" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Date" />
                    </Table.Head>
                    <Table.Head className="text-end">
                      <Trans message="Gross" />
                    </Table.Head>
                    <Table.Head className="text-end">
                      <Trans message="Earnings" />
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {orders.map(order => (
                    <Table.Row key={order.id}>
                      <Table.Cell className="max-w-56 truncate font-medium">
                        {order.product?.title ?? (
                          <Trans message="Digital product" />
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <OrderStatusBadge status={order.status} />
                      </Table.Cell>
                      <Table.Cell className="text-muted-foreground">
                        <OrderDate order={order} />
                      </Table.Cell>
                      <Table.Cell className="text-end tabular-nums">
                        <FormattedCurrency
                          valueInCents={order.gross_amount_cents}
                          currency={order.currency}
                        />
                      </Table.Cell>
                      <Table.Cell className="text-end font-medium tabular-nums">
                        <FormattedCurrency
                          valueInCents={order.creator_earnings_cents}
                          currency={order.currency}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </div>
            <div className="flex flex-col gap-4 md:hidden">
              {orders.map(order => (
                <article
                  key={order.id}
                  className="flex min-w-0 items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {order.product?.title ?? (
                        <Trans message="Digital product" />
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <OrderStatusBadge status={order.status} />
                      <OrderDate order={order} />
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-medium tabular-nums">
                      <FormattedCurrency
                        valueInCents={order.creator_earnings_cents}
                        currency={order.currency}
                      />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Trans message="Earnings" />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
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
  if (status === 'paid' || status === 'completed') {
    return (
      <Badge variant="positive">
        <Trans message="Paid" />
      </Badge>
    );
  }

  if (status === 'failed' || status === 'rejected') {
    return (
      <Badge variant="destructive">
        <Trans message="Failed" />
      </Badge>
    );
  }

  if (status === 'cancelled') {
    return (
      <Badge variant="destructive">
        <Trans message="Cancelled" />
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Trans message="Pending" />
    </Badge>
  );
}

function OrderDate({order}: {order: StorefrontOrder}) {
  const date = order.paid_at ?? order.created_at;

  return date ? formatDate(date) : <Trans message="Date unavailable" />;
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

function useDashboardSales() {
  return useQuery({
    queryKey: ['dashboard-sales-summary'],
    queryFn: async () => {
      const response = await apiClient.get<SalesResponse>(
        '/api/v1/digital-products/sales',
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

  const params: Record<string, string> = {
    metric,
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(
    new Date(value),
  );
}
