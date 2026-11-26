import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Popover} from '@shadcn/popover/popover';
import {Separator} from '@shadcn/separator';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  CreditCardIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  ChartNoAxesCombinedIcon,
  CircleDollarSignIcon,
  EyeIcon,
  FileTextIcon,
  InfoIcon,
  LandmarkIcon,
  LockIcon,
  MailIcon,
  PackageCheckIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  SearchIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {useSearchParams} from 'react-router';
import {PaymentStatusLabel} from './payment-status-badge';

type PaginationData = {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type Summary = {
  verified_sales_count: number;
  verified_revenue_cents: number;
  net_sales_cents: number;
  paid_orders_count?: number;
  gross_profit_cents: number;
  gross_profit_margin_percent: number;
  average_order_cents: number;
  free_orders_count?: number;
  creator_earnings_cents?: number;
  platform_fee_cents?: number;
  pending_count: number;
  manual_review_count: number;
  rejected_count: number;
  status_counts: Record<string, number>;
  currency: string;
};

type Order = {
  uuid: string;
  status: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  transaction_reference?: string | null;
  payment_reference?: string | null;
  chapa_tx_ref?: string | null;
  gross_amount_cents: number;
  currency?: string;
  payment_gateway?: string;
  payment_method?: string;
  payment_provider?: string | null;
  account_ending?: string | null;
  verification_status?: string | null;
  verification_error_code?: string | null;
  delivery_status?: string;
  created_at?: string;
  paid_at?: string;
  product?: {
    id: number;
    title: string;
    status: string;
    cover_url?: string | null;
  } | null;
};

type OrderDetail = Order & {
  buyer_email?: string | null;
  buyer_country?: string | null;
  platform_fee_cents?: number;
  creator_earnings_cents?: number;
  delivery?: {
    status: string;
    entitlements_count: number;
    downloaded_count: number;
    download_limit: number;
    files: Array<{
      name?: string | null;
      download_count: number;
      download_limit: number;
      expires_at?: string | null;
      revoked_at?: string | null;
    }>;
  };
  manual_review?: {
    reason_code?: string | null;
    submitted_at?: string | null;
  } | null;
};

type OrderSort = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'buyer_asc' | 'buyer_desc';
const PAGE_SIZE_OPTIONS = [15, 25, 50] as const;

const emptyPagination: PaginationData = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: PAGE_SIZE_OPTIONS[0],
};

