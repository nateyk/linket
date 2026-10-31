import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Tabs} from '@shadcn/tabs/tabs';
import {formatMoney} from '@ui/i18n/format-money';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  AlertTriangleIcon,
  CircleDollarSignIcon,
  ClockIcon,
  EyeIcon,
  PackageCheckIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {Link, useSearchParams} from 'react-router';
import {PaymentStatusLabel} from './payment-status-badge';

type Tab = 'orders' | 'transactions' | 'manual-review' | 'billing';

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

type Method = {
  id: number;
  provider: string;
  account_ending: string;
  account_name: string;
  status: string;
  is_active: boolean;
  lifecycle_state: string;
  is_suspended: boolean;
};

type PaymentProvider = {code: string; name: string};

type Invoice = {
  uuid: string;
  invoice_number: string;
  commission_fee_cents: number;
  status: string;
  sales_count: number;
};

type Billing = {
  pro_plan?: {monthly_price_cents: number | null; currency: string};
  pro_subscription?: {
    status: string;
    renews_at?: string | null;
    ends_at?: string | null;
    pending_payment?: {status: string; amount_cents: number} | null;
    payments?: Array<{
      payment_id: string;
      amount_cents: number;
      currency: string;
      status: string;
      transaction_reference?: string | null;
      provider?: string | null;
      paid_at?: string | null;
      created_at?: string | null;
    }>;
  };
  verification_allowance?: {
    consumed: number;
    reserved: number;
    remaining: number;
    limit: number;
    is_pro: boolean;
    can_start_checkout: boolean;
    renews_at?: string | null;
  };
  estimated_commission: {gross_sales_cents: number; fee_cents: number};
  invoices: {data: Invoice[]};
  corporate_account: {provider: string; account_number: string | null};
  legacy_access: boolean;
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

  const [billing, setBilling] = useState<Billing>();
  const [methods, setMethods] = useState<Method[]>([]);
  const [availableMethods, setAvailableMethods] = useState<PaymentProvider[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);

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

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const [visibleAccount, setVisibleAccount] = useState<{
    id: number;
    number: string;
  }>();
  const [provider, setProvider] = useState('cbe');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [proof, setProof] = useState<File>();
  const [invoiceReference, setInvoiceReference] = useState<
    Record<string, string>
  >({});
  const [proPayment, setProPayment] = useState<string>();
  const [proAmountCents, setProAmountCents] = useState<number>();
  const [proReference, setProReference] = useState('');

  const ordersRequest = useRef(0);
  const transactionsRequest = useRef(0);
  const manualRequest = useRef(0);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const [billingResponse, methodsResponse] = await Promise.all([
        apiClient.get('/api/v1/billing/direct'),
        apiClient.get('/api/v1/storefront/payment-methods'),
      ]);
      setBilling(billingResponse.data);
      setMethods(methodsResponse.data.data ?? []);
      setAvailableMethods(methodsResponse.data.available_methods ?? []);
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBillingLoading(false);
    }
  }, [refreshKey]);

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
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    void loadManualOrders();
  }, [loadManualOrders]);

  const saveMethod = async () => {
    if (!proof || !accountNumber.trim() || !accountName.trim()) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('provider', provider);
      form.append('account_number', accountNumber.trim());
      form.append('account_name', accountName.trim());
      form.append('proof', proof);
      await apiClient.post('/api/v1/storefront/payment-methods', form);
      setAccountNumber('');
      setAccountName('');
      setProof(undefined);
      await loadBilling();
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const showAccount = async (id: number) => {
    if (visibleAccount?.id === id) {
      setVisibleAccount(undefined);
      return;
    }
    try {
      const response = await apiClient.get(
        `/api/v1/storefront/payment-methods/${id}/details`,
        {headers: {'Cache-Control': 'no-store'}},
      );
      setVisibleAccount({id, number: response.data.data.account_number});
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    }
  };

  const verifyInvoice = async (invoice: Invoice) => {
    setBusy(true);
    try {
      await apiClient.post(
        `/api/v1/billing/direct/invoices/${invoice.uuid}/reference`,
        {reference: invoiceReference[invoice.uuid]},
      );
      await loadBilling();
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const startPro = async () => {
    setBusy(true);
    try {
      const response = await apiClient.post('/api/v1/billing/direct/pro');
      setProPayment(response.data.payment_id);
      setProAmountCents(response.data.amount_cents);
      setActionError(undefined);
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const verifyPro = async () => {
    if (!proPayment || !proReference.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(
        `/api/v1/billing/direct/pro/${proPayment}/reference`,
        {reference: proReference.trim()},
      );
      await loadBilling();
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 py-5">
          {actionError && (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          )}

          <SummaryCards summary={summary} />

          <Tabs.Root
            value={tab}
            onValueChange={value => setTab(value as Tab)}
            className="gap-4"
          >
            <Tabs.List variant="line" className="w-full justify-start">
              <Tabs.Tab value="orders">
                <Trans message="Orders" />
              </Tabs.Tab>
              <Tabs.Tab value="transactions">
                <Trans message="Transactions" />
              </Tabs.Tab>
              <Tabs.Tab value="manual-review">
                <Trans message="Manual review" />
                {!!summary?.manual_review_count && (
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    {summary.manual_review_count}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="billing">
                <Trans message="Billing" />
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="orders" className="flex flex-col gap-4">
              <Card.Root>
                <Card.Header className="gap-3 border-b">
                  <div>
                    <Card.Title>
                      <Trans message="Orders" />
                    </Card.Title>
                    <Card.Description>
                      <Trans message="Payments received for your products. Orders are only marked as paid after the payment provider verifies them." />
                    </Card.Description>
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
                </Card.Header>
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
              <Card.Root>
                <Card.Header className="gap-3 border-b">
                  <div>
                    <Card.Title>
                      <Trans message="Transactions" />
                    </Card.Title>
                    <Card.Description>
                      <Trans message="Verification attempts for payments sent to your receiving accounts. Provider evidence stays private." />
                    </Card.Description>
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
                </Card.Header>
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
              <Card.Root>
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

            <Tabs.Panel value="billing" className="flex flex-col gap-5">
              {billingLoading && !billing ? (
                <BillingLoading />
              ) : (
                <>
                  {billing?.verification_allowance && (
                    <Card.Root>
                      <Card.Header>
                        <Card.Title>
                          {billing.verification_allowance.is_pro ? (
                            <Trans message="Pro active" />
                          ) : (
                            <Trans message="Free verified-sales allowance" />
                          )}
                        </Card.Title>
                        <Card.Description>
                          <Trans message="The free allowance covers verified sales and is separate from historical commission obligations." />
                        </Card.Description>
                      </Card.Header>
                      <Card.Content>
                        {billing.verification_allowance.is_pro ? (
                          <>
                            <p>
                              <Trans message="Unlimited eligible verified sales while Pro is active." />
                            </p>
                            {billing.pro_subscription?.ends_at && (
                              <p role="status" className="mt-1 text-warning">
                                <Trans
                                  message="Pro access ends on :date. Free limits will apply after expiration."
                                  values={{date: new Date(billing.pro_subscription.ends_at).toLocaleDateString()}}
                                />
                              </p>
                            )}
                            {billing.verification_allowance.renews_at && (
                              <p className="mt-1 text-muted-foreground">
                                <Trans
                                  message="Renewal date: :date"
                                  values={{
                                    date: new Date(
                                      billing.verification_allowance.renews_at,
                                    ).toLocaleDateString(),
                                  }}
                                />
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-start gap-3">
                            <p>
                              <Trans
                                message=":used of :limit verified sales used"
                                values={{
                                  used: billing.verification_allowance.consumed,
                                  limit: billing.verification_allowance.limit,
                                }}
                              />
                            </p>
                            <p className="text-muted-foreground">
                              <Trans
                                message=":remaining available · :reserved awaiting payment verification"
                                values={{
                                  remaining:
                                    billing.verification_allowance.remaining,
                                  reserved: billing.verification_allowance.reserved,
                                }}
                              />
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {billing.pro_plan?.monthly_price_cents != null ? (
                                <Trans
                                  message="Pro is :price per month, with unlimited eligible verified sales while active."
                                  values={{price: formatMoney(billing.pro_plan.monthly_price_cents, billing.pro_plan.currency)}}
                                />
                              ) : (
                                <Trans message="Pro includes unlimited eligible verified sales while active." />
                              )}
                            </p>
                            {billing.pro_subscription?.pending_payment && (
                              <p role="status" className="text-warning">
                                <Trans message="Pro payment pending verification. Your Free limits remain in effect until payment is verified." />
                              </p>
                            )}
                            {!billing.verification_allowance
                              .can_start_checkout && (
                              <p role="status" className="text-warning">
                                <Trans message="Your free verified-sales allowance is used or reserved. Upgrade to Pro to accept more sales." />
                              </p>
                            )}
                            <Button
                              disabled={busy}
                              onClick={() => void startPro()}
                            >
                              <Trans message="Upgrade to Pro" />
                            </Button>
                          </div>
                        )}
                      </Card.Content>
                    </Card.Root>
                  )}

                  <Card.Root>
                    <Card.Header>
                      <Card.Title>
                        <Trans message="Receiving accounts" />
                      </Card.Title>
                      <Card.Description>
                        <Trans message="Buyers pay directly to an approved account. New accounts are reviewed before checkout can use them." />
                      </Card.Description>
                    </Card.Header>
                    <Card.Content className="flex flex-col gap-4">
                      {methods.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          <Trans message="No receiving accounts yet." />
                        </p>
                      )}
                      {methods.map(method => (
                        <div
                          key={method.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-muted p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">{method.account_name}</p>
                            <p className="text-muted-foreground">
                              {method.provider.toUpperCase()} ·{' '}
                              {visibleAccount?.id === method.id ? (
                                visibleAccount.number
                              ) : (
                                <Trans
                                  message="Ending :digits"
                                  values={{digits: method.account_ending}}
                                />
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge>{lifecycleLabel(method.lifecycle_state)}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void showAccount(method.id)}
                            >
                              {visibleAccount?.id === method.id ? (
                                <Trans message="Hide account" />
                              ) : (
                                <Trans message="View account" />
                              )}
                            </Button>
                            {method.lifecycle_state ===
                              'provider_registered' && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  void apiClient
                                    .post(
                                      `/api/v1/storefront/payment-methods/${method.id}/activate`,
                                    )
                                    .then(loadBilling)
                                    .catch(reason =>
                                      setActionError(getApiErrorMessage(reason)),
                                    )
                                }
                              >
                                <Trans message="Activate receiving account" />
                              </Button>
                            )}
                            {method.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void apiClient
                                    .post(
                                      `/api/v1/storefront/payment-methods/${method.id}/deactivate`,
                                    )
                                    .then(loadBilling)
                                }
                              >
                                <Trans message="Deactivate" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Select.Root
                          value={provider}
                          onValueChange={value => value && setProvider(value)}
                        >
                          <Select.Trigger className="w-full">
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Group>
                              {availableMethods.map(method => (
                                <Select.Item
                                  key={method.code}
                                  value={method.code}
                                >
                                  {method.name}
                                </Select.Item>
                              ))}
                            </Select.Group>
                          </Select.Content>
                        </Select.Root>
                        <Input
                          bindToHookForm={false}
                          value={accountNumber}
                          onChange={event =>
                            setAccountNumber(event.target.value)
                          }
                          placeholder="Account or wallet number"
                        />
                        <Input
                          bindToHookForm={false}
                          value={accountName}
                          onChange={event => setAccountName(event.target.value)}
                          placeholder="Account holder name"
                        />
                        <Input
                          bindToHookForm={false}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={event =>
                            setProof(event.target.files?.[0])
                          }
                        />
                      </div>
                      <Button
                        disabled={busy || !proof || !accountNumber || !accountName}
                        onClick={() => void saveMethod()}
                      >
                        <Trans message="Submit account for review" />
                      </Button>
                    </Card.Content>
                  </Card.Root>

                  {billing &&
                    (billing.invoices.data.length > 0 ||
                      billing.estimated_commission.fee_cents > 0) && (
                    <Card.Root>
                      <Card.Header>
                        <Card.Title>
                          <Trans message="Legacy billing" />
                        </Card.Title>
                        <Card.Description>
                          <Trans message="Historical commission invoices stay payable. New verified sales are not added to this balance." />
                        </Card.Description>
                      </Card.Header>
                      <Card.Content className="flex flex-col gap-4 text-sm">
                        {billing.estimated_commission.fee_cents > 0 && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">
                                <Trans message="Uninvoiced legacy sales" />
                              </p>
                              <p className="font-semibold tabular-nums">
                                {formatMoney(
                                  billing.estimated_commission.gross_sales_cents,
                                  'ETB',
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                <Trans message="Uninvoiced legacy commission" />
                              </p>
                              <p className="font-semibold tabular-nums">
                                {formatMoney(
                                  billing.estimated_commission.fee_cents,
                                  'ETB',
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                        {billing.invoices.data.map(invoice => (
                          <div
                            key={invoice.uuid}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-muted p-3"
                          >
                            <div>
                              <p className="font-medium">
                                {invoice.invoice_number}
                              </p>
                              <p>
                                {formatMoney(
                                  invoice.commission_fee_cents,
                                  'ETB',
                                )}{' '}
                                · {invoice.status} · {invoice.sales_count}{' '}
                                <Trans message="sales" />
                              </p>
                            </div>
                            {['pending', 'overdue'].includes(invoice.status) && (
                              <div className="flex gap-2">
                                <Input
                                  bindToHookForm={false}
                                  value={invoiceReference[invoice.uuid] ?? ''}
                                  onChange={event =>
                                    setInvoiceReference(current => ({
                                      ...current,
                                      [invoice.uuid]: event.target.value,
                                    }))
                                  }
                                  placeholder="Transaction reference"
                                />
                                <Button
                                  disabled={
                                    busy || !invoiceReference[invoice.uuid]
                                  }
                                  onClick={() => void verifyInvoice(invoice)}
                                >
                                  <Trans message="Verify" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </Card.Content>
                    </Card.Root>
                  )}

                  {billing && (
                    <Card.Root>
                      <Card.Header>
                        <Card.Title>
                          <Trans message="Pro subscription" />
                        </Card.Title>
                      </Card.Header>
                      <Card.Content className="flex flex-col gap-4 text-sm">
                        <p>
                          <Trans
                            message="Pay Linket directly to :provider account :account."
                            values={{
                              provider:
                                billing.corporate_account.provider.toUpperCase(),
                              account:
                                billing.corporate_account.account_number ?? '—',
                            }}
                          />
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button disabled={busy} onClick={() => void startPro()}>
                            <Trans message="View Pro payment instructions" />
                          </Button>
                          {proPayment && (
                            <>
                              {proAmountCents !== undefined && (
                                <span>
                                  <Trans
                                    message="Amount due: :amount"
                                    values={{
                                      amount: formatMoney(
                                        proAmountCents,
                                        'ETB',
                                      ),
                                    }}
                                  />
                                </span>
                              )}
                              <Input
                                bindToHookForm={false}
                                value={proReference}
                                onChange={event =>
                                  setProReference(event.target.value)
                                }
                                placeholder="Transaction reference"
                              />
                              <Button
                                disabled={busy || !proReference}
                                onClick={() => void verifyPro()}
                              >
                                <Trans message="Verify Pro payment" />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="flex flex-col gap-3 border-t border-border pt-4">
                          <h3 className="font-medium"><Trans message="Pro subscription payment history" /></h3>
                          {billing.pro_subscription?.payments?.length ? billing.pro_subscription.payments.map(payment => (
                            <div key={payment.payment_id} className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-muted p-3">
                              <div>
                                <p className="font-medium">{formatMoney(payment.amount_cents, payment.currency)}</p>
                                <p className="text-muted-foreground">
                                  {payment.transaction_reference ? <Trans message="Reference: :reference" values={{reference: payment.transaction_reference}} /> : <Trans message="No transaction reference submitted" />}
                                  {payment.provider ? ` · ${payment.provider.toUpperCase()}` : ''}
                                </p>
                                <p className="text-muted-foreground"><FormattedDate date={payment.paid_at ?? payment.created_at} /></p>
                              </div>
                              <Badge>{proPaymentStatusLabel(payment.status)}</Badge>
                            </div>
                          )) : <p className="text-muted-foreground"><Trans message="No Pro subscription payments yet." /></p>}
                        </div>
                      </Card.Content>
                    </Card.Root>
                  )}

                  {billing?.legacy_access && (
                    <Link
                      to="/dashboard/legacy-payouts"
                      className="text-sm text-primary underline"
                    >
                      <Trans message="View historical payout requests" />
                    </Link>
                  )}
                </>
              )}
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={<CircleDollarSignIcon />}
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
        icon={<ClockIcon />}
        label={<Trans message="Pending orders" />}
        value={summary?.pending_count ?? '—'}
        detail={<Trans message="Awaiting payment or provider verification" />}
      />
      <SummaryCard
        icon={<AlertTriangleIcon />}
        label={<Trans message="Manual review" />}
        value={summary?.manual_review_count ?? '—'}
        detail={<Trans message="Resolved by Linket support" />}
        tone={summary?.manual_review_count ? 'warning' : undefined}
      />
      <SummaryCard
        icon={<ShieldCheckIcon />}
        label={<Trans message="Rejected payments" />}
        value={summary?.rejected_count ?? '—'}
        detail={<Trans message="Never counted as sales" />}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  detail: ReactNode;
  tone?: 'warning';
}) {
  return (
    <Card.Root size="sm">
      <Card.Content className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-card-sm ${
            tone === 'warning'
              ? 'bg-warning/10 text-warning'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
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
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Input
        bindToHookForm={false}
        aria-label="Search orders"
        placeholder="Search product, buyer or reference"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
      />
      <Select.Root value={status} onValueChange={value => onStatusChange(value ?? 'all')}>
        <Select.Trigger className="w-full">
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
      <Input
        bindToHookForm={false}
        aria-label="From date"
        type="date"
        value={from}
        onChange={event => onFromChange(event.target.value)}
      />
      <Input
        bindToHookForm={false}
        aria-label="To date"
        type="date"
        value={to}
        onChange={event => onToChange(event.target.value)}
      />
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
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Input
        bindToHookForm={false}
        aria-label="Search transactions"
        placeholder="Search reference, buyer or product"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
      />
      <Select.Root value={status} onValueChange={value => onStatusChange(value ?? 'all')}>
        <Select.Trigger className="w-full">
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
      <Input
        bindToHookForm={false}
        aria-label="Transactions from date"
        type="date"
        value={from}
        onChange={event => onFromChange(event.target.value)}
      />
      <Input
        bindToHookForm={false}
        aria-label="Transactions to date"
        type="date"
        value={to}
        onChange={event => onToChange(event.target.value)}
      />
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
    <div className="overflow-x-auto">
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
        <Table.Body>
          {orders.map(order => (
            <Table.Row key={order.uuid}>
              <Table.Cell className="max-w-52 ps-6">
                <span className="block truncate font-medium">
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
              <Table.Cell className="hidden text-muted-foreground md:table-cell">
                <FormattedDate preset="short" date={order.created_at} />
              </Table.Cell>
              <Table.Cell className="hidden lg:table-cell">
                <PaymentMethod order={order} />
              </Table.Cell>
              <Table.Cell>
                <OrderStatusBadge status={order.status} />
              </Table.Cell>
              <Table.Cell className="pe-6 text-end">
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
    <div className="overflow-x-auto">
      <Table.Root>
        <Table.Header>
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
        <Table.Body>
          {transactions.map(transaction => (
            <Table.Row key={transaction.id}>
              <Table.Cell className="max-w-48 ps-6">
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
              <Table.Cell className="max-w-48">
                <span className="block truncate">
                  {transaction.product_title ?? (
                    <Trans message="Deleted product" />
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {transaction.buyer_name ?? transaction.order_uuid}
                </span>
              </Table.Cell>
              <Table.Cell className="text-end font-medium tabular-nums">
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
              <Table.Cell>
                <TransactionStatusBadge status={transaction.status} />
              </Table.Cell>
              <Table.Cell className="hidden text-muted-foreground lg:table-cell">
                <FormattedDate
                  preset="short"
                  date={transaction.verified_at ?? transaction.created_at}
                />
              </Table.Cell>
              <Table.Cell className="pe-6 text-end">
                {transaction.order_uuid && (
                  <Button
                    variant="outline"
                    size="sm"
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        <Trans message=":total results" values={{total}} />
      </p>
      <div className="flex items-center gap-2">
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

function BillingLoading() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-56 w-full" />
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

function lifecycleLabel(state: string) {
  switch (state) {
    case 'pending_ownership_review':
      return <Trans message="Pending ownership review" />;
    case 'pending_provider_registration':
      return <Trans message="Pending provider registration" />;
    case 'provider_registered':
      return <Trans message="Provider registered" />;
    case 'suspended':
      return <Trans message="Suspended" />;
    case 'rejected':
      return <Trans message="Rejected" />;
    default:
      return <Trans message="Active" />;
  }
}

function proPaymentStatusLabel(status: string): ReactNode {
  const labels: Record<string, ReactNode> = {
    paid: <Trans message="Paid" />,
    pending_payment: <Trans message="Awaiting payment" />,
    pending_verification: <Trans message="Pending verification" />,
    manual_review: <Trans message="Manual review" />,
    rejected: <Trans message="Rejected" />,
    expired: <Trans message="Expired" />,
  };

  return labels[status] ?? <Trans message="Payment status unavailable" />;
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
