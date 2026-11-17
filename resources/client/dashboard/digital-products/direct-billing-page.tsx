import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Item} from '@shadcn/item/item';
import {Popover} from '@shadcn/popover/popover';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  EyeIcon,
  PackageCheckIcon,
  CalendarDaysIcon,
  SearchIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
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

type Pagination = {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type Summary = {
  verified_sales_count: number;
  verified_revenue_cents: number;
  paid_orders_count?: number;
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
  product?: {id: number; title: string; status: string} | null;
};

type VerificationSummary = {
  status: string;
  provider?: string | null;
  amount_cents: number;
  currency: string;
  attempts: number;
  verified_at?: string | null;
  created_at?: string | null;
  error_code?: string | null;
  history?: Array<{
    reference?: string | null;
    status: string;
    provider?: string | null;
    amount_cents: number;
    currency?: string;
    attempt: number;
    verified_at?: string | null;
    created_at?: string | null;
    error_code?: string | null;
  }>;
};

type OrderDetail = Order & {
  buyer_email?: string | null;
  buyer_country?: string | null;
  platform_fee_cents?: number;
  creator_earnings_cents?: number;
  verification?: VerificationSummary | null;
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

const PAGE_SIZE_OPTIONS = [15, 25, 50] as const;

const emptyPagination: Pagination = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: PAGE_SIZE_OPTIONS[0],
};

const orderStatusOptions = [
  {value: 'all', label: <Trans message="All statuses" />},
  {value: 'pending_payment', label: <Trans message="Payment pending" />},
  {value: 'verifying', label: <Trans message="Payment processing" />},
  {value: 'paid', label: <Trans message="Payment verified" />},
  {value: 'fulfilled', label: <Trans message="Fulfilled" />},
  {value: 'expired', label: <Trans message="Expired" />},
];
const legacyOrderStatusOptions = [
  ...orderStatusOptions,
  {value: 'manual_review', label: <Trans message="Historical manual review" />},
  {value: 'failed_verification', label: <Trans message="Historical verification rejected" />},
];

export function Component() {
  const [searchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersPagination, setOrdersPagination] =
    useState<Pagination>(emptyPagination);
  const [summary, setSummary] = useState<Summary>();
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string>();

  const [gateway, setGateway] = useState<'chapa' | 'verify_et' | 'all'>(() => {
    const value = searchParams.get('gateway');
    if (value === 'all' || value === 'verify_et') return value;
    // Existing links to historical review statuses still open their records.
    if (!value && ['manual_review', 'failed_verification'].includes(searchParams.get('status') ?? '')) {
      return 'all';
    }
    return 'chapa';
  });
  const [orderStatus, setOrderStatus] = useState(() => legacyOrderStatusOptions.some(option => option.value === searchParams.get('status')) ? searchParams.get('status')! : 'all');
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
          gateway,
          status: orderStatus === 'all' ? undefined : orderStatus,
          search: debouncedOrderSearch || undefined,
          from: orderFrom || undefined,
          to: orderTo || undefined,
          page: orderPage,
          per_page: orderPerPage,
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
    gateway,
    orderStatus,
    debouncedOrderSearch,
    orderFrom,
    orderTo,
    orderPage,
    orderPerPage,
  ]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshKey]);

  const refresh = () => setRefreshKey(key => key + 1);

  return (
    <DashboardLayout.MainSection>
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
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 px-3 py-4 sm:px-5">
          <SummaryCards summary={summary} gateway={gateway} />

          <div className="flex flex-col gap-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-base font-medium">
                    <Trans message="Orders" />
                    {ordersPagination.total > 0 ? (
                      <span className="ms-1 text-muted-foreground tabular-nums">
                        ({ordersPagination.total})
                      </span>
                    ) : null}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {gateway === 'chapa' ? (
                      <Trans message="Chapa orders and payment status. Only paid orders count as sales." />
                    ) : gateway === 'verify_et' ? (
                      <Trans message="Historical Verify.et orders are kept for reconciliation and support review." />
                    ) : (
                      <Trans message="All Chapa and historical orders. Totals include both payment sources." />
                    )}
                  </p>
                </div>
                <OrderFilters
                    gateway={gateway}
                    status={orderStatus}
                    search={orderSearch}
                    from={orderFrom}
                    to={orderTo}
                    statusOptions={gateway === 'chapa' ? orderStatusOptions : legacyOrderStatusOptions}
                    onGatewayChange={value => {
                      setGateway(value);
                      if (value === 'chapa' && ['manual_review', 'failed_verification'].includes(orderStatus)) {
                        setOrderStatus('all');
                      }
                      setOrderPage(1);
                    }}
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
              </div>
              <Card.Root size="sm" className="rounded-card-sm">
                <Card.Content className="px-0">
                  <OrdersTable
                    orders={orders}
                    loading={ordersLoading}
                    error={ordersError}
                    onView={setDetailUuid}
                    onRetry={() => void loadOrders()}
                  />
                </Card.Content>
                {ordersPagination.total > 0 && (
                  <Card.Footer className="border-t pt-4">
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
        </div>
      </DashboardLayout.SectionContent>

      <OrderDetailDialog
        uuid={detailUuid}
        onClose={() => setDetailUuid(undefined)}
      />
    </DashboardLayout.MainSection>
  );
}

function SummaryCards({
  summary,
  gateway,
}: {
  summary?: Summary;
  gateway: 'chapa' | 'verify_et' | 'all';
}) {
  return (
    <section aria-label="Sales summary" className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {gateway === 'chapa' ? (
          <Trans message="Chapa payments only · lifetime" />
        ) : gateway === 'verify_et' ? (
          <Trans message="Historical Verify.et orders · lifetime" />
        ) : (
          <Trans message="All payment history · lifetime" />
        )}
      </p>
      <Card.Root size="sm" className="gap-0 rounded-card-sm py-0">
        <Card.Content className="grid grid-cols-2 p-0 sm:grid-cols-4">
          <SummaryMetric
            className="border-e border-b sm:border-b-0"
            label={<Trans message="Gross sales" />}
            value={summary ? (
              <FormattedCurrency valueInCents={summary.verified_revenue_cents} currency={summary.currency} />
            ) : '—'}
            detail={<Trans message="Paid revenue, before fees" />}
          />
          <SummaryMetric
            className="border-b sm:border-e sm:border-b-0"
            label={<Trans message="Creator earnings" />}
            value={summary?.creator_earnings_cents !== undefined ? (
              <FormattedCurrency valueInCents={summary.creator_earnings_cents} currency={summary.currency} />
            ) : '—'}
            detail={<Trans message="After fees · not withdrawable balance" />}
          />
          <SummaryMetric
            className="border-e"
            label={<Trans message="Paid orders" />}
            value={summary?.paid_orders_count ?? '—'}
            detail={<Trans message="Excludes free orders" />}
          />
          <SummaryMetric
            label={<Trans message="Pending payments" />}
            value={summary?.pending_count ?? '—'}
            detail={<Trans message="Awaiting payment confirmation" />}
          />
        </Card.Content>
      </Card.Root>
    </section>
  );
}

function SummaryMetric({
  className,
  label,
  value,
  detail,
}: {
  className?: string;
  label: ReactNode;
  value: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className={`min-w-0 p-4 ${className ?? ''}`}>
      <p className="text-sm text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function OrderFilters({
  gateway,
  status,
  search,
  from,
  to,
  statusOptions,
  onGatewayChange,
  onStatusChange,
  onSearchChange,
  onFromChange,
  onToChange,
}: {
  gateway: 'chapa' | 'verify_et' | 'all';
  status: string;
  search: string;
  from: string;
  to: string;
  statusOptions: Array<{value: string; label: ReactNode}>;
  onGatewayChange: (value: 'chapa' | 'verify_et' | 'all') => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const isFiltered = gateway !== 'chapa' || status !== 'all' || !!search || !!from || !!to;
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1">
        <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          bindToHookForm={false}
          className="ps-9"
          aria-label="Search orders"
          placeholder="Product, buyer or reference"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:items-center">
        <Select.Root name="orders-gateway" value={gateway}
          onValueChange={value => onGatewayChange(value === 'all' || value === 'verify_et' ? value : 'chapa')}>
          <Select.Trigger aria-label="Payment source" className="col-span-2 w-full md:w-52">
            <Select.Value>
              {gateway === 'chapa' ? <Trans message="Chapa payments" /> :
                gateway === 'verify_et' ? <Trans message="Legacy Verify.et" /> :
                <Trans message="All payment history" />}
            </Select.Value>
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Item value="chapa"><Trans message="Chapa payments" /></Select.Item>
              <Select.Item value="all"><Trans message="All payment history" /></Select.Item>
              <Select.Item value="verify_et"><Trans message="Legacy Verify.et" /></Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
        <Select.Root value={status} onValueChange={value => onStatusChange(value ?? 'all')}>
          <Select.Trigger aria-label="Order status" className="w-full md:w-52">
            <Select.Value placeholder={<Trans message="All statuses" />}>
              {statusOptions.find(option => option.value === status)?.label ?? <Trans message="All statuses" />}
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
          <Popover.Trigger render={
            <Button variant="outline" className="shrink-0" aria-label="Filter by date">
              <CalendarDaysIcon />
              <Trans message="Dates" />
              {(from || to) && <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />}
            </Button>
          } />
          <Popover.Portal>
            <Popover.Content align="end" className="w-[min(20rem,calc(100vw-2rem))] rounded-card-sm">
              <Popover.Header>
                <Popover.Title><Trans message="Date range" /></Popover.Title>
              </Popover.Header>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <Trans message="From" />
                  <Input bindToHookForm={false} aria-label="From date" type="date" value={from} max={to || undefined} onChange={event => onFromChange(event.target.value)} />
                </label>
                <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <Trans message="To" />
                  <Input bindToHookForm={false} aria-label="To date" type="date" value={to} min={from || undefined} onChange={event => onToChange(event.target.value)} />
                </label>
              </div>
              <Button variant="ghost" size="sm" className="self-end" disabled={!from && !to} onClick={() => {onFromChange(''); onToChange('');}}>
                <Trans message="Clear dates" />
              </Button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      {isFiltered && (
        <Button variant="ghost" size="sm" className="self-start md:self-auto" onClick={() => {
          onGatewayChange('chapa');
          onStatusChange('all');
          onSearchChange('');
          onFromChange('');
          onToChange('');
        }}>
          <Trans message="Clear filters" />
        </Button>
      )}
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
}: {
  orders: Order[];
  loading: boolean;
  error?: string;
  onView: (uuid: string) => void;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
}) {
  if (loading) return <TableLoading />;
  if (error) {
    return (
      <div
        className="flex flex-col items-start gap-3 px-6 py-8"
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
    );
  }
  if (!orders.length) {
    return (
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
    );
  }

  return (
    <>
      <ul className="divide-y lg:hidden" aria-label="Orders">
        {orders.map(order => (
          <li key={order.uuid}>
            <Item.Root
              size="sm"
              render={<button type="button" />}
              className="min-h-14 w-full min-w-0 rounded-none border-0 px-4 py-3 text-start hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => onView(order.uuid)}
              aria-label={`View details for ${
                order.product?.title ?? 'Deleted product'
              }`}
            >
            <Item.Media
              align="center"
              variant="icon"
              className="size-10 rounded-card-xs bg-muted text-muted-foreground"
            >
              <ReceiptTextIcon />
            </Item.Media>
            <Item.Content className="gap-1.5">
              <Item.Row className="items-start justify-between gap-3">
                <Item.Title className="min-w-0 flex-1 break-words">
                  {order.product?.title ?? <Trans message="Deleted product" />}
                </Item.Title>
                <span className="shrink-0 font-medium tabular-nums">
                  <FormattedCurrency
                    valueInCents={order.gross_amount_cents}
                    currency={order.currency ?? 'ETB'}
                  />
                </span>
              </Item.Row>
              <Item.Row className="justify-between text-xs text-muted-foreground">
                <span className="min-w-0 truncate">
                  {order.buyer_name || <Trans message="Guest buyer" />}
                </span>
                <span className="shrink-0">
                  <FormattedDate preset="short" date={order.created_at} />
                </span>
              </Item.Row>
              <Item.Row>
                <OrderStatusBadge status={order.status} />
              </Item.Row>
              </Item.Content>
            </Item.Root>
          </li>
        ))}
      </ul>

      <div className="hidden min-w-0 overflow-x-auto lg:block">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head className="ps-6">
                <Trans message="Product" />
              </Table.Head>
              <Table.Head>
                <Trans message="Buyer" />
              </Table.Head>
              <Table.Head className="text-end">
                <Trans message="Amount" />
              </Table.Head>
              <Table.Head>
                <Trans message="Date" />
              </Table.Head>
              <Table.Head className="hidden xl:table-cell">
                <Trans message="Payment method" />
              </Table.Head>
              <Table.Head>
                <Trans message="Status" />
              </Table.Head>
              <Table.Head className="pe-6">
                <span className="sr-only">
                  <Trans message="Actions" />
                </span>
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {orders.map(order => (
              <Table.Row key={order.uuid}>
                <Table.Cell className="max-w-52 ps-6">
                  <span
                    className="block truncate font-medium"
                    title={order.product?.title ?? undefined}
                  >
                    {order.product?.title ?? (
                      <Trans message="Deleted product" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {order.transaction_reference ?? order.uuid}
                  </span>
                </Table.Cell>
                <Table.Cell className="max-w-44">
                  <span className="block truncate">
                    {order.buyer_name || (
                      <span className="text-muted-foreground">
                        <Trans message="Guest buyer" />
                      </span>
                    )}
                  </span>
                </Table.Cell>
                <Table.Cell className="text-end font-medium tabular-nums">
                  <FormattedCurrency
                    valueInCents={order.gross_amount_cents}
                    currency={order.currency ?? 'ETB'}
                  />
                </Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  <FormattedDate preset="short" date={order.created_at} />
                </Table.Cell>
                <Table.Cell className="hidden xl:table-cell">
                  <PaymentMethod order={order} />
                </Table.Cell>
                <Table.Cell>
                  <OrderStatusBadge status={order.status} />
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap pe-6 text-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(order.uuid)}
                  >
                    <EyeIcon />
                    <Trans message="View details" />
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </>
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

  useEffect(() => {
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
        <Dialog.Content className="min-w-0 sm:max-w-xl">
          <Dialog.Header className="min-w-0">
            <Dialog.Title>
              <ReceiptTextIcon />
              <Trans message="Order details" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Recorded payment status and delivery information for this order." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="min-w-0" aria-busy={loading}>
            {loading && !detail && <TableLoading />}
            {loading && detail && (
              <p role="status" className="mb-3 text-xs text-muted-foreground">
                <Trans message="Refreshing order details..." />
              </p>
            )}
            {error && (
              <p className="mb-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {detail && (
              <div className="flex min-w-0 flex-col gap-5">
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
              <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
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
  const currency = order.currency ?? 'ETB';
  const accountEnding = order.account_ending;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Item.Root
        variant="muted"
        size="sm"
        className="min-w-0 rounded-card-sm border-0"
      >
        <Item.Media
          align="center"
          variant="icon"
          className="size-10 rounded-card-xs bg-background text-muted-foreground ring-1 ring-foreground/10"
        >
          <ReceiptTextIcon />
        </Item.Media>
        <Item.Content className="min-w-0">
          <Item.Title className="line-clamp-2 whitespace-normal">
            {order.product?.title ?? <Trans message="Deleted product" />}
          </Item.Title>
          <Item.Description className="line-clamp-none break-words">
            {order.buyer_name || <Trans message="Guest buyer" />}
            {order.buyer_email ? ` · ${order.buyer_email}` : null}
          </Item.Description>
          <Item.Description>
            <Trans
              message="Created :date"
              values={{
                date: <FormattedDate preset="short" date={order.created_at} />,
              }}
            />
          </Item.Description>
        </Item.Content>
        <Item.Actions className="basis-full justify-between border-t pt-3 md:ms-6 md:basis-auto md:border-0 md:pt-0">
          <OrderStatusBadge status={order.status} />
          <span className="font-semibold tabular-nums">
            <FormattedCurrency
              valueInCents={order.gross_amount_cents}
              currency={currency}
            />
          </span>
        </Item.Actions>
      </Item.Root>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <DetailSection title={<Trans message="Payment information" />}>
          <DetailRow
            label={<Trans message="Transaction reference" />}
            value={
              <span className="break-all font-mono text-xs">
                {order.transaction_reference ?? '—'}
              </span>
            }
          />
          <DetailRow
            label={<Trans message="Payment gateway" />}
            value={paymentMethodLabel(order)}
          />
          {order.payment_gateway === 'verify_et' && (
            <DetailRow
              label={<Trans message="Historical receiving account" />}
              value={accountEnding ? <span className="font-mono">•••• {accountEnding}</span> : '—'}
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
        </DetailSection>

        {order.payment_gateway === 'chapa' ? (
          <DetailSection title={<Trans message="Chapa payment status" />}>
            <DetailRow label={<Trans message="Status" />} value={<OrderStatusBadge status={order.status} />} />
            {order.paid_at && (
              <DetailRow
                label={<Trans message="Paid at" />}
                value={<FormattedDate preset="timestamp" date={order.paid_at} />}
              />
            )}
            <p className="text-xs text-muted-foreground">
              <Trans message="Payment status reflects Linket's recorded Chapa confirmation. Refunds and payouts are tracked separately." />
            </p>
          </DetailSection>
        ) : (
        <DetailSection title={<Trans message="Historical verification evidence" />}>
          {order.verification ? (
            <>
              <DetailRow
                label={<Trans message="Status" />}
                value={
                  <TransactionStatusBadge status={order.verification.status} />
                }
              />
              <DetailRow
                label={<Trans message="Provider" />}
                value={
                  order.verification.provider ? (
                    <span className="uppercase">
                      {order.verification.provider}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <DetailRow
                label={<Trans message="Attempts" />}
                value={order.verification.attempts}
              />
              <DetailRow
                label={
                  order.verification.verified_at &&
                  ['success', 'manual_approved'].includes(order.verification.status) ? (
                    <Trans message="Verified at" />
                  ) : (
                    <Trans message="Submitted at" />
                  )
                }
                value={
                  <FormattedDate
                    preset="timestamp"
                    date={
                      order.verification.verified_at &&
                      ['success', 'manual_approved'].includes(order.verification.status)
                        ? order.verification.verified_at
                        : order.verification.created_at
                    }
                  />
                }
              />
              {order.verification.error_code && (
                <DetailRow
                  label={<Trans message="Reason" />}
                  value={verificationReasonLabel(order.verification.error_code)}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans message="No provider verification has been recorded for this order." />
            </p>
          )}
        </DetailSection>
        )}
      </div>

      {order.payment_gateway === 'verify_et' && !!order.verification?.history?.length && (
        <DetailSection title={<Trans message="Verification history" />}>
          <ul className="flex min-w-0 flex-col gap-2 sm:hidden" aria-label="Verification attempts">
            {order.verification.history.map((entry, index) => (
              <li key={[entry.reference, entry.attempt, index].join('-')} className="min-w-0 rounded-card-sm border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    <Trans message="Attempt :number" values={{number: entry.attempt}} />
                  </span>
                  <TransactionStatusBadge status={entry.status} />
                </div>
                <p className="mt-2 break-all font-mono text-xs">{entry.reference ?? '—'}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <FormattedDate preset="short" date={entry.verified_at ?? entry.created_at} />
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden min-w-0 overflow-x-auto sm:block">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head><Trans message="Reference" /></Table.Head>
                  <Table.Head><Trans message="Status" /></Table.Head>
                  <Table.Head><Trans message="Attempt" /></Table.Head>
                  <Table.Head><Trans message="Date" /></Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {order.verification.history.map((entry, index) => (
                  <Table.Row key={[entry.reference, entry.attempt, index].join('-')}>
                    <Table.Cell className="max-w-40 break-all font-mono text-xs">{entry.reference ?? '—'}</Table.Cell>
                    <Table.Cell><TransactionStatusBadge status={entry.status} /></Table.Cell>
                    <Table.Cell>{entry.attempt}</Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      <FormattedDate preset="short" date={entry.verified_at ?? entry.created_at} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </DetailSection>
      )}

      <DetailSection title={<Trans message="Delivery" />}>
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
          <Badge variant={deliveryBadgeVariant(order.delivery?.status)}>
            {deliveryStatusLabel(order.delivery?.status, order.status)}
          </Badge>
          {order.delivery && order.delivery.entitlements_count > 0 && (
            <span className="text-muted-foreground">
              <Trans message=":downloaded of :limit downloads used across :count files" values={{
                downloaded: order.delivery.downloaded_count,
                limit: order.delivery.download_limit,
                count: order.delivery.entitlements_count,
              }} />
            </span>
          )}
        </div>
        {!['paid', 'fulfilled'].includes(order.status) ? (
          <p className="text-sm text-muted-foreground">
            <Trans message="Buyer downloads remain locked until the payment is verified." />
          </p>
        ) : (order.delivery?.entitlements_count ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            <Trans message="No download access has been issued for this order." />
          </p>
        ) : null}
        {!!order.delivery?.files?.length && (
          <ul className="mt-3 flex flex-col gap-2">
            {order.delivery.files.map((file, index) => (
              <li key={[file.name, index].join('-')} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-card-sm bg-muted px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <PackageCheckIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words">{file.name ?? <Trans message="File" />}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  <Trans message=":count of :limit downloads" values={{count: file.download_count, limit: file.download_limit}} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {order.manual_review && (
        <div role="note" className="min-w-0 rounded-card-sm border border-warning/20 bg-warning/10 p-3 text-sm">
          <p className="font-medium text-warning"><Trans message="Payment needs support review" /></p>
          <p className="mt-1 text-muted-foreground">
            <Trans message="Linket support must resolve this payment. You cannot mark this order paid or release buyer downloads." />
          </p>
          {order.manual_review.reason_code === 'recipient_evidence_missing' && (
            <p className="mt-2 text-muted-foreground">
              <Trans message="Verify.et did not provide enough evidence to confirm the intended receiving account. Do not ask the buyer to pay again until support reviews the payment." />
            </p>
          )}
          <a href="/help" className="mt-2 inline-flex min-h-9 items-center text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Trans message="Open Help Center" />
          </a>
          {order.manual_review.reason_code && (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer py-1"><Trans message="Technical reason" /></summary>
              <code className="block break-all pt-1">{order.manual_review.reason_code}</code>
            </details>
          )}
        </div>
      )}
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
    <section className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-base font-medium">{title}</h3>
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
    <div className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start gap-3 text-sm">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className={emphasis ? 'min-w-0 break-words text-end font-medium tabular-nums' : 'min-w-0 break-words text-end'}>
        {value}
      </span>
    </div>
  );
}

function OrderStatusBadge({status}: {status: string}) {
  return (
    <Badge
      variant={statusBadgeVariant(status)}
      className={
        status === 'manual_review' ? 'bg-warning/10 text-warning' : undefined
      }
    >
      <PaymentStatusLabel status={status} />
    </Badge>
  );
}

function TransactionStatusBadge({status}: {status: string}) {
  const label = transactionStatusLabel(status);
  if (!label) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge
      variant={statusBadgeVariant(status)}
      className={
        status === 'manual_review' ? 'bg-warning/10 text-warning' : undefined
      }
    >
      {label}
    </Badge>
  );
}

function PaymentMethod({order}: {order: Order}) {
  const label = paymentMethodLabel(order);
  return (
    <div className="flex flex-col">
      <span>{label}</span>
      {order.payment_gateway === 'verify_et' && order.account_ending && (
        <span className="font-mono text-xs text-muted-foreground">
          •••• {order.account_ending}
        </span>
      )}
    </div>
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
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
        <span aria-live="polite">
          <Trans message="of :total" values={{total}} />
        </span>
      </div>

      <nav
        className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start"
        aria-label="Pagination"
      >
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <Trans message="Previous" />
        </Button>

        <div className="hidden items-center gap-1 sm:flex">
          {items.map(item =>
            typeof item === 'number' ? (
              <Button
                key={item}
                variant={item === page ? 'outline' : 'ghost'}
                size="sm"
                className={
                  item === page
                    ? 'min-w-9 bg-muted px-2 font-medium'
                    : 'min-w-9 px-2'
                }
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
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          <Trans message="Next" />
        </Button>
      </nav>
    </div>
  );
}

function TableLoading() {
  return (
    <div className="flex flex-col gap-2 p-6" aria-busy="true">
      {[0, 1, 2, 3].map(row => (
        <Skeleton key={row} className="h-12 w-full" />
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

function paginationFrom(value: Partial<Pagination> | undefined): Pagination {
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
  if (order.payment_gateway === 'verify_et') return 'Verify.et (historical)';
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
    case 'verify_et':
      return 'Verify.et';
    default:
      return method ? method.toUpperCase() : '—';
  }
}

function transactionStatusLabel(status: string): ReactNode {
  switch (status) {
    case 'pending':
      return <Trans message="Pending" />;
    case 'verifying':
      return <Trans message="Verifying" />;
    case 'success':
      return <Trans message="Verified" />;
    case 'manual_approved':
      return <Trans message="Manually approved" />;
    case 'manual_review':
      return <Trans message="Manual review" />;
    case 'mismatch':
      return <Trans message="Mismatch" />;
    case 'failed':
      return <Trans message="Failed" />;
    default:
      return null;
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

function verificationReasonLabel(code: string): ReactNode {
  switch (code) {
    case 'recipient_evidence_missing':
      return <Trans message="Receiving account could not be confirmed" />;
    case 'confirmation_history_review':
      return <Trans message="Transaction confirmation needs review" />;
    case 'free_allowance_exhausted':
      return <Trans message="Free verified-sales allowance exhausted" />;
    case 'verification_evidence_mismatch':
      return <Trans message="Payment details did not match" />;
    default:
      return <Trans message="Additional verification needed" />;
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