const orderStatusOptions = [
  {value: 'all', label: <Trans message="All statuses" />},
  {value: 'pending_payment', label: <Trans message="Pending" />},
  {value: 'verifying', label: <Trans message="Verifying" />},
  {value: 'paid', label: <Trans message="Paid" />},
  {value: 'fulfilled', label: <Trans message="Fulfilled" />},
  {value: 'expired', label: <Trans message="Expired" />},
];
export function Component() {
  const [searchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersPagination, setOrdersPagination] =
    useState<PaginationData>(emptyPagination);
  const [summary, setSummary] = useState<Summary>();
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string>();

  const [orderStatus, setOrderStatus] = useState(() =>
    orderStatusOptions.some(option => option.value === searchParams.get('status'))
      ? searchParams.get('status')!
      : 'all',
  );
  const [orderSearch, setOrderSearch] = useState(() => (searchParams.get('search') ?? '').slice(0, 100));
  const [orderFrom, setOrderFrom] = useState(() => searchParams.get('from') ?? '');
  const [orderTo, setOrderTo] = useState(() => searchParams.get('to') ?? '');
  const [orderPage, setOrderPage] = useState(() => {
    const value = Number(searchParams.get('page'));
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  });
  const [orderPerPage, setOrderPerPage] = useState(() =>
    pageSizeFrom(searchParams.get('per_page')),
  );
  const [orderSort, setOrderSort] = useState<OrderSort>(() => {
    const raw = searchParams.get('sort');
    return ['newest', 'oldest', 'amount_desc', 'amount_asc', 'buyer_asc', 'buyer_desc'].includes(raw ?? '')
      ? raw as OrderSort
      : 'newest';
  });
  const debouncedOrderSearch = useDebouncedValue(orderSearch, 300);

  const [detailUuid, setDetailUuid] = useState<string>();

  const ordersRequest = useRef(0);

  const loadOrders = useCallback(async () => {
    const sequence = ++ordersRequest.current;
    setOrdersLoading(true);
    setSummary(undefined);
    try {
      const response = await apiClient.get('/api/v1/storefront/direct-orders', {
        params: {
          gateway: 'chapa',
          status: orderStatus === 'all' ? undefined : orderStatus,
          search: debouncedOrderSearch || undefined,
          from: orderFrom || undefined,
          to: orderTo || undefined,
          page: orderPage,
          per_page: orderPerPage,
          sort: orderSort,
        },
      });
      if (sequence !== ordersRequest.current) return;
      setOrders(response.data.data?.data ?? []);
      setOrdersPagination(paginationFrom(response.data.data));
      setSummary(response.data.summary);
      setOrdersError(undefined);
    } catch (reason) {
      if (sequence === ordersRequest.current) {
        setOrdersError(getApiErrorMessage(reason));
      }
    } finally {
      if (sequence === ordersRequest.current) setOrdersLoading(false);
    }
  }, [
    orderStatus,
    debouncedOrderSearch,
    orderFrom,
    orderTo,
    orderPage,
    orderPerPage,
    orderSort,
  ]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshKey]);

  const refresh = () => setRefreshKey(key => key + 1);

  return (
    <DashboardLayout.MainSection className="min-h-0 overflow-hidden">
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Orders & Sales" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={ordersLoading}
          aria-busy={ordersLoading}
        >
          <RefreshCwIcon
            aria-hidden="true"
            className={
              ordersLoading
                ? 'animate-spin'
                : undefined
            }
          />
          <Trans message="Refresh" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="min-h-0 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5">
          <SummaryCards summary={summary} />

          <Card.Root size="sm" className="min-w-0 gap-4 rounded-card-sm">
            <Card.Header>
              <Card.Title>
                <Trans message="Orders" />
              </Card.Title>
              <Card.Description>
                <Trans message="Orders and payment status. Only paid orders count as sales." />
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex min-w-0 flex-col gap-4">
              <OrdersTable
                orders={orders}
                sort={orderSort}
                onSortChange={value => {
                  setOrderSort(value);
                  setOrderPage(1);
                }}
                loading={ordersLoading}
                error={ordersError}
                onView={setDetailUuid}
                onRetry={() => void loadOrders()}
                filters={
                  <OrderFilters
                    status={orderStatus}
                    search={orderSearch}
                    from={orderFrom}
                    to={orderTo}
                    statusOptions={orderStatusOptions}
                    onStatusChange={value => {
                      setOrderStatus(value);
                      setOrderPage(1);
                    }}
                    onSearchChange={value => {
                      setOrderSearch(value);
                      setOrderPage(1);
                    }}
                    onFromChange={value => {
                      setOrderFrom(value);
                      setOrderPage(1);
                    }}
                    onToChange={value => {
                      setOrderTo(value);
                      setOrderPage(1);
                    }}
                  />
                }
              />
            </Card.Content>
            {!ordersError && ordersPagination.total > 0 && (
              <Card.Footer className="min-w-0">
                <Pagination
                  page={ordersPagination.current_page}
                  lastPage={ordersPagination.last_page}
                  total={ordersPagination.total}
                  perPage={ordersPagination.per_page}
                  pageSizeName="orders-per-page"
                  onChange={setOrderPage}
                  onPerPageChange={value => {
                    setOrderPerPage(value);
                    setOrderPage(1);
                  }}
                />
              </Card.Footer>
            )}
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      <OrderDetailDialog
        uuid={detailUuid}
        onClose={() => setDetailUuid(undefined)}
      />
    </DashboardLayout.MainSection>
  );
}

function SummaryCards({summary}: {summary?: Summary}) {
  const metrics: Array<{
    key: string;
    icon: LucideIcon;
    label: ReactNode;
    value: ReactNode;
    tone: string;
  }> = [
    {
      key: 'net-sales',
      icon: LandmarkIcon,
      label: <Trans message="Net sales" />,
      value: summary ? (
        <FormattedCurrency valueInCents={summary.net_sales_cents} currency={summary.currency} />
      ) : '—',
      tone: 'bg-primary/10 text-primary',
    },
    {
      key: 'orders',
      icon: ReceiptTextIcon,
      label: <Trans message="Orders" />,
      value: summary?.paid_orders_count ?? '—',
      tone: 'bg-positive/10 text-positive',
    },
    {
      key: 'profit',
      icon: ChartNoAxesCombinedIcon,
      label: (
        <>
          <Trans message="Gross profit" />
          {summary ? ` · ${summary.gross_profit_margin_percent.toFixed(1)}%` : null}
        </>
      ),
      value: summary ? (
        <FormattedCurrency valueInCents={summary.gross_profit_cents} currency={summary.currency} />
      ) : '—',
      tone: 'bg-warning/10 text-warning',
    },
    {
      key: 'average',
      icon: CircleDollarSignIcon,
      label: <Trans message="Average order" />,
      value: summary ? (
        <FormattedCurrency valueInCents={summary.average_order_cents} currency={summary.currency} />
      ) : '—',
      tone: 'bg-muted text-muted-foreground',
    },
  ];

  return (
    <section aria-label="Sales summary" className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map(metric => {
        const Icon = metric.icon;
        return (
          <Card.Root key={metric.key} size="sm" className="min-h-32 min-w-0 gap-3">
            <Card.Header>
              <Card.Title className="truncate text-sm font-normal text-muted-foreground">
                {metric.label}
              </Card.Title>
              <Card.Action>
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-card-sm [&>svg]:size-4',
                    metric.tone,
                  )}
                >
                  <Icon aria-hidden="true" />
                </span>
              </Card.Action>
            </Card.Header>
            <Card.Content>
              <p className="truncate text-2xl font-bold tracking-tight tabular-nums">
                {metric.value}
              </p>
            </Card.Content>
          </Card.Root>
        );
      })}
    </section>
  );
}

