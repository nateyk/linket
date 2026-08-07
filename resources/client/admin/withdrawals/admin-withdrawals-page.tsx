import {apiClient} from '@common/http/query-client';
import {PaginatedResource} from '@common/http/backend-response/pagination-response';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  BanknoteIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  SendIcon,
  TrashIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {Link} from 'react-router';

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
  creator?: {id: number; name: string; email: string};
};

type Counter = {total: number; amount: number};

type PaginatedResponse = {
  data: Payout[];
  links?: Record<string, string | null>;
  meta?: {
    current_page: number;
    per_page: number;
    last_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
    counters?: Partial<Record<PayoutStatus, Counter>>;
    withdrawal_methods?: {id: number; name: string}[];
  };
};

const statusLabels: Record<PayoutStatus, string> = {
  requested: 'Requested',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const statusOrder: PayoutStatus[] = [
  'requested',
  'processing',
  'paid',
  'rejected',
  'cancelled',
];

export function Component() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pagination, setPagination] = useState<PaginatedResource>();
  const [meta, setMeta] = useState<PaginatedResponse['meta']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Payout>();
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({page: `${page}`, perPage: '15'});
      if (search) params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (status) params.set('status', status);
      if (method) params.set('withdrawal_method', method);
      const response = await apiClient.get(
        `/api/v1/admin/withdrawals?${params.toString()}`,
      );
      setPayouts(response.data.data ?? []);
      setPagination(response.data);
      setMeta(response.data.meta);
    } catch {
      setError('Unable to load withdrawal requests.');
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFrom, dateTo, status, method]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus('');
    setMethod('');
    setPage(1);
  };

  const destroy = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/admin/withdrawals/${deleteTarget.id}`);
      setDeleteTarget(undefined);
      await load();
    } catch {
      setError('Unable to delete this withdrawal request.');
    } finally {
      setDeleting(false);
    }
  };

  const counters = meta?.counters ?? {};
  const methods = meta?.withdrawal_methods ?? [];

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div>
          <DashboardLayout.SectionTitle>
            <Trans message="Withdrawals" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Review and manage creator withdrawal requests." />
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link to="/admin/financial/withdrawal-methods" />}
        >
          <BanknoteIcon />
          <Trans message="Withdrawal methods" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statusOrder.map(key => (
              <CounterCard
                key={key}
                status={key}
                counter={counters[key]}
                active={status === key}
                onSelect={() => {
                  setStatus(prev => (prev === key ? '' : key));
                  setPage(1);
                }}
              />
            ))}
          </div>

          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Withdrawal requests" />
              </Card.Title>
              <Card.Description>
                <Trans message="Search, filter and manage payout requests submitted by creators." />
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="mb-5 flex flex-wrap items-end gap-3">
                <Field.Root className="w-full max-w-60">
                  <Field.Label>
                    <Trans message="Search" />
                  </Field.Label>
                  <Input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitSearch()}
                    placeholder="ID, user, method, destination…"
                  />
                </Field.Root>
                <Field.Root className="w-40">
                  <Field.Label>
                    <Trans message="From" />
                  </Field.Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                  />
                </Field.Root>
                <Field.Root className="w-40">
                  <Field.Label>
                    <Trans message="To" />
                  </Field.Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                  />
                </Field.Root>
                <Field.Root className="w-44">
                  <Field.Label>
                    <Trans message="Status" />
                  </Field.Label>
                  <Select.Root
                    value={status}
                    onValueChange={value => {
                      setStatus(value ?? '');
                      setPage(1);
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value
                        placeholder={<Trans message="All statuses" />}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {statusOrder.map(key => (
                        <Select.Item key={key} value={key}>
                          <Trans message={statusLabels[key]} />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Field.Root>
                <Field.Root className="w-44">
                  <Field.Label>
                    <Trans message="Method" />
                  </Field.Label>
                  <Select.Root
                    value={method}
                    onValueChange={value => {
                      setMethod(value ?? '');
                      setPage(1);
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value
                        placeholder={<Trans message="All methods" />}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {methods.map(item => (
                        <Select.Item key={item.id} value={item.name}>
                          {item.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Field.Root>
                <div className="flex gap-2">
                  <Button color="primary" onClick={submitSearch}>
                    <Trans message="Search" />
                  </Button>
                  <Button variant="outline" onClick={resetFilters}>
                    <XIcon />
                    <Trans message="Reset" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>
                        <Trans message="ID" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Creator" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Method" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Amount" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Status" />
                      </Table.Head>
                      <Table.Head>
                        <Trans message="Requested" />
                      </Table.Head>
                      <Table.Head className="text-end">
                        <Trans message="Actions" />
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {loading ? (
                      <Table.Row>
                        <Table.Cell
                          colSpan={7}
                          className="h-28 text-center text-muted-foreground"
                        >
                          <Trans message="Loading…" />
                        </Table.Cell>
                      </Table.Row>
                    ) : payouts.length ? (
                      payouts.map(payout => (
                        <Table.Row key={payout.id}>
                          <Table.Cell className="font-mono text-sm">
                            #{payout.id}
                          </Table.Cell>
                          <Table.Cell>
                            <p className="font-medium">
                              {payout.creator?.name ?? '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payout.creator?.email}
                            </p>
                          </Table.Cell>
                          <Table.Cell className="text-muted-foreground">
                            {payout.withdrawal_method_name ??
                              payout.payout_method_label ?? (
                                <Trans message="Not specified" />
                              )}
                          </Table.Cell>
                          <Table.Cell className="font-semibold">
                            {formatMoney(payout.amount_cents, payout.currency)}
                          </Table.Cell>
                          <Table.Cell>
                            <StatusBadge status={payout.status} />
                          </Table.Cell>
                          <Table.Cell className="text-muted-foreground">
                            {formatDate(payout.created_at)}
                          </Table.Cell>
                          <Table.Cell className="text-end">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="xs"
                                variant="outline"
                                color="primary"
                                render={
                                  <Link
                                    to={`/admin/withdrawals/${payout.id}/review`}
                                  />
                                }
                              >
                                <EyeIcon />
                                <Trans message="Review" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="outline"
                                color="danger"
                                onClick={() => setDeleteTarget(payout)}
                              >
                                <TrashIcon />
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    ) : (
                      <Table.Row>
                        <Table.Cell
                          colSpan={7}
                          className="h-28 text-center text-muted-foreground"
                        >
                          <Trans message="No withdrawal requests found." />
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              </div>

              <BackendPagination
                response={{
                  data: payouts,
                  links: pagination?.links ?? {
                    first: null,
                    last: null,
                    prev: null,
                    next: null,
                  },
                  meta: {
                    current_page: meta?.current_page ?? 1,
                    per_page: meta?.per_page ?? 15,
                    last_page: meta?.last_page ?? 1,
                    total: meta?.total ?? 0,
                    from: meta?.from ?? null,
                    to: meta?.to ?? null,
                  },
                }}
                onPageChange={page => setPage(page)}
              />
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      <Dialog.Root
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(undefined)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-md">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Delete withdrawal request" />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Trans
                message="Are you sure you want to delete withdrawal request #:id? This action cannot be undone."
                values={{id: deleteTarget?.id ?? ''}}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(undefined)}
                disabled={deleting}
              >
                <Trans message="Cancel" />
              </Button>
              <Button
                color="danger"
                onClick={() => void destroy()}
                disabled={deleting}
              >
                <TrashIcon />
                <Trans message="Delete" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout.MainSection>
  );
}

function CounterCard({
  status,
  counter,
  active,
  onSelect,
}: {
  status: PayoutStatus;
  counter?: Counter;
  active: boolean;
  onSelect: () => void;
}) {
  const icons: Record<PayoutStatus, React.ReactNode> = {
    requested: <ClockIcon />,
    processing: <SendIcon />,
    paid: <CheckCircleIcon />,
    rejected: <XCircleIcon />,
    cancelled: <XIcon />,
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-card border bg-card p-4 text-start transition-colors hover:bg-muted ${active ? 'border-primary ring-1 ring-primary/40' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <StatusBadge status={status} />
        {icons[status]}
      </div>
      <p className="text-xl font-semibold">{counter?.total ?? 0}</p>
      <p className="text-sm text-muted-foreground">
        {formatMoney(counter?.amount ?? 0, 'USD')}
      </p>
    </button>
  );
}

function StatusBadge({status}: {status: PayoutStatus}) {
  const variants: Record<PayoutStatus, 'outline' | 'positive' | 'destructive'> =
    {
      requested: 'outline',
      processing: 'outline',
      paid: 'positive',
      rejected: 'destructive',
      cancelled: 'destructive',
    };
  return (
    <Badge variant={variants[status]}>
      <Trans message={statusLabels[status]} />
    </Badge>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(
    cents / 100,
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
