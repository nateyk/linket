import {AdminReportOutletContext} from '@app/admin/reports/admin-insights-page-layout';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {Empty} from '@shadcn/empty/empty';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  BanknoteArrowDownIcon,
  ChartNoAxesCombinedIcon,
  CircleAlertIcon,
  CircleDollarSignIcon,
  CreditCardIcon,
  HandCoinsIcon,
  LandmarkIcon,
  PackageCheckIcon,
  ReceiptTextIcon,
  RefreshCcwIcon,
  ShoppingBagIcon,
  UsersIcon,
  WalletCardsIcon,
  type LucideIcon,
} from 'lucide-react';
import {ReactNode, useMemo} from 'react';
import {useOutletContext} from 'react-router';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';

interface CommerceInsights {
  currency: string;
  period: {start: string; end: string};
  sales: {
    gross_sales_cents: number;
    refunds_cents: number;
    net_sales_cents: number;
    creator_earnings_cents: number;
    platform_fees_cents: number;
    paid_orders: number;
    unique_customers: number;
  };
  subscriptions: {revenue_cents: number; active_paid: number};
  payouts: {paid_cents: number; pending_cents: number};
  platform: {
    new_users: number;
    total_users: number;
    total_products: number;
    published_products: number;
    selling_creators: number;
  };
  trend: Array<{
    date: string;
    gross_sales_cents: number;
    refunds_cents: number;
    net_sales_cents: number;
    paid_orders: number;
  }>;
  top_products: Array<{
    id: number;
    title: string;
    paid_orders: number;
    gross_sales_cents: number;
    refunds_cents: number;
    net_sales_cents: number;
  }>;
  recent_orders: Array<{
    id: number;
    uuid: string;
    buyer_name: string | null;
    buyer_email: string | null;
    product_title: string;
    creator_name: string;
    gross_amount_cents: number;
    refunds_cents: number;
    paid_at: string;
  }>;
}

interface CommerceInsightsResponse {
  data: CommerceInsights;
}