function OrderFilters({
  status,
  search,
  from,
  to,
  statusOptions,
  onStatusChange,
  onSearchChange,
  onFromChange,
  onToChange,
}: {
  status: string;
  search: string;
  from: string;
  to: string;
  statusOptions: Array<{value: string; label: ReactNode}>;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const isFiltered = status !== 'all' || !!search || !!from || !!to;
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full min-w-0 sm:w-64">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          bindToHookForm={false}
          className="h-9 ps-9"
          aria-label="Search orders"
          placeholder="Search orders"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Select.Root
          value={status}
          onValueChange={value => onStatusChange(value ?? 'all')}
        >
          <Select.Trigger
            aria-label="Order status"
            className="h-9 min-w-0 flex-1 sm:w-40 sm:flex-none"
          >
            <Select.Value placeholder={<Trans message="All statuses" />}>
              {statusOptions.find(option => option.value === status)?.label ?? (
                <Trans message="All statuses" />
              )}
            </Select.Value>
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              {statusOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        <Popover.Root>
          <Popover.Trigger
            render={
              <Button
                variant="outline"
                color="default"
                className="shrink-0"
                aria-label="Filter by date"
              >
                <CalendarDaysIcon data-icon="inline-start" />
                <Trans message="Dates" />
                {(from || to) && (
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-primary"
                  />
                )}
              </Button>
            }
          />
          <Popover.Portal>
            <Popover.Content
              align="end"
              className="w-[min(20rem,calc(100vw-2rem))] rounded-card-sm"
            >
              <Popover.Header>
                <Popover.Title>
                  <Trans message="Date range" />
                </Popover.Title>
              </Popover.Header>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <Trans message="From" />
                  <Input
                    bindToHookForm={false}
                    aria-label="From date"
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={event => onFromChange(event.target.value)}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <Trans message="To" />
                  <Input
                    bindToHookForm={false}
                    aria-label="To date"
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={event => onToChange(event.target.value)}
                  />
                </label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-end"
                disabled={!from && !to}
                onClick={() => {
                  onFromChange('');
                  onToChange('');
                }}
              >
                <Trans message="Clear dates" />
              </Button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            color="default"
            className="shrink-0"
            onClick={() => {
              onStatusChange('all');
              onSearchChange('');
              onFromChange('');
              onToChange('');
            }}
          >
            <Trans message="Clear filters" />
          </Button>
        )}
      </div>
    </div>
  );
}

