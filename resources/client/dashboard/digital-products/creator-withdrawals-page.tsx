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
  CircleHelpIcon,
  Clock3Icon,
  EyeIcon,
  InboxIcon,
  LandmarkIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  BanIcon,
  type LucideIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

export type Summary = {
  gross_sales_cents: number;
  creator_earnings_cents: number;
  available_for_payout_cents: number;
  held_earnings_cents: number;
  reserved_payout_cents: number;
  paid_out_cents: number;
  lifetime_earnings_cents: number;
  balance_reconciliation_required?: boolean;
  minimum_withdrawal_cents?: number;
  payout_hold_days?: number;
  currency: string;
};

export type PayoutStatus =
  | 'requested'
  | 'processing'
  | 'provider_pending'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export type PayoutActivity = {
  id: number;
  action: string;
  note?: string | null;
  created_at: string;
  actor?: {name: string} | null;
};

export type Payout = {
  id: number;
  amount_cents: number;
  currency: string;
  status: PayoutStatus;
  payout_method_label?: string | null;
  withdrawal_method_name?: string | null;
  created_at: string;
  paid_at?: string | null;
  rejection_reason?: string | null;
  activities?: PayoutActivity[];
};

export type PayoutDestination = {
  id: number;
  type: string;
  bank_code?: string | null;
  bank_name?: string | null;
  account_holder: string;
  destination: string;
  account_number_last_four?: string | null;
  display_label: string;
  is_active: boolean;
  is_default: boolean;
  status?: string;
  approved_at?: string | null;
  withdrawal_method?: {
    code: string;
    is_active: boolean;
    minimum_amount_cents?: number | null;
    maximum_amount_cents?: number | null;
  } | null;
};

const isApprovedDestination = (destination: PayoutDestination): boolean =>
  destination.is_active && destination.status === 'active' && !!destination.approved_at &&
  destination.withdrawal_method?.is_active === true &&
  ['cbebirr', 'cbe', 'mpesa', 'telebirr', 'yaya'].includes((destination.bank_code ?? '').toLowerCase());

const statusLabels: Record<PayoutStatus, string> = {
  requested: 'Requested',
  processing: 'Processing Settlement',
  provider_pending: 'Processing Settlement',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function Component() {
  const [summary, setSummary] = useState<Summary>();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsPagination, setPayoutsPagination] = useState<PaginatedResource>();
  const [destinations, setDestinations] = useState<PayoutDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [detailsPayout, setDetailsPayout] = useState<Payout | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [salesRes, payoutsRes, destsRes] = await Promise.all([
        apiClient.get('/api/v1/items/sales'),
        apiClient.get(`/api/v1/items/payout-requests?page=${page}`),
        apiClient.get('/api/v1/items/payout-methods'),
      ]);
      setSummary(salesRes.data.summary);
      setPayouts(payoutsRes.data.data ?? []);
      setPayoutsPagination(payoutsRes.data);
      setDestinations(destsRes.data.data ?? []);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currency = summary?.currency ?? 'ETB';
  const available = summary?.available_for_payout_cents ?? 0;
  const hasApprovedDestination = destinations.some(isApprovedDestination);
  const minimumWithdrawalCents = summary?.minimum_withdrawal_cents ?? 100;

  const handleCancel = async (payout: Payout) => {
    setError(undefined);
    try {
      await apiClient.post(`/api/v1/items/payout-requests/${payout.id}/cancel`);
      await loadData();
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Withdrawals" />
          <WithdrawalsInfoTrigger />
        </DashboardLayout.SectionTitle>
        <Button variant="outline" disabled={loading} onClick={() => void loadData()}>
          <RefreshCwIcon />
          <span className="hidden sm:inline">
            <Trans message="Refresh" />
          </span>
        </Button>
        <Button disabled={loading || !summary} onClick={() => setWithdrawOpen(true)}>
          <BanknoteArrowUpIcon />
          <Trans message="Request withdrawal" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
          {error && <WithdrawalsAlert message={error} onRetry={() => void loadData()} />}
          {summary?.balance_reconciliation_required && (
            <p role="status" className="rounded-card-sm border border-border px-4 py-3 text-sm text-muted-foreground">
              <Trans message="Some historical earnings or pending withdrawals still need ledger reconciliation. Only cleared Chapa funds are eligible for withdrawal." />
            </p>
          )}
          <WithdrawalStatCards summary={summary} available={available} currency={currency} loading={loading} />
          {!loading && summary && (
            <WithdrawalReadinessNotice
              available={available}
              held={summary.held_earnings_cents}
              hasApprovedDestination={hasApprovedDestination}
              hasPayoutAccounts={destinations.length > 0}
              minimumWithdrawalCents={minimumWithdrawalCents}
              currency={currency}
            />
          )}
          <WithdrawalHistoryTable
            payouts={payouts}
            loading={loading}
            pagination={payoutsPagination}
            onPageChange={setPage}
            onViewDetails={setDetailsPayout}
            onCancel={payout => void handleCancel(payout)}
          />
        </div>
      </DashboardLayout.SectionContent>
      <RequestWithdrawalModal
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        available={available}
        currency={currency}
        minimumWithdrawalCents={minimumWithdrawalCents}
        destinations={destinations}
        onSuccess={async () => {
          setWithdrawOpen(false);
          await loadData();
        }}
      />
      <WithdrawalDetailsDialog payout={detailsPayout} onClose={() => setDetailsPayout(null)} />
    </DashboardLayout.MainSection>
  );
}

function WithdrawalsInfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            type="button"
            aria-label="How Linket withdrawals work"
            className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2"
          />
        }
      >
        <CircleHelpIcon className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="max-w-xs text-xs">
          <p className="font-semibold">
            <Trans message="Marketplace Withdrawals" />
          </p>
          <p className="mt-1 text-muted-foreground">
            <Trans message="Buyers pay directly to Linket. Once sales clear the hold period, proceeds become available for withdrawal to your saved bank or mobile wallet." />
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function WithdrawalsAlert({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <CircleAlertIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <Button size="sm" variant="outline" color="danger" onClick={onRetry}>
        <Trans message="Retry" />
      </Button>
    </div>
  );
}

