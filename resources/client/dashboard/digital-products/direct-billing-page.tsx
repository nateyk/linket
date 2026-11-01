import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Popover} from '@shadcn/popover/popover';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Tabs} from '@shadcn/tabs/tabs';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  EyeIcon,
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

type Tab = 'orders' | 'transactions' | 'manual-review';

type Pagination = {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type Summary = {
  verified_sales_count: number;
  verified_revenue_cents: number;
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

type Transaction = {
  id: number;
  attempt_uuid?: string | null;
  reference?: string | null;
  status: string;
  provider?: string | null;
  amount_cents: number;
  currency?: string;
  attempt: number;
  error_code?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
  order_uuid?: string | null;
  order_status?: string | null;
  product_title?: string | null;
  buyer_name?: string | null;
};

const emptyPagination: Pagination = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 25,
};

const orderStatusOptions = [
  {value: 'all', label: <Trans message="All statuses" />},
  {value: 'pending_payment', label: <Trans message="Payment pending" />},
  {value: 'verifying', label: <Trans message="Awaiting provider verification" />},
  {value: 'paid', label: <Trans message="Payment verified" />},
  {value: 'fulfilled', label: <Trans message="Fulfilled" />},
  {value: 'manual_review', label: <Trans message="Manual review" />},
  {value: 'failed_verification', label: <Trans message="Verification rejected" />},
  {value: 'expired', label: <Trans message="Expired" />},
];

const transactionStatusOptions = [
  {value: 'all', label: <Trans message="All statuses" />},
  {value: 'pending', label: <Trans message="Pending" />},
  {value: 'verifying', label: <Trans message="Verifying" />},
  {value: 'success', label: <Trans message="Verified" />},
  {value: 'manual_approved', label: <Trans message="Manually approved" />},
  {value: 'manual_review', label: <Trans message="Manual review" />},
  {value: 'mismatch', label: <Trans message="Mismatch" />},
  {value: 'failed', label: <Trans message="Failed" />},
];

export function Component() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('orders');
  const [refreshKey, setRefreshKey] = useState(0);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersPagination, setOrdersPagination] =
    useState<Pagination>(emptyPagination);
  const [summary, setSummary] = useState<Summary>();
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string>();

  const [orderStatus, setOrderStatus] = useState(() => orderStatusOptions.some(option => option.value === searchParams.get('status')) ? searchParams.get('status')! : 'all');
  const [orderSearch, setOrderSearch] = useState(() => (searchParams.get('search') ?? '').slice(0, 100));
  const [orderFrom, setOrderFrom] = useState(() => searchParams.get('from') ?? '');
  const [orderTo, setOrderTo] = useState(() => searchParams.get('to') ?? '');
  const [orderPage, setOrderPage] = useState(() => {
    const value = Number(searchParams.get('page'));
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  });
  const debouncedOrderSearch = useDebouncedValue(orderSearch, 300);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsPagination, setTransactionsPagination] =
    useState<Pagination>(emptyPagination);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string>();
  const [transactionStatus, setTransactionStatus] = useState('all');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionFrom, setTransactionFrom] = useState('');
  const [transactionTo, setTransactionTo] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const debouncedTransactionSearch = useDebouncedValue(transactionSearch, 300);

  const [manualOrders, setManualOrders] = useState<Order[]>([]);
  const [manualPagination, setManualPagination] =
    useState<Pagination>(emptyPagination);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string>();
  const [manualPage, setManualPage] = useState(1);

  const [detailUuid, setDetailUuid] = useState<string>();

  const ordersRequest = useRef(0);
  const transactionsRequest = useRef(0);
  const manualRequest = useRef(0);

  const loadOrders = useCallback(async () => {
    const sequence = ++ordersRequest.current;
    setOrdersLoading(true);
    try {
      const response = await apiClient.get('/api/v1/storefront/direct-orders', {
        params: {
          status: orderStatus === 'all' ? undefined : orderStatus,
          search: debouncedOrderSearch || undefined,
          from: orderFrom || undefined,
          to: orderTo || undefined,
          page: orderPage,
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
    refreshKey,
  ]);

  const loadTransactions = useCallback(async () => {
    if (tab !== 'transactions') return;
    const sequence = ++transactionsRequest.current;
    setTransactionsLoading(true);
    try {
      const response = await apiClient.get(
        '/api/v1/storefront/direct-orders/transactions',
        {
          params: {
            status: transactionStatus === 'all' ? undefined : transactionStatus,
            search: debouncedTransactionSearch || undefined,
            from: transactionFrom || undefined,
            to: transactionTo || undefined,
            page: transactionPage,
          },
        },
      );
      if (sequence !== transactionsRequest.current) return;
      setTransactions(response.data.data?.data ?? []);
      setTransactionsPagination(paginationFrom(response.data.data));
      setTransactionsError(undefined);
    } catch (reason) {
      if (sequence === transactionsRequest.current) {
        setTransactionsError(getApiErrorMessage(reason));
      }
    } finally {
      if (sequence === transactionsRequest.current) {
        setTransactionsLoading(false);
      }
    }
  }, [
    tab,
    transactionStatus,
    debouncedTransactionSearch,
    transactionFrom,
    transactionTo,
    transactionPage,
    refreshKey,
  ]);

  const loadManualOrders = useCallback(async () => {
    if (tab !== 'manual-review') return;
    const sequence = ++manualRequest.current;
    setManualLoading(true);
    try {
      const response = await apiClient.get('/api/v1/storefront/direct-orders', {
        params: {status: 'manual_review', page: manualPage},
      });
      if (sequence !== manualRequest.current) return;
      setManualOrders(response.data.data?.data ?? []);
      setManualPagination(paginationFrom(response.data.data));
      setManualError(undefined);
    } catch (reason) {
      if (sequence === manualRequest.current) {
        setManualError(getApiErrorMessage(reason));
      }
    } finally {
      if (sequence === manualRequest.current) setManualLoading(false);
    }
  }, [tab, manualPage, refreshKey]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    void loadManualOrders();
  }, [loadManualOrders]);

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
          disabled={ordersLoading || transactionsLoading || manualLoading}
        >
          <RefreshCwIcon />
          <Trans message="Refresh" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
          <SummaryCards summary={summary} />

          <Tabs.Root
            value={tab}
            onValueChange={value => setTab(value as Tab)}
            className="gap-4"
          >
            <div className="overflow-x-auto border-b border-border">
              <Tabs.List variant="line" className="w-max justify-start">
              <Tabs.Tab value="orders" className="flex-none">
                <Trans message="Orders" />
              </Tabs.Tab>
              <Tabs.Tab value="transactions" className="flex-none">
                <Trans message="Transactions" />
              </Tabs.Tab>
              <Tabs.Tab value="manual-review" className="flex-none">
                <Trans message="Manual review" />
                {!!summary?.manual_review_count && (
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    {summary.manual_review_count}
                  </Badge>
                )}
              </Tabs.Tab>
              </Tabs.List>
            </div>

            <Tabs.Panel value="orders" className="flex flex-col gap-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-base font-medium"><Trans message="Orders" /></h2>
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Payments received for your products. Orders are only marked as paid after the payment provider verifies them." />
                  </p>
                </div>
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
              </div>
              <Card.Root size="sm" className="rounded-card-sm">
                <Card.Content className="px-0">
                  <OrdersTable
                    orders={orders}
                    loading={ordersLoading}
                    error={ordersError}
                    onView={setDetailUuid}
                  />
                </Card.Content>
                {ordersPagination.total > 0 && (
                  <Card.Footer className="border-t pt-4">
                    <Pagination
                      page={ordersPagination.current_page}
                      lastPage={ordersPagination.last_page}
                      total={ordersPagination.total}
                      onChange={setOrderPage}
                    />
                  </Card.Footer>
                )}
              </Card.Root>
            </Tabs.Panel>

            <Tabs.Panel value="transactions" className="flex flex-col gap-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-base font-medium"><Trans message="Transactions" /></h2>
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Verification attempts for payments sent to your receiving accounts. Provider evidence stays private." />
                  </p>
                </div>
                <TransactionFilters
                    status={transactionStatus}
                    search={transactionSearch}
                    from={transactionFrom}
                    to={transactionTo}
                    onStatusChange={value => {
                      setTransactionStatus(value);
                      setTransactionPage(1);
                    }}
                    onSearchChange={value => {
                      setTransactionSearch(value);
                      setTransactionPage(1);
                    }}
                    onFromChange={value => {
                      setTransactionFrom(value);
                      setTransactionPage(1);
                    }}
                    onToChange={value => {
                      setTransactionTo(value);
                      setTransactionPage(1);
                    }}
                  />
              </div>
              <Card.Root size="sm" className="rounded-card-sm">
                <Card.Content className="px-0">
                  <TransactionsTable
                    transactions={transactions}
                    loading={transactionsLoading}
                    error={transactionsError}
                    onViewOrder={setDetailUuid}
                  />
                </Card.Content>
                {transactionsPagination.total > 0 && (
                  <Card.Footer className="border-t pt-4">
                    <Pagination
                      page={transactionsPagination.current_page}
                      lastPage={transactionsPagination.last_page}
                      total={transactionsPagination.total}
                      onChange={setTransactionPage}
                    />
                  </Card.Footer>
                )}
              </Card.Root>
            </Tabs.Panel>

            <Tabs.Panel value="manual-review" className="flex flex-col gap-4">
              <Card.Root size="sm" className="rounded-card-sm">
                <Card.Header className="border-b">
                  <Card.Title>
                    <Trans message="Manual review" />
                  </Card.Title>
                  <Card.Description>
                    <Trans message="These payments could not be verified automatically. Review is read-only and Linket support resolves them. You cannot mark an order as paid." />
                  </Card.Description>
                </Card.Header>
                <Card.Content className="px-0">
                  <OrdersTable
                    orders={manualOrders}
                    loading={manualLoading}
                    error={manualError}
                    onView={setDetailUuid}
                    emptyMessage={
                      <Trans message="No orders are waiting for manual review." />
                    }
                  />
                </Card.Content>
                {manualPagination.total > 0 && (
                  <Card.Footer className="border-t pt-4">
                    <Pagination
                      page={manualPagination.current_page}
                      lastPage={manualPagination.last_page}
                      total={manualPagination.total}
                      onChange={setManualPage}
                    />
                  </Card.Footer>
                )}
              </Card.Root>
            </Tabs.Panel>

          </Tabs.Root>
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
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      <SummaryCard
        label={<Trans message="Verified sales" />}
        value={
          summary ? (
            <FormattedCurrency
              valueInCents={summary.verified_revenue_cents}
              currency={summary.currency}
            />
          ) : (
            '—'
          )
        }
        detail={
          summary ? (
            <Trans
              message=":count verified orders"
              values={{count: summary.verified_sales_count}}
            />
          ) : null
        }
      />
      <SummaryCard
        label={<Trans message="Pending orders" />}
        value={summary?.pending_count ?? '—'}
        detail={<Trans message="Awaiting verification" />}
      />
      <SummaryCard
        label={<Trans message="Manual review" />}
        value={summary?.manual_review_count ?? '—'}
        detail={<Trans message="Support review" />}
        tone={summary?.manual_review_count ? 'warning' : undefined}
      />
      <SummaryCard
        label={<Trans message="Rejected payments" />}
        value={summary?.rejected_count ?? '—'}
        detail={<Trans message="Excluded from sales" />}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  detail: ReactNode;
  tone?: 'warning';
}) {
  return (
    <Card.Root size="sm" className="rounded-card-sm">
      <Card.Content className="flex min-w-0 flex-col gap-1 p-3 sm:gap-1.5 sm:p-4">
        <p className={tone === 'warning' ? 'text-sm text-warning' : 'text-sm text-muted-foreground'}>{label}</p>
        <p className="text-xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs leading-snug text-muted-foreground">{detail}</p>
      </Card.Content>
    </Card.Root>
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
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1">
        <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          bindToHookForm={false}
          className="ps-9"
          aria-label="Search orders"
          placeholder="Search orders"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:items-center">
        <Select.Root value={status} onValueChange={value => onStatusChange(value ?? 'all')}>
          <Select.Trigger aria-label="Order status" className="w-full md:w-52">
            <Select.Value placeholder={<Trans message="All statuses" />} />
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

function TransactionFilters({
  status,
  search,
  from,
  to,
  onStatusChange,
  onSearchChange,
  onFromChange,
  onToChange,
}: {
  status: string;
  search: string;
  from: string;
  to: string;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const isFiltered = status !== 'all' || !!search || !!from || !!to;
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1">
        <SearchIcon aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          bindToHookForm={false}
          className="ps-9"
          aria-label="Search transactions"
          placeholder="Search reference, buyer or product"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:items-center">
        <Select.Root value={status} onValueChange={value => onStatusChange(value ?? 'all')}>
          <Select.Trigger aria-label="Transaction status" className="w-full md:w-52">
            <Select.Value placeholder={<Trans message="All statuses" />} />
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              {transactionStatusOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        <Popover.Root>
          <Popover.Trigger render={
            <Button variant="outline" className="shrink-0" aria-label="Filter transactions by date">
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
                  <Input bindToHookForm={false} aria-label="Transactions from date" type="date" value={from} max={to || undefined} onChange={event => onFromChange(event.target.value)} />
                </label>
                <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <Trans message="To" />
                  <Input bindToHookForm={false} aria-label="Transactions to date" type="date" value={to} min={from || undefined} onChange={event => onToChange(event.target.value)} />
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
  emptyMessage,
}: {
  orders: Order[];
  loading: boolean;
  error?: string;
  onView: (uuid: string) => void;
  emptyMessage?: ReactNode;
}) {
  if (loading) return <TableLoading />;
  if (error) {
    return (
      <p className="px-6 py-8 text-sm text-destructive" role="alert">
        {error}
      </p>
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
    <div className="min-w-0 md:overflow-x-auto">
      <Table.Root className="block w-full md:table">
        <Table.Header className="hidden md:table-header-group">
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
            <Table.Head className="hidden md:table-cell">
              <Trans message="Date" />
            </Table.Head>
            <Table.Head className="hidden lg:table-cell">
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
        <Table.Body className="block md:table-row-group">
          {orders.map(order => (
            <Table.Row key={order.uuid} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3 py-3 md:table-row md:p-0">
              <Table.Cell className="col-start-1 row-start-1 block min-w-0 max-w-none whitespace-normal p-0 md:table-cell md:max-w-52 md:whitespace-nowrap md:ps-6">
                <span className="block line-clamp-2 font-medium md:truncate">
                  {order.product?.title ?? (
                    <Trans message="Deleted product" />
                  )}
                </span>
                <span className="hidden truncate text-xs text-muted-foreground md:block">
                  {order.transaction_reference ?? order.uuid}
                </span>
              </Table.Cell>
              <Table.Cell className="col-start-1 row-start-2 block min-w-0 p-0 text-xs text-muted-foreground md:table-cell md:max-w-44 md:p-3 md:text-foreground">
                <span className="block truncate">
                  {order.buyer_name || (
                    <span className="text-muted-foreground">
                      <Trans message="Guest buyer" />
                    </span>
                  )}
                </span>
              </Table.Cell>
              <Table.Cell className="col-start-2 row-start-1 block p-0 text-end font-medium tabular-nums md:table-cell md:p-3">
                <FormattedCurrency
                  valueInCents={order.gross_amount_cents}
                  currency={order.currency ?? 'ETB'}
                />
              </Table.Cell>
              <Table.Cell className="col-start-2 row-start-2 block p-0 text-end text-xs text-muted-foreground md:table-cell md:p-3 md:text-start md:text-sm">
                <FormattedDate preset="short" date={order.created_at} />
              </Table.Cell>
              <Table.Cell className="hidden lg:table-cell">
                <PaymentMethod order={order} />
              </Table.Cell>
              <Table.Cell className="col-start-1 row-start-3 block min-w-0 p-0 md:table-cell md:p-3">
                <span className="sr-only md:hidden"><Trans message="Status: " /></span>
                <OrderStatusBadge status={order.status} />
              </Table.Cell>
              <Table.Cell className="col-start-2 row-start-3 block p-0 text-end md:table-cell md:p-3 md:pe-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-10 md:min-h-0"
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
  );
}

function TransactionsTable({
  transactions,
  loading,
  error,
  onViewOrder,
}: {
  transactions: Transaction[];
  loading: boolean;
  error?: string;
  onViewOrder: (uuid: string) => void;
}) {
  if (loading) return <TableLoading />;
  if (error) {
    return (
      <p className="px-6 py-8 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (!transactions.length) {
    return (
      <Empty.Root>
        <Empty.Header>
          <Empty.Media variant="icon">
            <ReceiptTextIcon />
          </Empty.Media>
          <Empty.Title>
            <Trans message="No transactions found" />
          </Empty.Title>
          <Empty.Description>
            <Trans message="Provider verification attempts will appear here once buyers submit payment references." />
          </Empty.Description>
        </Empty.Header>
      </Empty.Root>
    );
  }

  return (
    <div className="min-w-0 md:overflow-x-auto">
      <Table.Root className="block w-full md:table">
        <Table.Header className="hidden md:table-header-group">
          <Table.Row>
            <Table.Head className="ps-6">
              <Trans message="Reference" />
            </Table.Head>
            <Table.Head>
              <Trans message="Order" />
            </Table.Head>
            <Table.Head className="text-end">
              <Trans message="Amount" />
            </Table.Head>
            <Table.Head className="hidden md:table-cell">
              <Trans message="Provider" />
            </Table.Head>
            <Table.Head>
              <Trans message="Status" />
            </Table.Head>
            <Table.Head className="hidden lg:table-cell">
              <Trans message="Date" />
            </Table.Head>
            <Table.Head className="pe-6">
              <span className="sr-only">
                <Trans message="Actions" />
              </span>
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body className="block md:table-row-group">
          {transactions.map(transaction => (
            <Table.Row key={transaction.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3 py-3 md:table-row md:p-0">
              <Table.Cell className="col-start-1 row-start-1 block min-w-0 p-0 md:table-cell md:max-w-48 md:ps-6">
                <span className="block truncate font-medium">
                  {transaction.reference ?? '—'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  <Trans
                    message="Attempt :attempt"
                    values={{attempt: transaction.attempt}}
                  />
                  {transaction.error_code
                    ? ` · ${transaction.error_code}`
                    : null}
                </span>
              </Table.Cell>
              <Table.Cell className="col-start-1 row-start-2 block min-w-0 p-0 text-muted-foreground md:table-cell md:max-w-48 md:p-3 md:text-foreground">
                <span className="block truncate">
                  {transaction.product_title ?? (
                    <Trans message="Deleted product" />
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {transaction.buyer_name ?? transaction.order_uuid}
                </span>
              </Table.Cell>
              <Table.Cell className="col-start-2 row-start-1 block p-0 text-end font-medium tabular-nums md:table-cell md:p-3">
                <FormattedCurrency
                  valueInCents={transaction.amount_cents}
                  currency={transaction.currency ?? 'ETB'}
                />
              </Table.Cell>
              <Table.Cell className="hidden md:table-cell">
                {transaction.provider ? (
                  <span className="uppercase">{transaction.provider}</span>
                ) : (
                  '—'
                )}
              </Table.Cell>
              <Table.Cell className="col-start-1 row-start-3 block min-w-0 p-0 md:table-cell md:p-3">
                <span className="sr-only md:hidden"><Trans message="Status: " /></span>
                <TransactionStatusBadge status={transaction.status} />
              </Table.Cell>
              <Table.Cell className="col-start-2 row-start-2 block p-0 text-end text-xs text-muted-foreground md:hidden lg:table-cell lg:p-3 lg:text-start lg:text-sm">
                <FormattedDate
                  preset="short"
                  date={transaction.verified_at ?? transaction.created_at}
                />
              </Table.Cell>
              <Table.Cell className="col-start-2 row-start-3 block p-0 text-end md:table-cell md:p-3 md:pe-6">
                {transaction.order_uuid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 md:min-h-0"
                    onClick={() => onViewOrder(transaction.order_uuid!)}
                  >
                    <EyeIcon />
                    <Trans message="View order" />
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
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

  useEffect(() => {
    if (!uuid) {
      setDetail(undefined);
      setError(undefined);
      return;
    }

    let active = true;
    setLoading(true);
    setDetail(undefined);
    setError(undefined);

    apiClient
      .get(`/api/v1/storefront/direct-orders/${uuid}`)
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
  }, [uuid]);

  return (
    <Dialog.Root open={!!uuid} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-2xl">
          <Dialog.Header>
            <Dialog.Title>
              <ReceiptTextIcon />
              <Trans message="Order details" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Payment verification and delivery information for this order." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            {loading && <TableLoading />}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {detail && (
              <div className="flex flex-col gap-5">
                <OrderDetailContent order={detail} />
                <CreatorOrderDisputes orderUuid={detail.uuid ?? uuid!} />
              </div>
            )}
          </Dialog.Body>
          <Dialog.Footer variant="muted">
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-card-sm bg-muted p-4">
        <div>
          <p className="text-base font-medium">
            {order.product?.title ?? <Trans message="Deleted product" />}
          </p>
          <p className="text-sm text-muted-foreground">
            {order.buyer_name || <Trans message="Guest buyer" />}
            {order.buyer_email ? ` · ${order.buyer_email}` : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Trans
              message="Created :date"
              values={{date: <FormattedDate preset="short" date={order.created_at} />}}
            />
          </p>
        </div>
        <div className="text-end">
          <p className="text-lg font-semibold tabular-nums">
            <FormattedCurrency
              valueInCents={order.gross_amount_cents}
              currency={currency}
            />
          </p>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailSection title={<Trans message="Payment" />}>
          <DetailRow
            label={<Trans message="Transaction reference" />}
            value={order.transaction_reference ?? '—'}
          />
          <DetailRow
            label={<Trans message="Payment gateway" />}
            value={paymentMethodLabel(order)}
          />
          <DetailRow
            label={<Trans message="Receiving account" />}
            value={
              accountEnding ? (
                <span className="font-mono">•••• {accountEnding}</span>
              ) : (
                '—'
              )
            }
          />
          {(order.platform_fee_cents ?? 0) > 0 && (
            <DetailRow
              label={<Trans message="Legacy platform fee" />}
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
          />
        </DetailSection>

        <DetailSection title={<Trans message="Payment evidence" />}>
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
                label={<Trans message="Verified at" />}
                value={
                  <FormattedDate
                    preset="timestamp"
                    date={
                      order.verification.verified_at ??
                      order.verification.created_at
                    }
                  />
                }
              />
              {order.verification.error_code && (
                <DetailRow
                  label={<Trans message="Reason code" />}
                  value={order.verification.error_code}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans message="No provider verification has been recorded for this order." />
            </p>
          )}
        </DetailSection>
      </div>

      {!!order.verification?.history?.length && (
        <DetailSection title={<Trans message="Verification history" />}>
          <div className="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>
                    <Trans message="Reference" />
                  </Table.Head>
                  <Table.Head>
                    <Trans message="Status" />
                  </Table.Head>
                  <Table.Head>
                    <Trans message="Attempt" />
                  </Table.Head>
                  <Table.Head>
                    <Trans message="Date" />
                  </Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {order.verification.history.map((entry, index) => (
                  <Table.Row key={`${entry.reference}-${index}`}>
                    <Table.Cell className="max-w-40 truncate">
                      {entry.reference ?? '—'}
                    </Table.Cell>
                    <Table.Cell>
                      <TransactionStatusBadge status={entry.status} />
                    </Table.Cell>
                    <Table.Cell>{entry.attempt}</Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      <FormattedDate
                        preset="short"
                        date={entry.verified_at ?? entry.created_at}
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </DetailSection>
      )}

      <DetailSection title={<Trans message="Delivery" />}>
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant={deliveryBadgeVariant(order.delivery?.status)}>
            {deliveryStatusLabel(order.delivery?.status)}
          </Badge>
          {order.delivery && (
            <span className="text-muted-foreground">
              <Trans
                message=":downloaded of :limit downloads used across :count files"
                values={{
                  downloaded: order.delivery.downloaded_count,
                  limit: order.delivery.download_limit,
                  count: order.delivery.entitlements_count,
                }}
              />
            </span>
          )}
        </div>
        {!!order.delivery?.files?.length && (
          <ul className="mt-3 flex flex-col gap-2">
            {order.delivery.files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card-sm bg-muted px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <PackageCheckIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">
                    {file.name ?? <Trans message="File" />}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  <Trans
                    message=":count of :limit downloads"
                    values={{
                      count: file.download_count,
                      limit: file.download_limit,
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {order.manual_review && (
        <div className="rounded-card-sm border border-warning/20 bg-warning/10 p-3 text-sm">
          <p className="font-medium text-warning">
            <Trans message="Manual review is read-only" />
          </p>
          <p className="mt-1 text-muted-foreground">
            <Trans message="Linket support resolves this payment. The order cannot be marked as paid from your dashboard." />
          </p>
          {order.manual_review.reason_code && (
            <p className="mt-1 text-xs text-muted-foreground">
              <Trans
                message="Reason code: :code"
                values={{code: order.manual_review.reason_code}}
              />
            </p>
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
    <section className="rounded-card-sm border border-border p-3">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function DetailRow({label, value}: {label: ReactNode; value: ReactNode}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-end">{value}</span>
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
      {order.account_ending && (
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
  onChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        <Trans message=":total results" values={{total}} />
      </p>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <Trans message="Previous" />
        </Button>
        <span className="text-sm text-muted-foreground">
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
      </div>
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

function paginationFrom(value: Partial<Pagination> | undefined): Pagination {
  return {
    current_page: Number(value?.current_page ?? 1),
    last_page: Number(value?.last_page ?? 1),
    total: Number(value?.total ?? 0),
    per_page: Number(value?.per_page ?? 25),
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

function deliveryStatusLabel(status: string | undefined): ReactNode {
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
