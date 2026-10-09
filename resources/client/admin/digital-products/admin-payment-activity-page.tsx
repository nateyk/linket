import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {apiClient} from '@common/http/query-client';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Input} from '@shadcn/forms/input/input';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Select} from '@shadcn/forms/select/select';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {formatMoney as formatMoneyFromCents} from '@ui/i18n/format-money';
import {message} from '@ui/i18n/message';
import {toast} from '@ui/toast/toast';
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDollarSignIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  EyeIcon,
  InfoIcon,
  MailCheckIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  WebhookIcon,
  WalletCardsIcon,
} from 'lucide-react';
import {ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router';

type Transaction = {
  id: number;
  uuid: string;
  tx_ref: string;
  purpose: 'digital_product' | 'subscription';
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  gateway_transaction_id?: string | null;
  buyer_name?: string | null;
  buyer_email?: string | null;
  failure_reason?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
  target: {type: string; name?: string | null; customer?: string | null};
};

type Summary = {
  total_count: number;
  paid_count: number;
  pending_count: number;
  failed_count: number;
  paid_total: number;
};

const emptySummary: Summary = {
  total_count: 0,
  paid_count: 0,
  pending_count: 0,
  failed_count: 0,
  paid_total: 0,
};

type PaymentHealth = {
  payments: {
    pending_count: number;
    failed_count: number;
    oldest_pending_at?: string | null;
  };
  queue: {
    status:
      | 'running'
      | 'inactive'
      | 'paused'
      | 'unavailable'
      | 'not_configured';
    failed_jobs_count: number;
    latest_failed_job?: {
      queue: string;
      job_class: string;
      failed_at: string;
      summary: string;
    } | null;
  };
  scheduler: {
    status: 'running' | 'inactive';
    last_heartbeat_at?: string | null;
    last_renewal_run_at?: string | null;
    last_renewal_exit_code?: number | null;
  };
  webhooks: {
    received_count_24h: number;
    failed_count_24h: number;
    latest?: {
      tx_ref?: string | null;
      signature_valid: boolean;
      status: 'rejected' | 'duplicate' | 'failed' | 'fulfilled';
      failure_reason?: string | null;
      received_at: string;
    } | null;
  };
};

export function Component() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [health, setHealth] = useState<PaymentHealth>();
  const [status, setStatus] = useState('all');
  const [purpose, setPurpose] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<Transaction>();
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const filters = useMemo(
    () => ({status, purpose, search: search.trim(), dateFrom, dateTo}),
    [purpose, search, status, dateFrom, dateTo],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    const params = new URLSearchParams();
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.purpose !== 'all') params.set('purpose', filters.purpose);
    if (filters.search) params.set('search', filters.search);
    if (filters.dateFrom) params.set('date_from', filters.dateFrom);
    if (filters.dateTo) params.set('date_to', filters.dateTo);

    try {
      const [response, healthResponse] = await Promise.all([
        apiClient.get(
          `/api/v1/admin/payment-transactions?${params.toString()}`,
        ),
        apiClient.get<PaymentHealth>('/api/v1/admin/payment-health'),
      ]);
      const payload = response.data;
      setTransactions(payload.data ?? []);
      setSummary(payload.summary ?? emptySummary);
      setHealth(healthResponse.data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to load payment activity.',
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [load, search]);

  const clearFilters = () => {
    setStatus('all');
    setPurpose('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const isFiltering =
    status !== 'all' || purpose !== 'all' || !!search || !!dateFrom || !!dateTo;

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      await apiClient.post('/api/v1/admin/payment-health/test-email');
      toast(
        message(
          'Test email queued. Check the outgoing email log after it is sent.',
        ),
      );
      void load();
    } catch {
      setError(
        'Unable to queue a test email. Check your outgoing mail settings.',
      );
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Payment activity" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/items" />}
          >
            <ArrowLeftIcon />
            <Trans message="Items" />
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/items/delivery-history" />}
          >
            <MailCheckIcon />
            <Trans message="Delivery history" />
          </Button>
          <Button
            variant="outline"
            onClick={() => void sendTestEmail()}
            disabled={sendingTestEmail}
          >
            <SendIcon />
            <Trans message="Send test email" />
          </Button>
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCwIcon className={loading ? 'animate-spin' : undefined} />
            <Trans message="Refresh" />
          </Button>
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-5 py-6">
          {error && (
            <Alert.Root variant="destructive" fillStyle="subtleFill">
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="All attempts"
              value={summary.total_count.toString()}
              icon={<WalletCardsIcon />}
            />
            <MetricCard
              label="Verified payments"
              value={summary.paid_count.toString()}
              icon={<CheckCircle2Icon />}
              tone="positive"
            />
            <MetricCard
              label="Needs attention"
              value={(summary.pending_count + summary.failed_count).toString()}
              icon={<CircleAlertIcon />}
              tone="warning"
            />
            <MetricCard
              label="Verified revenue"
              value={formatMoney(summary.paid_total, 'ETB')}
              icon={<CircleDollarSignIcon />}
            />
          </div>

          <PaymentHealthPanel health={health} />

          <Card.Root>
            <Card.Header className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title>
                  <Trans message="Transactions" />
                </Card.Title>
              </div>
              {isFiltering && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  <Trans message="Clear filters" />
                </Button>
              )}
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search reference, customer, or Chapa ID"
                    className="ps-9"
                  />
                </div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={event => setDateFrom(event.target.value)}
                  placeholder="From"
                  className="w-full sm:w-40"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={event => setDateTo(event.target.value)}
                  placeholder="To"
                  className="w-full sm:w-40"
                />
                <Select.Root
                  value={status}
                  onValueChange={value => setStatus(String(value))}
                >
                  <Select.Trigger className="w-full sm:w-36">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="all">
                      <Trans message="All statuses" />
                    </Select.Item>
                    <Select.Item value="paid">
                      <Trans message="Paid" />
                    </Select.Item>
                    <Select.Item value="pending">
                      <Trans message="Pending" />
                    </Select.Item>
                    <Select.Item value="failed">
                      <Trans message="Failed" />
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
                <Select.Root
                  value={purpose}
                  onValueChange={value => setPurpose(String(value))}
                >
                  <Select.Trigger className="w-full sm:w-44">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="all">
                      <Trans message="All payment types" />
                    </Select.Item>
                    <Select.Item value="digital_product">
                      <Trans message="Items" />
                    </Select.Item>
                    <Select.Item value="subscription">
                      <Trans message="Subscriptions" />
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <div className="overflow-x-auto rounded-card border">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head className="w-16">
                        <Trans message="ID" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Reference" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Customer & target" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Amount" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Status" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Created" />
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
                      <LoadingRows />
                    ) : transactions.length ? (
                      transactions.map(transaction => (
                        <Table.Row key={transaction.uuid}>
                          <Table.Cell className="font-mono text-xs text-muted-foreground">
                            {transaction.id}
                          </Table.Cell>
                          <Table.Cell>
                            <p className="font-medium">
                              <TransactionType transaction={transaction} />
                            </p>
                            <p
                              className="max-w-52 truncate font-mono text-xs text-muted-foreground"
                              title={transaction.tx_ref}
                            >
                              {transaction.tx_ref}
                            </p>
                          </Table.Cell>
                          <Table.Cell>
                            <p className="max-w-56 truncate font-medium">
                              {transaction.target.name ?? (
                                <Trans message="Unavailable target" />
                              )}
                            </p>
                            <p className="max-w-56 truncate text-xs text-muted-foreground">
                              {transaction.target.customer ??
                                transaction.buyer_email ?? (
                                  <Trans message="No customer email" />
                                )}
                            </p>
                          </Table.Cell>
                          <Table.Cell className="font-medium">
                            {formatMoney(
                              transaction.amount,
                              transaction.currency,
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <StatusBadge status={transaction.status} />
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap text-muted-foreground">
                            {transaction.created_at ? (
                              formatDate(transaction.created_at)
                            ) : (
                              <Trans message="—" />
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex justify-end">
                              <Dropdown.Root>
                                <Dropdown.Trigger
                                  aria-label="Actions"
                                  render={
                                    <Button variant="ghost" size="icon-sm" />
                                  }
                                >
                                  <EllipsisVerticalIcon />
                                </Dropdown.Trigger>
                                <Dropdown.Content align="end">
                                  <Dropdown.Item
                                    onSelect={() => setSelected(transaction)}
                                  >
                                    <EyeIcon className="size-4" />
                                    <Trans message="View details" />
                                  </Dropdown.Item>
                                </Dropdown.Content>
                              </Dropdown.Root>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    ) : (
                      <Table.Row>
                        <Table.Cell colSpan={7} className="h-44 text-center">
                          <p className="font-medium">
                            {isFiltering ? (
                              <Trans message="No matching transactions" />
                            ) : (
                              <Trans message="No Chapa transactions yet" />
                            )}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {isFiltering ? (
                              <Trans message="Try a different search or filter." />
                            ) : (
                              <Trans message="Completed checkouts will appear here after payment verification." />
                            )}
                          </p>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              </div>
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      <TransactionDetails
        transaction={selected}
        onClose={() => setSelected(undefined)}
      />
    </DashboardLayout.MainSection>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'default' | 'positive' | 'warning';
}) {
  const iconClass =
    tone === 'positive'
      ? 'text-positive bg-positive/10'
      : tone === 'warning'
        ? 'text-amber-600 bg-amber-500/10 dark:text-amber-400'
        : 'text-muted-foreground bg-muted';
  return (
    <Card size="sm" className="gap-3">
      <Card.Header>
        <Card.Title className="truncate text-sm font-normal text-muted-foreground">
          <Trans message={label} />
        </Card.Title>
        <Card.Action>
          <span
            className={`flex size-9 items-center justify-center rounded-card-sm [&>svg]:size-4 ${iconClass}`}
          >
            {icon}
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </Card.Content>
    </Card>
  );
}

function PaymentHealthPanel({health}: {health?: PaymentHealth}) {
  if (!health) {
    return null;
  }

  const webhookTone = health.webhooks.failed_count_24h ? 'warning' : 'positive';
  const schedulerTone =
    health.scheduler.status === 'running' ? 'positive' : 'warning';
  const queueTone = health.queue.status === 'running' ? 'positive' : 'warning';

  return (
    <Card.Root>
      <Card.Header className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Card.Title>
            <Trans message="Payment health" />
          </Card.Title>
          <Card.Description>
            <Trans message="Live operational signals for payment fulfillment. No payment can be marked paid here." />
          </Card.Description>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<a href="/horizon" target="_blank" rel="noreferrer" />}
          >
            <Trans message="Open Horizon" />
            <ExternalLinkIcon />
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/logs/schedule" />}
          >
            <Trans message="Schedule log" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/logs/outgoing-email" />}
          >
            <Trans message="Email log" />
          </Button>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard
          label="Queue worker"
          icon={<MailCheckIcon />}
          tone={queueTone}
          value={queueStatusLabel(health.queue.status)}
          description={
            health.queue.failed_jobs_count
              ? `${health.queue.failed_jobs_count} failed job${health.queue.failed_jobs_count === 1 ? '' : 's'}`
              : 'No failed jobs'
          }
        />
        <HealthCard
          label="Scheduler"
          icon={<CalendarClockIcon />}
          tone={schedulerTone}
          value={health.scheduler.status === 'running' ? 'Running' : 'Inactive'}
          description={
            health.scheduler.last_heartbeat_at
              ? `Heartbeat ${formatDate(health.scheduler.last_heartbeat_at)}`
              : 'No recent heartbeat'
          }
        />
        <HealthCard
          label="Chapa webhooks"
          icon={<WebhookIcon />}
          tone={webhookTone}
          value={`${health.webhooks.received_count_24h} today`}
          description={
            health.webhooks.latest
              ? webhookStatusLabel(
                  health.webhooks.latest.status,
                  health.webhooks.latest.failure_reason,
                )
              : 'No webhook deliveries yet'
          }
        />
        <HealthCard
          label="Payment attention"
          icon={<CircleAlertIcon />}
          tone={
            health.payments.pending_count || health.payments.failed_count
              ? 'warning'
              : 'positive'
          }
          value={`${health.payments.pending_count + health.payments.failed_count}`}
          description={
            health.payments.failed_count
              ? `${health.payments.failed_count} failed payment${health.payments.failed_count === 1 ? '' : 's'}`
              : 'No failed payments'
          }
        />
      </Card.Content>
    </Card.Root>
  );
}

function HealthCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone: 'positive' | 'warning';
}) {
  const iconClass =
    tone === 'positive'
      ? 'text-positive bg-positive/10'
      : 'text-amber-600 bg-amber-500/10 dark:text-amber-400';
  return (
    <div className="rounded-card border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Trans message={label} />
          </p>
          <p className="mt-1 font-semibold tracking-tight">
            <Trans message={value} />
          </p>
        </div>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-card-sm [&>svg]:size-4 ${iconClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        <Trans message={description} />
      </p>
    </div>
  );
}

function queueStatusLabel(status: PaymentHealth['queue']['status']) {
  return status === 'running'
    ? 'Running'
    : status === 'paused'
      ? 'Paused'
      : status === 'not_configured'
        ? 'Not configured'
        : status === 'unavailable'
          ? 'Unavailable'
          : 'Inactive';
}

function webhookStatusLabel(
  status: NonNullable<PaymentHealth['webhooks']['latest']>['status'],
  reason?: string | null,
) {
  if (status === 'fulfilled') return 'Latest payment fulfilled';
  if (status === 'duplicate') return 'Latest delivery already processed';
  if (status === 'rejected')
    return reason === 'invalid_signature'
      ? 'Latest signature rejected'
      : 'Latest delivery rejected';
  return 'Latest verification failed';
}

function LoadingRows() {
  return (
    <>
      {Array.from({length: 5}, (_, index) => (
        <Table.Row key={index}>
          <Table.Cell colSpan={7}>
            <div className="h-7 animate-pulse rounded-input bg-muted" />
          </Table.Cell>
        </Table.Row>
      ))}
    </>
  );
}

function TransactionType({transaction}: {transaction: Transaction}) {
  return (
    <Trans
      message={
        transaction.purpose === 'digital_product'
          ? 'Digital product'
          : 'Subscription'
      }
    />
  );
}

function StatusBadge({status}: {status: Transaction['status']}) {
  if (status === 'paid')
    return (
      <Badge variant="positive">
        <Trans message="Paid" />
      </Badge>
    );
  if (status === 'failed')
    return (
      <Badge variant="destructive">
        <Trans message="Failed" />
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Trans message="Pending" />
    </Badge>
  );
}

function TransactionDetails({
  transaction,
  onClose,
}: {
  transaction?: Transaction;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={!!transaction} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-lg">
          <Dialog.Header>
            <Dialog.Title>
              <WalletCardsIcon />
              <Trans message="Transaction details" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Safe payment identifiers and verification state for this checkout attempt." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            {transaction && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-input bg-muted/60 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      <Trans message="Status" />
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={transaction.status} />
                    </div>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatMoney(transaction.amount, transaction.currency)}
                  </p>
                </div>
                <DetailRow label="Payment type">
                  <TransactionType transaction={transaction} />
                </DetailRow>
                <DetailRow label="Target">
                  {transaction.target.name ?? (
                    <Trans message="Unavailable target" />
                  )}
                </DetailRow>
                <DetailRow label="Customer">
                  {transaction.buyer_name ??
                    transaction.target.customer ??
                    transaction.buyer_email ?? (
                      <Trans message="No customer email" />
                    )}
                </DetailRow>
                <DetailRow label="Linket reference" mono>
                  {transaction.tx_ref}
                </DetailRow>
                <DetailRow label="Chapa transaction ID" mono>
                  {transaction.gateway_transaction_id ?? (
                    <Trans message="Awaiting verification" />
                  )}
                </DetailRow>
                <DetailRow label="Created">
                  {transaction.created_at ? (
                    formatDate(transaction.created_at)
                  ) : (
                    <Trans message="—" />
                  )}
                </DetailRow>
                <DetailRow label="Verified">
                  {transaction.verified_at ? (
                    formatDate(transaction.verified_at)
                  ) : (
                    <Trans message="Not verified yet" />
                  )}
                </DetailRow>
                {transaction.status !== 'paid' && (
                  <PaymentGuidance transaction={transaction} />
                )}
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

function PaymentGuidance({transaction}: {transaction: Transaction}) {
  return (
    <Alert.Root variant="warning" fillStyle="subtleFill">
      <Alert.Title>
        <Trans message="Safe next step" />
      </Alert.Title>
      <Alert.Description>
        {transaction.status === 'pending' ? (
          <Trans message="Waiting for Chapa verification. Check the reference in Chapa and allow the signed webhook or callback to finish processing." />
        ) : transaction.failure_reason === 'payment_initialization_failed' ||
          transaction.failure_reason === 'missing_checkout_url' ? (
          <Trans message="Checkout could not be initialized. Ask the customer to begin a fresh checkout." />
        ) : (
          <Trans message="Payment verification did not match the expected reference, amount, or ETB currency. Review the Chapa reference before asking the customer to start again." />
        )}
      </Alert.Description>
      <Alert.Description className="text-xs">
        <Trans message="Do not grant access manually. Only verified Chapa payments can unlock purchases." />
      </Alert.Description>
    </Alert.Root>
  );
}

function DetailRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <p className="text-sm text-muted-foreground">
        <Trans message={label} />
      </p>
      <div
        className={mono ? 'font-mono text-xs leading-5 break-all' : 'text-sm'}
      >
        {children}
      </div>
    </div>
  );
}


function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

// amounts from the payments API are in main units (e.g. 234.50), convert to cents
// before delegating to the shared formatter
function formatMoney(amount: number, currency: string) {
  return formatMoneyFromCents(amount * 100, currency);
}

function InfoTrigger() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Review Chapa checkout attempts and their verified payment state. Only Chapa verification can change a payment to paid."
          />
        }
      >
        <InfoIcon className="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message="Review Chapa checkout attempts and their verified payment state. Only Chapa verification can change a payment to paid." />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