function WithdrawalReadinessNotice({
  available,
  held,
  hasApprovedDestination,
  hasPayoutAccounts,
  minimumWithdrawalCents,
  currency,
}: {
  available: number;
  held: number;
  hasApprovedDestination: boolean;
  hasPayoutAccounts: boolean;
  minimumWithdrawalCents: number;
  currency: string;
}) {
  if (available >= minimumWithdrawalCents && hasApprovedDestination) return null;

  return (
    <div role="status" className="flex items-start gap-3 rounded-card-sm border border-border px-4 py-3 text-sm">
      <CircleHelpIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 space-y-1 text-muted-foreground">
        {available <= 0 && (
          <p>
            {held > 0 ? (
              <Trans message="Your verified earnings are currently held. They can be withdrawn only after the payout hold period and ledger reconciliation." />
            ) : (
              <Trans message="There are no cleared earnings available yet. Check that your Chapa order is paid and belongs to this creator account." />
            )}{' '}
            <Link to="/dashboard/orders" className="font-medium text-primary underline underline-offset-2">
              <Trans message="Review Orders & Sales" />
            </Link>
          </p>
        )}
        {available > 0 && available < minimumWithdrawalCents && (
          <p>
            <Trans message="Your available earnings are below the platform minimum withdrawal of" />{' '}
            <FormattedCurrency value={minimumWithdrawalCents / 100} currency={currency} />.
          </p>
        )}
        {!hasApprovedDestination && (
          <p>
            {hasPayoutAccounts ? (
              <Trans message="Your payout account must be approved by an administrator and its provider enabled. Default does not mean approved." />
            ) : (
              <Trans message="Add a receiving account and obtain administrator approval before requesting a withdrawal." />
            )}{' '}
            <Link to="/account-settings/receiving-accounts" className="font-medium text-primary underline underline-offset-2">
              <Trans message="Review payout accounts" />
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function WithdrawalStatCards({
  summary,
  available,
  currency,
  loading,
}: {
  summary?: Summary;
  available: number;
  currency: string;
  loading: boolean;
}) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <WithdrawalMetricCard
        icon={LandmarkIcon}
        label="Available Balance"
        valueInCents={available}
        currency={currency}
        loading={loading}
      />
      <WithdrawalMetricCard
        icon={LockKeyholeIcon}
        label="Held earnings"
        valueInCents={summary?.held_earnings_cents ?? 0}
        currency={currency}
        loading={loading}
      />
      <WithdrawalMetricCard
        icon={Clock3Icon}
        label="Pending withdrawals"
        valueInCents={summary?.reserved_payout_cents ?? 0}
        currency={currency}
        loading={loading}
      />
      <WithdrawalMetricCard
        icon={CheckCircleIcon}
        label="Paid out"
        valueInCents={summary?.paid_out_cents ?? 0}
        currency={currency}
        loading={loading}
      />
    </section>
  );
}

function WithdrawalMetricCard({
  icon: Icon,
  label,
  valueInCents,
  currency,
  loading,
}: {
  icon: LucideIcon;
  label: string;
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
        <Card.Action>
          <span className="flex size-9 items-center justify-center rounded-card-sm bg-muted text-muted-foreground [&>svg]:size-4">
            <Icon aria-hidden="true" />
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="truncate text-2xl font-bold tracking-tight">
            <FormattedCurrency value={valueInCents / 100} currency={currency} />
          </p>
        )}
      </Card.Content>
    </Card>
  );
}