function OrdersTable({
  orders,
  loading,
  error,
  onView,
  onRetry,
  emptyMessage,
  sort,
  onSortChange,
  filters,
}: {
  orders: Order[];
  loading: boolean;
  error?: string;
  onView: (uuid: string) => void;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
  filters: ReactNode;
  sort: OrderSort;
  onSortChange: (value: OrderSort) => void;
}) {
  const {trans} = useTrans();

  return (
    <div className="grid min-w-0 gap-3">
      {filters}

      {loading ? (
        <TableLoading />
      ) : error ? (
        <div
          className="flex flex-col items-start gap-3 rounded-card-sm border border-border px-4 py-8"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCwIcon aria-hidden="true" />
              <Trans message="Try again" />
            </Button>
          )}
        </div>
      ) : !orders.length ? (
        <div className="rounded-card-sm border border-border">
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon">
                <ReceiptTextIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No orders found" />
              </Empty.Title>
              <Empty.Description>
                {emptyMessage ?? (
                  <Trans message="Orders will appear here after a buyer tries to purchase one of your products." />
                )}
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        </div>
      ) : (
        <div
          role="region"
          aria-label={trans({message: 'Scrollable orders table'})}
          tabIndex={0}
          className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-card-sm border border-border focus-visible:outline-2 focus-visible:outline-foreground"
        >
          <Table.Root
            aria-label={trans({message: 'Orders'})}
            className="w-full border-separate border-spacing-0 text-sm [&_th]:border-b [&_th]:border-border [&_td]:border-b [&_td]:border-border/60 [&_tbody_tr:last-child_td]:border-b-0"
          >
            <Table.Header>
              <Table.Row className="bg-muted/30 hover:bg-muted/30">
                <Table.Head className="h-10 min-w-48 px-3 text-xs font-medium text-muted-foreground">
                  <Trans message="Product" />
                </Table.Head>
                <OrderSortHead
                  label={<Trans message="Buyer" />}
                  sort={sort}
                  ascending="buyer_asc"
                  descending="buyer_desc"
                  onChange={onSortChange}
                />
                <OrderSortHead
                  label={<Trans message="Amount" />}
                  sort={sort}
                  ascending="amount_asc"
                  descending="amount_desc"
                  onChange={onSortChange}
                  align="end"
                />
                <OrderSortHead
                  label={<Trans message="Date" />}
                  sort={sort}
                  ascending="oldest"
                  descending="newest"
                  onChange={onSortChange}
                />
                <Table.Head className="h-10 px-3 text-xs font-medium text-muted-foreground">
                  <Trans message="Status" />
                </Table.Head>
                <Table.Head className="sticky end-0 z-10 h-10 w-12 bg-card px-2 text-end text-xs text-muted-foreground">
                  <span className="sr-only">
                    <Trans message="Actions" />
                  </span>
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders.map(order => (
                <Table.Row key={order.uuid} className="group hover:bg-muted/40">
                  <Table.Cell className="min-w-48 max-w-68 px-3 py-2.5 whitespace-normal">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <OrderMark order={order} />
                      <span className="min-w-0">
                        <span
                          className="block truncate text-sm font-medium text-foreground"
                          title={order.product?.title ?? undefined}
                        >
                          {order.product?.title ?? (
                            <Trans message="Deleted product" />
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground tabular-nums">
                          {'#' + order.uuid.slice(0, 8)}
                          {order.transaction_reference
                            ? ' · ' + order.transaction_reference
                            : ''}
                        </span>
                      </span>
                    </span>
                  </Table.Cell>
                  <Table.Cell className="min-w-36 max-w-52 px-3 py-2.5 whitespace-normal">
                    <span className="block truncate text-sm text-foreground">
                      {order.buyer_name || <Trans message="Guest buyer" />}
                    </span>
                    {order.buyer_email ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {order.buyer_email}
                      </span>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell className="min-w-28 px-3 py-2.5 text-end text-sm font-medium tabular-nums">
                    <FormattedCurrency
                      valueInCents={order.gross_amount_cents}
                      currency={order.currency ?? 'ETB'}
                    />
                  </Table.Cell>
                  <Table.Cell className="min-w-28 px-3 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                    <FormattedDate preset="short" date={order.created_at} />
                  </Table.Cell>
                  <Table.Cell className="px-3 py-2.5">
                    <OrderStatusBadge status={order.status} />
                  </Table.Cell>
                  <Table.Cell className="sticky end-0 z-10 w-12 bg-card px-2 py-1.5 text-end group-hover:bg-accent">
                    <ViewOrderButton
                      label={trans({message: 'View details'})}
                      onClick={() => onView(order.uuid)}
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
      )}
    </div>
  );
}

function OrderSortHead({
  label,
  sort,
  ascending,
  descending,
  onChange,
  align = 'start',
}: {
  label: ReactNode;
  sort: OrderSort;
  ascending: OrderSort;
  descending: OrderSort;
  onChange: (value: OrderSort) => void;
  align?: 'start' | 'end';
}) {
  const active = sort === ascending || sort === descending;
  const current =
    sort === ascending ? 'ascending' : sort === descending ? 'descending' : 'none';
  return (
    <Table.Head
      className={align === 'end' ? 'h-10 px-3 text-end' : 'h-10 px-3'}
      aria-sort={current}
    >
      <Button
        variant="ghost"
        size="sm"
        color="default"
        className="h-8 gap-1 px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() =>
          onChange(
            sort === descending
              ? ascending
              : sort === ascending
                ? descending
                : ascending === 'amount_asc'
                  ? descending
                  : ascending,
          )
        }
      >
        {label}
        {active ? (
          sort === ascending ? (
            <ArrowUpIcon className="size-3.5" />
          ) : (
            <ArrowDownIcon className="size-3.5" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3.5 opacity-50" />
        )}
      </Button>
    </Table.Head>
  );
}

function ViewOrderButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color="default"
              size="icon"
              aria-label={label}
              onClick={onClick}
            >
              <EyeIcon />
            </Button>
          }
        />
        <Tooltip.Content>
          <Trans message="View details" />
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function OrderDetailDialog({
  uuid,
  onClose,
}: {
  uuid?: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<OrderDetail>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [isBodyScrolled, setIsBodyScrolled] = useState(false);

  useEffect(() => {
    setIsBodyScrolled(false);
    if (!uuid) {
      setDetail(undefined);
      setError(undefined);
      return;
    }

    let active = true;
    setLoading(true);
    // Refresh in place, but never show another order's data.
    setDetail(current => (current?.uuid === uuid ? current : undefined));
    setError(undefined);

    apiClient
      .get('/api/v1/storefront/direct-orders/' + uuid)
      .then(response => {
        if (active) setDetail(response.data.data);
      })
      .catch(reason => {
        if (active) setError(getApiErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uuid, detailRefreshKey]);

  return (
    <Dialog.Root open={!!uuid} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="min-w-0 gap-0 sm:max-w-xl">
          <Dialog.Header
            className={cn(
              '-mx-6 min-w-0 border-b px-6 pb-4 transition-[border-color,box-shadow] duration-200',
              isBodyScrolled ? 'border-border shadow-sm' : 'border-transparent',
            )}
          >
            <Dialog.Title>
              <ReceiptTextIcon />
              <Trans message="Order details" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Recorded payment status and delivery information for this order." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body
            className="min-w-0 scroll-fade-y scroll-fade-8 py-4 [--scroll-fade-reveal:64px]"
            aria-busy={loading}
            onScroll={event => setIsBodyScrolled(event.currentTarget.scrollTop > 2)}
          >
            {loading && !detail && <OrderDetailSkeleton />}
            {loading && detail && (
              <p role="status" className="mb-3 text-xs text-muted-foreground">
                <Trans message="Refreshing order details..." />
              </p>
            )}
            {error && (
              <Alert.Root variant="destructive" fillStyle="subtleFill" className="mb-3">
                <AlertTriangleIcon aria-hidden="true" />
                <Alert.Description>{error}</Alert.Description>
              </Alert.Root>
            )}
            {detail && (
              <div className="flex min-w-0 flex-col gap-4">
                <OrderDetailContent order={detail} />
                <CreatorOrderDisputes orderUuid={detail.uuid ?? uuid!} />
              </div>
            )}
          </Dialog.Body>
          <Dialog.Footer variant="muted" className="sm:justify-between">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!uuid || loading}
              onClick={() => setDetailRefreshKey(current => current + 1)}
            >
              <RefreshCwIcon
                data-icon="inline-start"
                className={loading ? 'animate-spin' : undefined}
              />
              {error && !detail ? (
                <Trans message="Try again" />
              ) : (
                <Trans message="Refresh status" />
              )}
            </Button>
            <Dialog.CloseButton>
              <Trans message="Close" />
            </Dialog.CloseButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OrderDetailContent({order}: {order: OrderDetail}) {
  const {trans} = useTrans();
  const currency = order.currency ?? 'ETB';
  const [copiedRef, setCopiedRef] = useState(false);

  const delivery = order.delivery;
  const entitlementsCount = delivery?.entitlements_count ?? 0;
  const downloadLimit = delivery?.download_limit ?? 0;
  const downloadedCount = delivery?.downloaded_count ?? 0;
  const isPaidOrFulfilled = ['paid', 'fulfilled'].includes(order.status);

  const copyReference = () => {
    if (!order.transaction_reference || !navigator.clipboard) return;
    void navigator.clipboard.writeText(order.transaction_reference).then(() => {
      setCopiedRef(true);
      window.setTimeout(() => setCopiedRef(false), 1800);
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      {/* Order summary hero & purchaser details */}
      <div className="flex min-w-0 flex-col gap-3 rounded-card-sm border border-border bg-muted/35 p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <OrderMark order={order} className="size-11 ring-1 ring-border" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate text-base leading-5 font-semibold tracking-tight text-foreground">
                {order.product?.title ?? <Trans message="Deleted product" />}
              </p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <span className="font-mono text-foreground/80">
                  {'#' + order.uuid.slice(0, 8)}
                </span>
                {order.created_at && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      <Trans
                        message="Created :date"
                        values={{
                          date: (
                            <FormattedDate preset="short" date={order.created_at} />
                          ),
                        }}
                      />
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2.5 border-t border-border/60 pt-2.5 sm:flex-col sm:items-end sm:gap-1 sm:border-0 sm:pt-0">
            <OrderStatusBadge status={order.status} />
            <span className="text-lg leading-6 font-bold tracking-tight text-foreground tabular-nums">
              <FormattedCurrency
                valueInCents={order.gross_amount_cents}
                currency={currency}
              />
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border/70 pt-3">
          <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
            <UserIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">
              {order.buyer_name || <Trans message="Guest buyer" />}
            </span>
          </p>
          {order.buyer_email ? (
            <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <MailIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{order.buyer_email}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Payment information */}
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <CreditCardIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Trans message="Payment information" />
        </h3>
        <div className="flex flex-col gap-1.5">
          <DetailRow
            label={<Trans message="Transaction reference" />}
            value={
              order.transaction_reference ? (
                <span className="inline-flex max-w-full items-center gap-1">
                  <span className="break-all font-mono text-xs text-foreground">
                    {order.transaction_reference}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={trans({message: 'Copy transaction reference'})}
                    onClick={copyReference}
                  >
                    {copiedRef ? (
                      <CheckIcon className="text-positive" />
                    ) : (
                      <CopyIcon />
                    )}
                  </Button>
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
          <DetailRow
            label={<Trans message="Payment gateway" />}
            value={paymentMethodLabel(order)}
          />
          {order.paid_at && (
            <DetailRow
              label={<Trans message="Paid at" />}
              value={<FormattedDate preset="timestamp" date={order.paid_at} />}
            />
          )}
          {(order.platform_fee_cents ?? 0) > 0 && (
            <DetailRow
              label={<Trans message="Platform fee" />}
              value={
                <FormattedCurrency
                  valueInCents={order.platform_fee_cents ?? 0}
                  currency={currency}
                />
              }
            />
          )}
          <DetailRow
            label={<Trans message="Your earnings" />}
            value={
              <FormattedCurrency
                valueInCents={order.creator_earnings_cents ?? 0}
                currency={currency}
              />
            }
            emphasis
          />
        </div>
      </section>

      <Separator />

      {/* Delivery */}
      <section className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <PackageCheckIcon
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Trans message="Delivery" />
          </h3>
          <Badge variant={deliveryBadgeVariant(delivery?.status)}>
            {deliveryStatusLabel(delivery?.status, order.status)}
          </Badge>
        </div>

        {delivery && entitlementsCount > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            <Trans
              message=":downloaded of :limit downloads used across :count files"
              values={{
                downloaded: downloadedCount,
                limit: downloadLimit,
                count: entitlementsCount,
              }}
            />
          </p>
        )}

        {!isPaidOrFulfilled ? (
          <div className="flex items-center gap-2 rounded-card-sm bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <LockIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              <Trans message="Buyer downloads remain locked until payment is confirmed." />
            </span>
          </div>
        ) : entitlementsCount === 0 ? (
          <div className="flex items-center gap-2 rounded-card-sm bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              <Trans message="No download access has been issued for this order." />
            </span>
          </div>
        ) : null}

        {!!delivery?.files?.length && (
          <ul className="flex flex-col gap-1.5">
            {delivery.files.map((file, index) => (
              <li
                key={[file.name, index].join('-')}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-card-sm bg-muted/50 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileTextIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words font-medium text-foreground">
                    {file.name ?? <Trans message="File" />}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {file.revoked_at ? (
                    <Badge variant="destructive">
                      <Trans message="Revoked" />
                    </Badge>
                  ) : null}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    <Trans
                      message=":count of :limit downloads"
                      values={{
                        count: file.download_count,
                        limit: file.download_limit,
                      }}
                    />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {order.manual_review && (
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <AlertTriangleIcon aria-hidden="true" />
          <Alert.Title>
            <Trans message="Payment needs support review" />
          </Alert.Title>
          <Alert.Description>
            <p>
              <Trans message="Linket support must resolve this payment. You cannot mark this order paid or release buyer downloads." />
            </p>
            <a href="/help" className="mt-2 inline-flex min-h-8 items-center">
              <Trans message="Open Help Center" />
            </a>
            {order.manual_review.reason_code && (
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer py-1">
                  <Trans message="Technical reason" />
                </summary>
                <code className="block break-all pt-1">
                  {order.manual_review.reason_code}
                </code>
              </details>
            )}
          </Alert.Description>
        </Alert.Root>
      )}
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex items-center justify-between gap-3 rounded-card-sm bg-muted/50 p-3.5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-card-sm" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

function CreatorOrderDisputes({orderUuid}: {orderUuid: string}) {
  const [disputes, setDisputes] = useState<
    Array<{
      id: string;
      reason_label?: string;
      reason: string;
      status: string;
      lifecycle_status?: string;
      payment_evidence?: {status?: string | null} | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get(`/api/v1/storefront/direct-orders/${orderUuid}/disputes`)
      .then(response => {
        setDisputes(response.data.disputes ?? []);
      })
      .catch(() => {
        setDisputes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderUuid]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (
    disputeId: string,
    status: 'investigating' | 'resolved',
  ) => {
    setBusyId(disputeId);
    setError(undefined);
    try {
      await apiClient.patch(
        `/api/v1/storefront/direct-orders/${orderUuid}/disputes/${disputeId}`,
        {
          status,
          note:
            status === 'investigating'
              ? 'Creator started investigating this dispute.'
              : 'Creator marked this dispute resolved.',
        },
      );
      load();
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) !== 'An error occurred.'
          ? getApiErrorMessage(reason)
          : 'Unable to update this dispute.',
      );
    } finally {
      setBusyId(undefined);
    }
  };

  if (loading || !disputes.length) {
    return null;
  }

  return (
    <DetailSection title={<Trans message="Buyer support requests" />}>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {disputes.map(dispute => {
          const lifecycle = dispute.lifecycle_status || 'open';
          return (
            <li
              key={dispute.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-button bg-muted px-3 py-2 text-sm"
            >
              <span>
                {dispute.reason_label || dispute.reason}
                {dispute.payment_evidence?.status ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({dispute.payment_evidence.status})
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{dispute.status}</Badge>
                {lifecycle === 'open' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === dispute.id}
                    onClick={() => void updateStatus(dispute.id, 'investigating')}
                  >
                    <Trans message="Investigate" />
                  </Button>
                ) : null}
                {lifecycle === 'investigating' ? (
                  <Button
                    size="sm"
                    disabled={busyId === dispute.id}
                    onClick={() => void updateStatus(dispute.id, 'resolved')}
                  >
                    <Trans message="Mark resolved" />
                  </Button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </DetailSection>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-3 py-2.5 text-sm',
        'grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-3 py-1 text-sm',
        emphasis && 'font-semibold text-foreground',
      )}
    >
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span
        className={
          emphasis
            ? 'min-w-0 break-words text-end font-semibold tabular-nums'
            : 'min-w-0 break-words text-end'
        }
      >
        {value}
      </span>
    </div>
  );
}

function OrderMark({
  order,
  className,
}: {
  order: Order;
  className?: string;
}) {
  const title = order.product?.title;
  const coverUrl = order.product?.cover_url;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [coverUrl]);

  return (
    <span
      className={cn(
        'flex size-9 shrink-0 overflow-hidden rounded-card-sm bg-muted ring-1 ring-foreground/10',
        className,
      )}
    >
      {coverUrl && !imageFailed ? (
        <img
          src={coverUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex size-full items-center justify-center text-xs font-medium text-muted-foreground">
          {Avatar.initials(title) || 'P'}
        </span>
      )}
    </span>
  );
}

function OrderStatusBadge({status}: {status: string}) {
  return (
    <Badge
      variant={statusBadgeVariant(status)}
      className={`h-[22px] gap-1.5 rounded-full px-2 text-[11.5px] font-medium ${status === 'manual_review' ? 'bg-warning/10 text-warning' : ''}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      <PaymentStatusLabel status={status} />
    </Badge>
  );
}

function Pagination({
  page,
  lastPage,
  total,
  perPage,
  pageSizeName,
  onChange,
  onPerPageChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  pageSizeName: string;
  onChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  const items = paginationItems(page, lastPage);

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums" aria-live="polite">
          <Trans message=":from–:to of :total" values={{from: total ? (page - 1) * perPage + 1 : 0, to: Math.min(page * perPage, total), total}} />
        </span>
        <div className="hidden items-center gap-2 sm:flex">
        <span><Trans message="Rows" /></span>
        <Select.Root
          name={pageSizeName}
          value={String(perPage)}
          onValueChange={value => {
            const next = pageSizeFrom(value);
            if (next !== perPage) onPerPageChange(next);
          }}
        >
          <Select.Trigger
            aria-label="Rows per page"
            className="h-8 w-[4.75rem]"
          >
            <Select.Value>{perPage}</Select.Value>
          </Select.Trigger>
          <Select.Content align="start">
            <Select.Group>
              {PAGE_SIZE_OPTIONS.map(option => (
                <Select.Item key={option} value={String(option)}>
                  {option}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        </div>
      </div>

      <nav
        className="ms-auto flex min-w-0 items-center gap-1"
        aria-label="Pagination"
      >
        <Button
          variant="ghost"
          color="default"
          size="sm"
          className="px-2"
          aria-label="Previous"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeftIcon aria-hidden="true" />
          <span className="max-sm:sr-only"><Trans message="Previous" /></span>
        </Button>

        <div className="hidden items-center gap-1 sm:flex">
          {items.map(item =>
            typeof item === 'number' ? (
              <Button
                key={item}
                variant={item === page ? 'default' : 'ghost'}
                color={item === page ? 'primary' : 'default'}
                size="sm"
                className="min-w-8 px-2 font-medium tabular-nums"
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Go to page ${item}`}
                onClick={() => onChange(item)}
              >
                {item}
              </Button>
            ) : (
              <span
                key={item}
                className="flex size-9 items-center justify-center text-muted-foreground"
                aria-hidden="true"
              >
                …
              </span>
            ),
          )}
        </div>

        <span className="text-sm text-muted-foreground sm:hidden" aria-live="polite">
          <Trans
            message="Page :page of :last"
            values={{page, last: lastPage}}
          />
        </span>

        <Button
          variant="ghost"
          color="default"
          size="sm"
          className="px-2"
          aria-label="Next"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          <span className="max-sm:sr-only"><Trans message="Next" /></span>
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}

function TableLoading() {
  return (
    <div
      className="divide-y divide-border/60 rounded-card-sm border border-border"
      aria-busy="true"
    >
      {[0, 1, 2, 3].map(row => (
        <div
          key={row}
          className="flex items-center justify-between gap-4 px-3 py-3"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Skeleton className="size-9 shrink-0 rounded-card-sm" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function pageSizeFrom(value: string | null | undefined): number {
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.includes(
    parsed as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? parsed
    : PAGE_SIZE_OPTIONS[0];
}

function paginationItems(
  page: number,
  lastPage: number,
): Array<number | 'start-ellipsis' | 'end-ellipsis'> {
  if (lastPage <= 5) {
    return Array.from({length: Math.max(lastPage, 1)}, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 'end-ellipsis', lastPage];
  }

  if (page >= lastPage - 2) {
    return [
      1,
      'start-ellipsis',
      lastPage - 2,
      lastPage - 1,
      lastPage,
    ];
  }

  return [
    1,
    'start-ellipsis',
    page - 1,
    page,
    page + 1,
    'end-ellipsis',
    lastPage,
  ];
}

function paginationFrom(value: Partial<PaginationData> | undefined): PaginationData {
  return {
    current_page: Number(value?.current_page ?? 1),
    last_page: Number(value?.last_page ?? 1),
    total: Number(value?.total ?? 0),
    per_page: pageSizeFrom(String(value?.per_page ?? PAGE_SIZE_OPTIONS[0])),
  };
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function paymentMethodLabel(order: Order): string {
  if (order.payment_gateway === 'chapa') return 'Chapa';
  const method = order.payment_method || order.payment_gateway;
  switch (method) {
    case 'cbe':
      return 'CBE';
    case 'boa':
      return 'Bank of Abyssinia';
    case 'cbebirr':
      return 'CBE Birr';
    case 'telebirr':
      return 'Telebirr';
    case 'chapa':
      return 'Chapa';
    default:
      return method ? method.toUpperCase() : '—';
  }
}

function statusBadgeVariant(
  status: string,
): 'positive' | 'destructive' | 'outline' | 'secondary' {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'fulfilled':
    case 'success':
    case 'manual_approved':
      return 'positive';
    case 'failed_verification':
    case 'mismatch':
    case 'failed':
    case 'expired':
      return 'destructive';
    case 'manual_review':
      return 'outline';
    default:
      return 'secondary';
  }
}

function deliveryStatusLabel(status: string | undefined, orderStatus?: string): ReactNode {
  switch (orderStatus) {
    case 'manual_review':
      return <Trans message="On hold — payment review" />;
    case 'pending_payment':
      return <Trans message="Awaiting payment" />;
    case 'verifying':
      return <Trans message="Verifying payment" />;
    case 'failed_verification':
    case 'expired':
      return <Trans message="Payment not verified" />;
  }
  switch (status) {
    case 'downloaded':
      return <Trans message="Downloaded" />;
    case 'access_granted':
      return <Trans message="Access granted" />;
    case 'paid':
      return <Trans message="Paid — delivery unconfirmed" />;
    default:
      return <Trans message="Unknown" />;
  }
}

function deliveryBadgeVariant(
  status: string | undefined,
): 'positive' | 'destructive' | 'secondary' {
  switch (status) {
    case 'downloaded':
    case 'access_granted':
      return 'positive';
    default:
      return 'secondary';
  }
}