export function Component() {
  const {dateRange} = useOutletContext<AdminReportOutletContext>();
  const params = {
    start_date: dateRange.start.toAbsoluteString(),
    end_date: dateRange.end.toAbsoluteString(),
    timezone: dateRange.start.timeZone,
  };
  const {data, isLoading, isError} = useQuery({
    queryKey: ['admin-commerce-insights', params],
    queryFn: async () => {
      const response = await apiClient.get<CommerceInsightsResponse>(
        '/api/v1/admin/analytics/commerce',
        {params},
      );
      return response.data.data;
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) return <InsightsLoadingState />;
  if (isError || !data) return <InsightsErrorState />;

  return <InsightsDashboard data={data} />;
}

function InsightsDashboard({data}: {data: CommerceInsights}) {
  const {sales, subscriptions, payouts, platform, currency} = data;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          <Trans message="Business overview" />
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CircleDollarSignIcon}
          label={<Trans message="Net sales" />}
          value={
            <FormattedCurrency
              valueInCents={sales.net_sales_cents}
              currency={currency}
            />
          }
          detail={
            <Trans
              message=":gross gross · :refunds refunded"
              values={{
                gross: (
                  <FormattedCurrency
                    valueInCents={sales.gross_sales_cents}
                    currency={currency}
                  />
                ),
                refunds: (
                  <FormattedCurrency
                    valueInCents={sales.refunds_cents}
                    currency={currency}
                  />
                ),
              }}
            />
          }
          tone="primary"
        />
        <MetricCard
          icon={WalletCardsIcon}
          label={<Trans message="Creator earnings" />}
          value={
            <FormattedCurrency
              valueInCents={sales.creator_earnings_cents}
              currency={currency}
            />
          }
          tone="positive"
        />
        <MetricCard
          icon={LandmarkIcon}
          label={<Trans message="Linket fees" />}
          value={
            <FormattedCurrency
              valueInCents={sales.platform_fees_cents}
              currency={currency}
            />
          }
          tone="warning"
        />
        <MetricCard
          icon={ReceiptTextIcon}
          label={<Trans message="Paid orders" />}
          value={<FormattedNumber value={sales.paid_orders} />}
          detail={
            <Trans
              message=":count customers"
              values={{count: <FormattedNumber value={sales.unique_customers} />}}
            />
          }
          tone="neutral"
        />
      </div>

      <OperationalMetrics
        currency={currency}
        sales={sales}
        subscriptions={subscriptions}
        payouts={payouts}
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <SalesTrend data={data} />
        <PlatformSnapshot platform={platform} />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <TopProducts data={data} />
        <RecentOrders data={data} />
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone: 'primary' | 'positive' | 'warning' | 'neutral';
}

function MetricCard({icon: Icon, label, value, detail, tone}: MetricCardProps) {
  return (
    <Card size="sm" className="min-w-0">
      <Card.Content className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-card-sm',
            tone === 'primary' && 'bg-primary/10 text-primary',
            tone === 'positive' && 'bg-positive/10 text-positive',
            tone === 'warning' && 'bg-warning/10 text-warning',
            tone === 'neutral' && 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold tabular-nums">
            {value}
          </div>
          {detail && (
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {detail}
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

function OperationalMetrics({
  currency,
  sales,
  subscriptions,
  payouts,
}: Pick<CommerceInsights, 'currency' | 'sales' | 'subscriptions' | 'payouts'>) {
  const metrics = [
    {
      icon: RefreshCcwIcon,
      label: <Trans message="Refunded" />,
      value: (
        <FormattedCurrency valueInCents={sales.refunds_cents} currency={currency} />
      ),
    },
    {
      icon: CreditCardIcon,
      label: <Trans message="Subscription revenue" />,
      value: (
        <FormattedCurrency
          valueInCents={subscriptions.revenue_cents}
          currency={currency}
        />
      ),
    },
    {
      icon: UsersIcon,
      label: <Trans message="Active paid subscriptions" />,
      value: <FormattedNumber value={subscriptions.active_paid} />,
    },
    {
      icon: HandCoinsIcon,
      label: <Trans message="Payouts completed" />,
      value: (
        <FormattedCurrency valueInCents={payouts.paid_cents} currency={currency} />
      ),
    },
    {
      icon: BanknoteArrowDownIcon,
      label: <Trans message="Payouts pending" />,
      value: (
        <FormattedCurrency
          valueInCents={payouts.pending_cents}
          currency={currency}
        />
      ),
    },
  ];

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className="text-sm font-medium">
        <Trans message="Revenue operations" />
      </h3>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({icon: Icon, label, value}, index) => (
          <Card key={index} size="sm" className="min-w-0">
            <Card.Content className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs text-muted-foreground">
                  {label}
                </div>
                <div className="mt-0.5 truncate font-semibold tabular-nums">
                  {value}
                </div>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SalesTrend({data}: {data: CommerceInsights}) {
  const {localeCode} = useSelectedLocale();
  const chartData = useMemo(
    () =>
      data.trend.map(item => ({
        ...item,
        grossSales: item.gross_sales_cents / 100,
        netSales: item.net_sales_cents / 100,
      })),
    [data.trend],
  );
  const hasActivity = data.trend.some(
    item => item.gross_sales_cents !== 0 || item.refunds_cents !== 0,
  );
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat(localeCode, {month: 'short', day: 'numeric'}).format(
      new Date(`${date}T00:00:00Z`),
    );

  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Sales performance" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative h-64 min-w-0 md:h-72">
        {hasActivity ? (
          <Chart.Container className="size-full">
            <AreaChart data={chartData} margin={{left: 0, right: 8}}>
              <defs>
                <linearGradient id="adminNetSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                tickFormatter={formatDate}
              />
              <YAxis hide />
              <Chart.Tooltip
                content={
                  <Chart.TooltipContent
                    labelFormatter={label => formatDate(String(label))}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="grossSales"
                name={`Gross sales (${data.currency})`}
                stroke="var(--chart-2)"
                fill="transparent"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="netSales"
                name={`Net sales (${data.currency})`}
                stroke="var(--chart-1)"
                fill="url(#adminNetSales)"
                strokeWidth={2}
                dot={false}
                activeDot={{r: 4}}
              />
            </AreaChart>
          </Chart.Container>
        ) : (
          <Empty className="h-full border-0 p-6">
            <Empty.Header>
              <Empty.Media variant="icon">
                <ChartNoAxesCombinedIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No sales in this period" />
              </Empty.Title>
            </Empty.Header>
          </Empty>
        )}
      </Card.Content>
    </Card>
  );
}

function PlatformSnapshot({platform}: {platform: CommerceInsights['platform']}) {
  const items = [
    {icon: UsersIcon, label: <Trans message="Total users" />, value: platform.total_users},
    {icon: UsersIcon, label: <Trans message="New users in period" />, value: platform.new_users},
    {icon: ShoppingBagIcon, label: <Trans message="Digital products" />, value: platform.total_products},
    {icon: PackageCheckIcon, label: <Trans message="Published products" />, value: platform.published_products},
    {icon: HandCoinsIcon, label: <Trans message="Creators with sales" />, value: platform.selling_creators},
  ];

  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Platform snapshot" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2">
        {items.map(({icon: Icon, label, value}, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-card-sm px-3 py-2.5 odd:bg-muted/50"
          >
            <Icon className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1 truncate text-sm">{label}</div>
            <div className="font-semibold tabular-nums">
              <FormattedNumber value={value} />
            </div>
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}

function TopProducts({data}: {data: CommerceInsights}) {
  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Top products" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="min-w-0 overflow-x-auto px-0!">
        {data.top_products.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head className="ps-4"><Trans message="Product" /></Table.Head>
                <Table.Head><Trans message="Orders" /></Table.Head>
                <Table.Head className="pe-4 text-end"><Trans message="Net sales" /></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.top_products.map(product => (
                <Table.Row key={product.id}>
                  <Table.Cell className="max-w-64 ps-4 font-medium">
                    <div className="truncate">{product.title}</div>
                    {product.refunds_cents > 0 && (
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        <Trans
                          message=":amount refunded"
                          values={{
                            amount: <FormattedCurrency valueInCents={product.refunds_cents} currency={data.currency} />,
                          }}
                        />
                      </div>
                    )}
                  </Table.Cell>
                  <Table.Cell><FormattedNumber value={product.paid_orders} /></Table.Cell>
                  <Table.Cell className="pe-4 text-end font-semibold tabular-nums">
                    <FormattedCurrency valueInCents={product.net_sales_cents} currency={data.currency} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <CompactEmptyState message={<Trans message="No product sales in this period." />} />
        )}
      </Card.Content>
    </Card>
  );
}

function RecentOrders({data}: {data: CommerceInsights}) {
  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title><Trans message="Recent sales" /></Card.Title>
      </Card.Header>
      <Card.Content className="min-w-0 overflow-x-auto px-0!">
        {data.recent_orders.length ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head className="ps-4"><Trans message="Buyer" /></Table.Head>
                <Table.Head><Trans message="Product" /></Table.Head>
                <Table.Head><Trans message="Status" /></Table.Head>
                <Table.Head className="pe-4 text-end"><Trans message="Amount" /></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.recent_orders.map(order => {
                const fullyRefunded = order.refunds_cents >= order.gross_amount_cents;
                return (
                  <Table.Row key={order.id}>
                    <Table.Cell className="max-w-56 ps-4">
                      <div className="truncate font-medium">{order.buyer_name || order.buyer_email || 'Customer'}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        <FormattedDate date={order.paid_at} preset="short" /> · {order.creator_name}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="max-w-52"><div className="truncate">{order.product_title}</div></Table.Cell>
                    <Table.Cell>
                      <Badge variant={fullyRefunded ? 'destructive' : order.refunds_cents > 0 ? 'secondary' : 'positive'}>
                        {fullyRefunded ? <Trans message="Refunded" /> : order.refunds_cents > 0 ? <Trans message="Partially refunded" /> : <Trans message="Paid" />}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="pe-4 text-end font-semibold tabular-nums">
                      <FormattedCurrency valueInCents={order.gross_amount_cents - order.refunds_cents} currency={data.currency} />
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        ) : (
          <CompactEmptyState message={<Trans message="No verified sales in this period." />} />
        )}
      </Card.Content>
    </Card>
  );
}

function CompactEmptyState({message}: {message: ReactNode}) {
  return (
    <Empty className="min-h-44 border-0 p-6">
      <Empty.Header>
        <Empty.Media variant="icon"><ChartNoAxesCombinedIcon /></Empty.Media>
        <Empty.Title><Trans message="Nothing to report yet" /></Empty.Title>
        <Empty.Description>{message}</Empty.Description>
      </Empty.Header>
    </Empty>
  );
}

function InsightsLoadingState() {
  return (
    <div className="flex flex-col gap-5" aria-label="Loading Linket insights">
      <div className="flex flex-col gap-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-full max-w-xl" /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-32" />)}
      </div>
      <Skeleton className="h-20" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
    </div>
  );
}

function InsightsErrorState() {
  return (
    <Empty className="min-h-96">
      <Empty.Header>
        <Empty.Media variant="icon"><CircleAlertIcon /></Empty.Media>
        <Empty.Title><Trans message="Unable to load Linket insights" /></Empty.Title>
        <Empty.Description><Trans message="Refresh the page to try the report again." /></Empty.Description>
      </Empty.Header>
    </Empty>
  );
}