function WithdrawalHistoryTable({
  payouts,
  loading,
  pagination,
  onPageChange,
  onViewDetails,
  onCancel,
}: {
  payouts: Payout[];
  loading: boolean;
  pagination?: PaginatedResource;
  onPageChange: (page: number) => void;
  onViewDetails: (payout: Payout) => void;
  onCancel: (payout: Payout) => void;
}) {
  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Withdrawal history" />
        </Card.Title>
        <Card.Description>
          <Trans message="Review all requested and settled disbursements" />
        </Card.Description>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head><Trans message="Request" /></Table.Head>
              <Table.Head><Trans message="Amount" /></Table.Head>
              <Table.Head><Trans message="Destination" /></Table.Head>
              <Table.Head><Trans message="Date requested" /></Table.Head>
              <Table.Head><Trans message="Status" /></Table.Head>
              <Table.Head><Trans message="Date settled" /></Table.Head>
              <Table.Head className="text-right"><Trans message="Actions" /></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading && <LoadingRows colSpan={7} />}
            {!loading && payouts.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={7} className="p-0">
                  <TableEmptyState
                    icon={InboxIcon}
                    message="You do not have any withdrawals"
                    description="When you have withdrawal requests, you will be able to see them here."
                  />
                </Table.Cell>
              </Table.Row>
            )}
            {!loading && payouts.map(p => (
              <Table.Row key={p.id}>
                <Table.Cell className="font-mono text-xs">#{p.id}</Table.Cell>
                <Table.Cell className="font-medium">
                  <FormattedCurrency value={p.amount_cents / 100} currency={p.currency} />
                </Table.Cell>
                <Table.Cell className="text-xs text-muted-foreground">
                  {p.payout_method_label || p.withdrawal_method_name || '—'}
                </Table.Cell>
                <Table.Cell className="text-xs">
                  <FormattedDate date={p.created_at} />
                </Table.Cell>
                <Table.Cell><PayoutStatusBadge status={p.status} /></Table.Cell>
                <Table.Cell className="text-xs text-muted-foreground">
                  {p.paid_at ? <FormattedDate date={p.paid_at} /> : '—'}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="xs" variant="ghost" onClick={() => onViewDetails(p)}>
                      <EyeIcon className="size-3.5" />
                      <span className="sr-only"><Trans message="View details" /></span>
                    </Button>
                    {p.status === 'requested' && (
                      <Button size="xs" variant="outline" color="danger" onClick={() => onCancel(p)}>
                        <Trans message="Cancel" />
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Card.Content>
      {pagination && (pagination.links?.next != null || pagination.links?.prev != null) && (
        <Card.Footer className="justify-end border-t pt-3">
          <BackendPagination response={pagination} onPageChange={onPageChange} />
        </Card.Footer>
      )}
    </Card>
  );
}

function PayoutStatusBadge({status}: {status: PayoutStatus}) {
  const config: Record<PayoutStatus, {variant: 'outline' | 'positive' | 'destructive'; Icon: LucideIcon}> = {
    requested: {variant: 'outline', Icon: Clock3Icon},
    processing: {variant: 'outline', Icon: RefreshCwIcon},
    provider_pending: {variant: 'outline', Icon: RefreshCwIcon},
    paid: {variant: 'positive', Icon: CheckCircleIcon},
    rejected: {variant: 'destructive', Icon: TriangleAlertIcon},
    cancelled: {variant: 'destructive', Icon: BanIcon},
  };
  const {variant, Icon} = config[status] ?? {variant: 'outline', Icon: Clock3Icon};
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      <Trans message={statusLabels[status] ?? status} />
    </Badge>
  );
}

function LoadingRows({colSpan}: {colSpan: number}) {
  return (
    <>
      {Array.from({length: 4}, (_, index) => (
        <Table.Row key={index}>
          <Table.Cell colSpan={colSpan}>
            <Skeleton className="h-6 w-full" />
          </Table.Cell>
        </Table.Row>
      ))}
    </>
  );
}

function TableEmptyState({icon: Icon, message, description}: {icon: LucideIcon; message: string; description: string}) {
  return (
    <Empty.Root className="rounded-none border-none py-8">
      <Empty.Header>
        <Empty.Media variant="icon"><Icon /></Empty.Media>
        <Empty.Title><Trans message={message} /></Empty.Title>
        <Empty.Description><Trans message={description} /></Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}

function RequestWithdrawalModal({
  open,
  onOpenChange,
  available,
  currency,
  destinations,
  onSuccess,
  minimumWithdrawalCents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: number;
  currency: string;
  destinations: PayoutDestination[];
  onSuccess: () => Promise<void>;
  minimumWithdrawalCents: number;
}) {
  const approvedDestinations = destinations.filter(isApprovedDestination);
  const defaultDest = approvedDestinations.find(d => d.is_default) ?? approvedDestinations[0];
  const [selectedDestId, setSelectedDestId] = useState<number | null>(null);
  const [amountStr, setAmountStr] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    if (open) {
      setSelectedDestId(defaultDest?.id ?? null);
      const limit = defaultDest?.withdrawal_method?.maximum_amount_cents;
      setAmountStr((Math.min(available, limit || available) / 100).toFixed(2));
      setSubmitError(undefined);
    }
  }, [open, defaultDest, available]);

  const activeDestinations = approvedDestinations;
  const selectedDest = approvedDestinations.find(d => d.id === selectedDestId);
  const methodMinCents = selectedDest?.withdrawal_method?.minimum_amount_cents ?? 0;
  const methodMaxCents = selectedDest?.withdrawal_method?.maximum_amount_cents;
  const minimumCents = Math.max(100, minimumWithdrawalCents, methodMinCents);
  const maximumCents = Math.min(available, methodMaxCents || available);
  const amountCents = Math.round((parseFloat(amountStr) || 0) * 100);
  const isValidAmount = !!selectedDest && amountCents >= minimumCents &&
    amountCents <= maximumCents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestId || !isValidAmount) return;

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await apiClient.post('/api/v1/items/payout-requests', {
        amount_cents: amountCents,
        payout_method_id: selectedDestId,
      });
      await onSuccess();
    } catch (reason) {
      setSubmitError(getApiErrorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <BanknoteArrowUpIcon />
              <Trans message="Request withdrawal" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            {activeDestinations.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-card border border-primary/20 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-primary">
                  <Trans message="No approved payout account" />
                </p>
                <p className="text-muted-foreground">
                  <Trans message="Add a bank or mobile wallet and have the account approved before requesting a withdrawal." />
                </p>
                <Button
                  variant="default"
                  size="sm"
                  nativeButton={false}
                  render={<Link to="/account-settings/receiving-accounts" />}
                >
                  <Trans message="Configure payout accounts" />
                </Button>
              </div>
            ) : available <= 0 ? (
              <div role="status" className="space-y-3 rounded-card-sm border border-border p-4 text-sm">
                <p className="font-semibold"><Trans message="No withdrawable balance" /></p>
                <p className="text-muted-foreground">
                  <Trans message="Your verified sales may still be held for the payout hold period. Funds must be cleared before a withdrawal can be requested." />
                </p>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/dashboard/orders" />}>
                  <Trans message="Review Orders & Sales" />
                </Button>
              </div>
            ) : (
              <form id="withdrawal-request-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="rounded-input border bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground"><Trans message="Available balance" /></span>
                    <span className="font-semibold">
                      <FormattedCurrency value={available / 100} currency={currency} />
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="withdraw-destination" className="text-xs font-medium text-muted-foreground">
                    <Trans message="Destination account" />
                  </label>
                  <select
                    id="withdraw-destination"
                    className="flex h-9 w-full rounded-input border bg-background px-3 text-sm focus-visible:outline-2"
                    value={selectedDestId ?? ''}
                    onChange={e => setSelectedDestId(Number(e.target.value))}
                    disabled={submitting}
                  >
                    {activeDestinations.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.display_label} {d.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <label htmlFor="withdraw-amount"><Trans message="Withdrawal amount (ETB)" /></label>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setAmountStr((maximumCents / 100).toFixed(2))}
                    >
                      <Trans message="Max" />
                    </button>
                  </div>
                  <input
                    id="withdraw-amount"
                    type="number"
                    step="0.01"
                    min={minimumCents / 100}
                    max={maximumCents / 100}
                    className="flex h-9 w-full rounded-input border bg-background px-3 text-sm focus-visible:outline-2"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    <Trans message="Minimum withdrawal" />: <FormattedCurrency value={minimumCents / 100} currency={currency} />
                  </p>
                </div>

                {maximumCents < minimumCents && (
                  <p role="status" className="text-xs text-muted-foreground">
                    <Trans message="The available balance is below the required minimum withdrawal." />
                  </p>
                )}

                {submitError && (
                  <p role="alert" className="text-xs text-destructive">{submitError}</p>
                )}
              </form>
            )}
          </Dialog.Body>
          <Dialog.Footer className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              <Trans message="Cancel" />
            </Button>
            {activeDestinations.length > 0 && (
              <Button
                type="submit"
                form="withdrawal-request-form"
                disabled={submitting || !isValidAmount || !selectedDestId}
              >
                {submitting ? <Trans message="Submitting…" /> : <Trans message="Confirm withdrawal" />}
              </Button>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function WithdrawalDetailsDialog({
  payout,
  onClose,
}: {
  payout: Payout | null;
  onClose: () => void;
}) {
  if (!payout) return null;

  return (
    <Dialog.Root open={!!payout} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Withdrawal request details" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-2 rounded-input border bg-muted/30 p-3">
              <div>
                <span className="text-xs text-muted-foreground"><Trans message="Request ID" /></span>
                <p className="font-mono font-medium">#{payout.id}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground"><Trans message="Amount" /></span>
                <p className="font-semibold">
                  <FormattedCurrency value={payout.amount_cents / 100} currency={payout.currency} />
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground"><Trans message="Status" /></span>
                <div className="mt-0.5"><PayoutStatusBadge status={payout.status} /></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground"><Trans message="Destination" /></span>
                <p className="text-xs font-medium">{payout.payout_method_label || '—'}</p>
              </div>
            </div>

            {payout.rejection_reason && (
              <div className="rounded-input border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <span className="font-semibold"><Trans message="Rejection reason:" /></span> {payout.rejection_reason}
              </div>
            )}

            {payout.activities && payout.activities.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground"><Trans message="Activity timeline" /></span>
                <div className="flex flex-col gap-2 border-l-2 border-muted pl-3">
                  {payout.activities.map(act => (
                    <div key={act.id} className="text-xs">
                      <p className="font-medium capitalize">{act.action.replace('_', ' ')}</p>
                      {act.note && <p className="text-muted-foreground">{act.note}</p>}
                      <span className="text-[10px] text-muted-foreground">
                        <FormattedDate date={act.created_at} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={onClose}><Trans message="Close" /></Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
