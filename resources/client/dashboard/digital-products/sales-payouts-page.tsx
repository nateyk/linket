import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  BanknoteArrowUpIcon,
  CircleDollarSignIcon,
  LandmarkIcon,
  Clock3Icon,
  RefreshCwIcon,
  WalletCardsIcon,
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
};

type Order = {
  id: number;
  currency: string;
  creator_earnings_cents: number;
  paid_at?: string;
  created_at: string;
  product?: {title: string};
};

type Payout = {
  id: number;
  amount_cents: number;
  currency: string;
  status: string;
  payout_method_label?: string | null;
  created_at: string;
};

type PayoutMethod = {
  id: number;
  type: 'bank_transfer' | 'paypal' | 'other';
  account_holder: string;
  display_label: string;
  withdrawal_method_id?: number | null;
};

export function Component() {
  const [summary, setSummary] = useState<Summary>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [method, setMethod] = useState<PayoutMethod>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const [salesResponse, payoutsResponse, methodResponse] =
        await Promise.all([
          fetch('/api/v1/digital-products/sales', {
            credentials: 'same-origin',
            headers: {Accept: 'application/json'},
          }),
          fetch('/api/v1/digital-products/payout-requests', {
            credentials: 'same-origin',
            headers: {Accept: 'application/json'},
          }),
          fetch('/api/v1/digital-products/payout-method', {
            credentials: 'same-origin',
            headers: {Accept: 'application/json'},
          }),
        ]);

      if (!salesResponse.ok || !payoutsResponse.ok) {
        throw new Error('Unable to load sales and payouts.');
      }

      const [sales, payoutCollection] = await Promise.all([
        salesResponse.json(),
        payoutsResponse.json(),
      ]);
      setSummary(sales.summary ?? {});
      setOrders(sales.orders?.data ?? sales.orders ?? []);
      setPayouts(payoutCollection.data ?? []);

      if (methodResponse.ok) {
        const item = (await methodResponse.json()).data as PayoutMethod | null;
        if (item) {
          setMethod(item);
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to load sales and payouts.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = orders[0]?.currency ?? payouts[0]?.currency ?? 'ETB';
  const available = summary?.available_for_payout_cents ?? 0;

  const requestPayout = async () => {
    const amount = Math.round(Number(payoutAmount) * 100);

    if (!method) {
      setError('Add a withdrawal method before requesting a payout.');
      return;
    }
    if (!amount || amount > available) {
      setError('Enter an amount within your available balance.');
      return;
    }

    setRequesting(true);
    setError(undefined);
    try {
      await apiClient.post('/api/v1/digital-products/payout-requests', {
        amount_cents: amount,
      });
      setPayoutAmount('');
      await load();
    } catch {
      setError('Unable to request payout.');
    } finally {
      setRequesting(false);
    }
  };

  const cancelPayout = async (payout: Payout) => {
    setError(undefined);
    try {
      await apiClient.post(
        `/api/v1/digital-products/payout-requests/${payout.id}/cancel`,
      );
      await load();
    } catch {
      setError('Unable to cancel this payout request.');
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Sales & Payouts" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCwIcon />
          <Trans message="Refresh" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <SummaryStrip
            summary={summary}
            currency={currency}
            loading={loading}
          />

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <main className="min-w-0 space-y-5">
              <SalesTable orders={orders} loading={loading} />
              <PayoutHistory
                payouts={payouts}
                onCancel={payout => void cancelPayout(payout)}
              />
            </main>
            <aside className="space-y-5 xl:border-l xl:pl-5">
              <RequestPayout
                available={available}
                currency={currency}
                amount={payoutAmount}
                disabled={!method || available < 1 || requesting}
                onAmountChange={setPayoutAmount}
                onRequest={() => void requestPayout()}
              />
            </aside>
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function SummaryStrip({
  summary,
  currency,
  loading,
}: {
  summary?: Summary;
  currency: string;
  loading: boolean;
}) {
  const items = [
    {
      label: 'Gross sales',
      value: summary?.gross_sales_cents ?? 0,
      icon: CircleDollarSignIcon,
    },
    {
      label: 'Your earnings',
      value: summary?.creator_earnings_cents ?? 0,
      icon: WalletCardsIcon,
    },
    {
      label: 'Available now',
      value: summary?.available_for_payout_cents ?? 0,
      icon: BanknoteArrowUpIcon,
    },
    {
      label: 'On hold',
      value: summary?.held_earnings_cents ?? 0,
      icon: Clock3Icon,
    },
    {
      label: 'Reserved',
      value: summary?.reserved_payout_cents ?? 0,
      icon: LandmarkIcon,
    },
  ];

  return (
    <div className="flex flex-wrap gap-4 sm:gap-6">
      {items.map(item => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                <Trans message={item.label} />
              </p>
              {loading ? (
                <Skeleton className="mt-1 h-4 w-16" />
              ) : (
                <p className="text-sm font-semibold">
                  {formatMoney(item.value, currency)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalesTable({orders, loading}: {orders: Order[]; loading: boolean}) {
  return (
    <section>
      <SectionHeading title="Recent sales" />
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
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
            {orders.length ? (
              orders.slice(0, 10).map(order => (
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
              ))
            ) : (
              <Table.Row>
                <Table.Cell
                  colSpan={3}
                  className="h-20 text-center text-muted-foreground"
                >
                  <Trans message="No sales yet." />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      )}
    </section>
  );
}

function PayoutHistory({
  payouts,
  onCancel,
}: {
  payouts: Payout[];
  onCancel: (payout: Payout) => void;
}) {
  return (
    <section>
      <SectionHeading title="Payout history" />
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
          {payouts.length ? (
            payouts.map(payout => (
              <Table.Row key={payout.id}>
                <Table.Cell>{formatDate(payout.created_at)}</Table.Cell>
                <Table.Cell className="text-muted-foreground">
                  {payout.payout_method_label ?? (
                    <Trans message="Not specified" />
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    color={payout.status === 'paid' ? 'positive' : 'warning'}
                    variant="outline"
                  >
                    <Trans message={payout.status} />
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-end font-medium">
                  {formatMoney(payout.amount_cents, payout.currency)}
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
              <Table.Cell
                colSpan={5}
                className="h-20 text-center text-muted-foreground"
              >
                <Trans message="No payout requests yet." />
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </section>
  );
}

function SectionHeading({title}: {title: string}) {
  return (
    <h2 className="mb-2 text-sm font-medium text-muted-foreground">
      <Trans message={title} />
    </h2>
  );
}

function RequestPayout({
  available,
  currency,
  amount,
  disabled,
  onAmountChange,
  onRequest,
}: {
  available: number;
  currency: string;
  amount: string;
  disabled: boolean;
  onAmountChange: (value: string) => void;
  onRequest: () => void;
}) {
  return (
    <section className="border-t pt-4">
      <SectionHeading title="Request payout" />
      <p className="mb-3 text-sm">
        <Trans
          message="Available: :amount"
          values={{amount: formatMoney(available, currency)}}
        />
      </p>
      <div className="space-y-3">
        <Field.Root>
          <Field.Label>
            <Trans message="Amount" />
          </Field.Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={event => onAmountChange(event.target.value)}
            placeholder="0.00"
          />
        </Field.Root>
        <Button className="w-full" disabled={disabled} onClick={onRequest}>
          <BanknoteArrowUpIcon />
          <Trans message="Request payout" />
        </Button>
      </div>
    </section>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(
    cents / 100,
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(
    new Date(value),
  );
}
