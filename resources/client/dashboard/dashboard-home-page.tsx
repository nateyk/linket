import {trackedEventsReportOptions} from '@app/dashboard/reports/tracked-events-queries';
import {GeoChart} from '@common/admin/analytics/geo-chart/geo-chart';
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
  useChartDataWithColors,
} from '@shadcn/chart/chart-utils';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  CircleDollarSignIcon,
  EyeIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  WalletCardsIcon,
} from 'lucide-react';
import {useCallback, useMemo, useRef, useState} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

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

type SalesOrder = {
  id: number;
  currency: string;
  creator_earnings_cents: number;
  gross_cents?: number;
  paid_at?: string;
  created_at: string;
  product?: {id: number; title: string};
};

type SalesResponse = {
  summary: SalesSummary;
  orders: {data: SalesOrder[]};
};

export function Component() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    DateRangePresets[2]!.getRangeValue(),
  );

  const title = <Trans message="Dashboard" />;

  return (
    <>
      <StaticPageTitle>{title}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader className="border-none">
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>{title}</DashboardLayout.SectionTitle>
          <ReportDateSelector
            value={dateRange}
            onChange={setDateRange}
            compactOnMobile={false}
          />
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
            <StatCards dateRange={dateRange} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <ViewsOverTimeChart dateRange={dateRange} />
              <TopCountriesChart dateRange={dateRange} />
              <TopSellingItems />
              <RecentSales />
            </div>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

function StatCards({dateRange}: {dateRange: DateRangeValue}) {
  const {data: salesData, isLoading: salesLoading} = useQuery({
    queryKey: ['dashboard-sales-summary'],
    queryFn: async () => {
      const response = await apiClient.get<SalesResponse>(
        '/api/v1/digital-products/sales',
      );
      return response.data;
    },
  });

  const {data: viewsReport, isLoading: viewsLoading} = useQuery({
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
  const totalViews = viewsReport?.data?.events?.total ?? 0;
  const totalSales = salesData?.orders?.data?.length ?? 0;

  const cards = [
    {
      label: 'Total Sales',
      value: salesLoading ? null : totalSales,
      icon: ShoppingCartIcon,
      isMoney: false,
    },
    {
      label: 'Sales Amount',
      value: salesLoading ? null : (summary?.gross_sales_cents ?? 0),
      icon: CircleDollarSignIcon,
      isMoney: true,
    },
    {
      label: 'Total Earnings',
      value: salesLoading ? null : (summary?.creator_earnings_cents ?? 0),
      icon: WalletCardsIcon,
      isMoney: true,
    },
    {
      label: 'Total Views',
      value: viewsLoading ? null : totalViews,
      icon: EyeIcon,
      isMoney: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <Card key={card.label} size="sm" className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                <Trans message={card.label} />
              </p>
              {card.value === null ? (
                <Skeleton className="mt-1 h-5 w-20" />
              ) : card.isMoney ? (
                <p className="text-lg font-semibold">
                  {formatMoney(card.value, currency)}
                </p>
              ) : (
                <p className="text-lg font-semibold">
                  <FormattedNumber value={card.value} />
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ViewsOverTimeChart({dateRange}: {dateRange: DateRangeValue}) {
  const {localeCode} = useSelectedLocale();
  const {report, contentRef, isLoading} = useAsyncChart({
    dateRange,
    metric: 'events',
  });

  const isEmpty = !isLoading && !report?.data?.length;

  return (
    <Card size="sm" className="col-span-1 lg:col-span-8">
      <Card.Header>
        <Card.Title>
          <Trans message="Views Statistics" />
        </Card.Title>
        <Card.Description>
          <Trans
            message=":count total views"
            values={{count: <FormattedNumber value={report?.total || 0} />}}
          />
        </Card.Description>
      </Card.Header>
      <Card.Content ref={contentRef} className="relative h-64 flex-1">
        {!isEmpty && (
          <Chart.Container className="size-full">
            <AreaChart data={report?.data} margin={{left: 0}}>
              <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  const dataItem = report?.data[index];
                  if (!dataItem) return value;
                  return generateTimeChartLabel({
                    locale: localeCode,
                    granularity: report?.granularity,
                    dataItem,
                  });
                }}
              />
              <YAxis
                dataKey="value"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 'dataMax']}
                hide
              />
              <Chart.Tooltip
                content={
                  <Chart.TooltipContent
                    itemName={<Trans message="Views" />}
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
                fill="url(#fillViews)"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </Chart.Container>
        )}
        {isLoading && <Chart.LoadingIndicator />}
        {isEmpty && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

function TopCountriesChart({dateRange}: {dateRange: DateRangeValue}) {
  const {trans} = useTrans();
  const {report, contentRef, isLoading} = useAsyncChart({
    dateRange,
    metric: 'countries',
  });

  return (
    <GeoChart
      className="col-span-1 lg:col-span-4"
      datasetLabel={trans({message: 'Views'})}
      data={report?.data as any}
      isLoading={isLoading}
      contentRef={contentRef}
    />
  );
}

function TopSellingItems() {
  const {data: salesData, isLoading} = useQuery({
    queryKey: ['dashboard-sales-summary'],
    queryFn: async () => {
      const response = await apiClient.get<SalesResponse>(
        '/api/v1/digital-products/sales',
      );
      return response.data;
    },
  });

  const topItems = useMemo(() => {
    const orders = salesData?.orders?.data ?? [];
    const productMap = new Map<
      number,
      {title: string; count: number; earnings: number; currency: string}
    >();

    for (const order of orders) {
      if (!order.product) continue;
      const existing = productMap.get(order.product.id);
      if (existing) {
        existing.count += 1;
        existing.earnings += order.creator_earnings_cents;
      } else {
        productMap.set(order.product.id, {
          title: order.product.title,
          count: 1,
          earnings: order.creator_earnings_cents,
          currency: order.currency,
        });
      }
    }

    return [...productMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [salesData]);

  return (
    <Card size="sm" className="col-span-1 lg:col-span-6">
      <Card.Header>
        <Card.Title>
          <Trans message="Top Selling Items" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : topItems.length ? (
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className="shrink-0">
                    {index + 1}
                  </Badge>
                  <span className="truncate font-medium">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">
                    <Trans
                      message=":count sales"
                      values={{count: item.count}}
                    />
                  </span>
                  <Badge>{formatMoney(item.earnings, item.currency)}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Chart.NoDataIndicator />
        )}
      </Card.Content>
    </Card>
  );
}

function RecentSales() {
  const {data: salesData, isLoading} = useQuery({
    queryKey: ['dashboard-sales-summary'],
    queryFn: async () => {
      const response = await apiClient.get<SalesResponse>(
        '/api/v1/digital-products/sales',
      );
      return response.data;
    },
  });

  const orders = salesData?.orders?.data?.slice(0, 5) ?? [];

  return (
    <Card size="sm" className="col-span-1 lg:col-span-6">
      <Card.Header>
        <Card.Title>
          <Trans message="Recent Sales" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : orders.length ? (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>
                  <Trans message="Product" />
                </Table.Head>
                <Table.Head>
                  <Trans message="Date" />
                </Table.Head>
                <Table.Head className="text-end">
                  <Trans message="Earnings" />
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders.map(order => (
                <Table.Row key={order.id}>
                  <Table.Cell className="font-medium">
                    {order.product?.title ?? (
                      <Trans message="Digital product" />
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-muted-foreground">
                    {formatDate(order.paid_at ?? order.created_at)}
                  </Table.Cell>
                  <Table.Cell className="text-end font-medium">
                    {formatMoney(order.creator_earnings_cents, order.currency)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <Chart.NoDataIndicator />
        )}
      </Card.Content>
    </Card>
  );
}

type AsyncChartProps = {
  dateRange: DateRangeValue;
  metric: string;
};

function useAsyncChart({dateRange, metric}: AsyncChartProps) {
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

  const contentRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      const observer = new IntersectionObserver(
        ([e]) => {
          if (e?.isIntersecting) {
            setIsEnabled(true);
            observerRef.current?.disconnect();
            observerRef.current = null;
          }
        },
        {threshold: 0.1},
      );
      observerRef.current = observer;
      observer.observe(el);
    } else if (observerRef.current) {
      observerRef.current?.disconnect();
    }
  }, []);

  return {
    report: query.data?.data?.[metric],
    isLoading: query.isLoading,
    contentRef,
  };
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(
    new Date(value),
  );
}
