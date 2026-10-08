import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {PaginatedResource} from '@common/http/backend-response/pagination-response';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Popover} from '@shadcn/popover/popover';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {Link} from 'react-router';
import {
  BanknoteArrowUpIcon,
  CheckCircleIcon,
  CircleAlertIcon,
  CircleQuestionMarkIcon,
  Clock3Icon,
  InboxIcon,
  LandmarkIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  BanIcon,
  type LucideIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

type Summary = {
  gross_sales_cents: number;
  creator_earnings_cents: number;
  available_for_payout_cents: number;
  held_earnings_cents: number;
  reserved_payout_cents: number;
  paid_out_cents: number;
  lifetime_earnings_cents: number;
  currency: string;
};

type Order = {
  id: number;
  currency: string;
  creator_earnings_cents: number;
  paid_at?: string;
  created_at: string;
  product?: {title: string};
};

type PayoutStatus =
  | 'requested'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'cancelled';

type Payout = {
  id: number;
  amount_cents: number;
  currency: string;
  status: PayoutStatus;
  payout_method_label?: string | null;
  withdrawal_method_name?: string | null;
  created_at: string;
};

type PayoutMethod = {
  id: number;
  type: 'bank_transfer' | 'paypal' | 'other';
  withdrawal_method_id?: number | null;
  account_holder: string;
  display_label: string;
};

const statusLabels: Record<PayoutStatus, string> = {
  requested: 'Requested',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function Component() {
  const [summary, setSummary] = useState<Summary>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsPagination, setPayoutsPagination] =
    useState<PaginatedResource>();
  const [method, setMethod] = useState<PayoutMethod>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string>();
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [salesResponse, payoutsResponse] = await Promise.all([
        apiClient.get('/api/v1/items/sales'),
        apiClient.get(`/api/v1/items/payout-requests?page=${page}`),
      ]);
      const sales = salesResponse.data;
      setSummary(sales.summary);
      setOrders(sales.orders?.data ?? []);
      setPayouts(payoutsResponse.data.data ?? []);
      setPayoutsPagination(payoutsResponse.data);
      // payout-method may 404 if the creator hasn't set one up yet
      try {
        const methodResponse = await apiClient.get(
          '/api/v1/items/payout-method',
        );
        setMethod(methodResponse.data.data ?? undefined);
      } catch {
        setMethod(undefined);
      }
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = summary?.currency ?? 'ETB';
  const available = summary?.available_for_payout_cents ?? 0;

  const requestPayout = async () => {
    setRequesting(true);
    setWithdrawError(undefined);
    try {
      await apiClient.post('/api/v1/items/payout-requests', {
        amount_cents: available,
      });
      setWithdrawOpen(false);
      await load();
    } catch (reason) {
      setWithdrawError(getApiErrorMessage(reason, 'amount_cents'));
    } finally {
      setRequesting(false);
    }
  };

  const cancelPayout = async (payout: Payout) => {
    setError(undefined);
    try {
      await apiClient.post(
        `/api/v1/items/payout-requests/${payout.id}/cancel`,
      );
      await load();
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Sales & Payouts" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCwIcon />
          <span className="hidden sm:inline">
            <Trans message="Refresh" />
          </span>
        </Button>
        <Button disabled={loading} onClick={() => setWithdrawOpen(true)}>
          <BanknoteArrowUpIcon />
          <Trans message="Withdraw" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <CircleAlertIcon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">{error}</span>
              <Button
                size="sm"
                variant="outline"
                color="danger"
                onClick={() => void load()}
              >
                <Trans message="Retry" />
              </Button>
            </div>
          )}

          <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={LandmarkIcon}
              tone="text-amber-600 bg-amber-500/10 dark:text-amber-400"
              label="Available balance"
              scope="Ready to withdraw"
              valueInCents={available}
              currency={currency}
              loading={loading}
            />
            <StatCard
              icon={Clock3Icon}
              tone="text-muted-foreground bg-muted"
              label="Pending withdrawals"
              scope="Processing"
              valueInCents={summary?.reserved_payout_cents ?? 0}
              currency={currency}
              loading={loading}
            />
            <StatCard
              icon={CheckCircleIcon}
              tone="text-positive bg-positive/10"
              label="Total withdrawn"
              scope="All time"
              valueInCents={summary?.paid_out_cents ?? 0}
              currency={currency}
              loading={loading}
            />
          </section>

          <SalesTable orders={orders} loading={loading} />
          <PayoutHistory
            payouts={payouts}
            loading={loading}
            pagination={payoutsPagination}
            onPageChange={setPage}
            onCancel={payout => void cancelPayout(payout)}
          />
        </div>
      </DashboardLayout.SectionContent>

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        method={method}
        available={available}
        currency={currency}
        requesting={requesting}
        error={withdrawError}
        onConfirm={() => void requestPayout()}
      />
    </DashboardLayout.MainSection>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  scope,
  valueInCents,
  currency,
  loading,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  scope: string;
  valueInCents: number;
  currency: string;
  loading: boolean;
}) {
  return (
    <Card size="sm" className="min-h-32 gap-3">
      <Card.Header>
        <Card.Title className="truncate text-sm font-normal text-muted-foreground">
          <Trans message={label} />
        </Card.Title>
        <Card.Description className="text-xs">
          <Trans message={scope} />
        </Card.Description>
        <Card.Action>
          <span
            className={`flex size-9 items-center justify-center rounded-card-sm [&>svg]:size-4 ${tone}`}
          >
            <Icon aria-hidden="true" />
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
            <FormattedCurrency
              valueInCents={valueInCents}
              currency={currency.toUpperCase()}
            />
          </p>
        )}
      </Card.Content>
    </Card>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Trans message="Track your digital product sales and withdraw your creator earnings. Payouts are sent to your configured withdrawal method." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SalesTable({orders, loading}: {orders: Order[]; loading: boolean}) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <Trans message="Recent sales" />
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="overflow-x-auto">
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
                  <Trans message="You earned" />
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {loading ? (
                <LoadingRows colSpan={3} />
              ) : orders.length ? (
                orders.slice(0, 10).map(order => (
                  <Table.Row key={order.id}>
                    <Table.Cell className="font-medium">
                      {order.product?.title ?? (
                        <Trans message="Digital product" />
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      <FormattedDate
                        date={order.paid_at ?? order.created_at}
                        preset="short"
                      />
                    </Table.Cell>
                    <Table.Cell className="text-end font-medium">
                      <FormattedCurrency
                        valueInCents={order.creator_earnings_cents}
                        currency={order.currency.toUpperCase()}
                      />
                    </Table.Cell>
                  </Table.Row>
                ))
              ) : (
                <Table.Row>
                  <Table.Cell colSpan={3}>
                    <TableEmptyState
                      icon={InboxIcon}
                      message="No sales yet"
                      description="Your recent digital product sales will appear here."
                    />
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function PayoutHistory({
  payouts,
  loading,
  pagination,
  onPageChange,
  onCancel,
}: {
  payouts: Payout[];
  loading: boolean;
  pagination?: PaginatedResource;
  onPageChange: (page: number) => void;
  onCancel: (payout: Payout) => void;
}) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <Trans message="Payout history" />
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="overflow-x-auto">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>
                  <Trans message="Requested" />
                </Table.Head>
                <Table.Head>
                  <Trans message="Method" />
                </Table.Head>
                <Table.Head>
                  <Trans message="Status" />
                </Table.Head>
                <Table.Head className="text-end">
                  <Trans message="Amount" />
                </Table.Head>
                <Table.Head>
                  <span className="sr-only">
                    <Trans message="Actions" />
                  </span>
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {loading ? (
                <LoadingRows colSpan={5} />
              ) : payouts.length ? (
                payouts.map(payout => (
                  <Table.Row key={payout.id}>
                    <Table.Cell>
                      <FormattedDate date={payout.created_at} preset="short" />
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground">
                      {payout.withdrawal_method_name ??
                        payout.payout_method_label ?? (
                          <Trans message="Not specified" />
                        )}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={payout.status} />
                    </Table.Cell>
                    <Table.Cell className="text-end font-medium">
                      <FormattedCurrency
                        valueInCents={payout.amount_cents}
                        currency={payout.currency.toUpperCase()}
                      />
                    </Table.Cell>
                    <Table.Cell className="text-end">
                      {payout.status === 'requested' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancel(payout)}
                        >
                          <Trans message="Cancel" />
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))
              ) : (
                <Table.Row>
                  <Table.Cell colSpan={5}>
                    <TableEmptyState
                      icon={BanknoteArrowUpIcon}
                      message="No payout requests yet"
                      description="Your withdrawal requests will appear here once you make one."
                    />
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </div>
        {pagination && (
          <BackendPagination
            response={pagination}
            onPageChange={onPageChange}
          />
        )}
      </Card.Content>
    </Card.Root>
  );
}

function StatusBadge({status}: {status: PayoutStatus}) {
  const config: Record<
    PayoutStatus,
    {variant: 'outline' | 'positive' | 'destructive'; Icon: LucideIcon}
  > = {
    requested: {variant: 'outline', Icon: Clock3Icon},
    processing: {variant: 'outline', Icon: RefreshCwIcon},
    paid: {variant: 'positive', Icon: CheckCircleIcon},
    rejected: {variant: 'destructive', Icon: TriangleAlertIcon},
    cancelled: {variant: 'destructive', Icon: BanIcon},
  };
  const {variant, Icon} = config[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      <Trans message={statusLabels[status]} />
    </Badge>
  );
}

function LoadingRows({colSpan}: {colSpan: number}) {
  return (
    <>
      {Array.from({length: 5}, (_, index) => (
        <Table.Row key={index}>
          <Table.Cell colSpan={colSpan}>
            <Skeleton className="h-6 w-full" />
          </Table.Cell>
        </Table.Row>
      ))}
    </>
  );
}

function TableEmptyState({
  icon: Icon,
  message,
  description,
}: {
  icon: LucideIcon;
  message: string;
  description: string;
}) {
  return (
    <Empty.Root className="border-none py-8">
      <Empty.Header>
        <Empty.Media variant="icon">
          <Icon />
        </Empty.Media>
        <Empty.Title>
          <Trans message={message} />
        </Empty.Title>
        <Empty.Description>
          <Trans message={description} />
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}

function WithdrawDialog({
  open,
  onOpenChange,
  method,
  available,
  currency,
  requesting,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method?: PayoutMethod;
  available: number;
  currency: string;
  requesting: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <BanknoteArrowUpIcon />
              <Trans message="Withdraw earnings" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            {!method ? (
              <div className="flex items-start gap-3 rounded-input border border-primary/30 bg-primary/5 p-4">
                <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    <Trans message="No payout method set up" />
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <Trans message="Add a withdrawal method in your account settings before requesting a payout." />
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    nativeButton={false}
                    render={<Link to="/account-settings/billing" />}
                  >
                    <Trans message="Set up now" />
                  </Button>
                </div>
              </div>
            ) : available <= 0 ? (
              <div className="flex items-start gap-3 rounded-input border border-warning/30 bg-warning/5 p-4">
                <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    <Trans message="Not enough balance" />
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <Trans message="You don't have enough available balance to withdraw yet. Keep selling to build up your earnings." />
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p>
                  <Trans
                    message="Withdraw :amount to :account via :method?"
                    values={{
                      amount: (
                        <FormattedCurrency
                          valueInCents={available}
                          currency={currency.toUpperCase()}
                        />
                      ),
                      account: method.account_holder,
                      method: method.display_label,
                    }}
                  />
                </p>
                {error && (
                  <div className="rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </div>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseButton variant="outline">
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            {method && available > 0 && (
              <Button disabled={requesting} onClick={onConfirm}>
                <Trans message="Confirm withdrawal" />
              </Button>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
