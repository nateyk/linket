import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
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

type WithdrawalMethod = {id: number; name: string; destination_label: string; instructions?: string | null};

export function Component() {
  const [summary, setSummary] = useState<Summary>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [method, setMethod] = useState<PayoutMethod>();
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [withdrawalMethodId, setWithdrawalMethodId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [methodType, setMethodType] =
    useState<PayoutMethod['type']>('bank_transfer');
  const [accountHolder, setAccountHolder] = useState('');
  const [destination, setDestination] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const [salesResponse, payoutsResponse, methodResponse, methodsResponse] = await Promise.all([
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
        fetch('/api/v1/digital-products/withdrawal-methods', {
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
      if (methodsResponse.ok) {
        const methods = (await methodsResponse.json()).data ?? [];
        setWithdrawalMethods(methods);
        if (!methodResponse.ok && methods[0]) setWithdrawalMethodId(String(methods[0].id));
      }

      if (methodResponse.ok) {
        const item = (await methodResponse.json()).data as PayoutMethod | null;
        if (item) {
          setMethod(item);
          setMethodType(item.type);
          setWithdrawalMethodId(item.withdrawal_method_id ? String(item.withdrawal_method_id) : '');
          setAccountHolder(item.account_holder);
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to load sales and payouts.',
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

  const saveMethod = async () => {
    if (!accountHolder.trim() || !destination.trim()) {
      setError('Enter the account holder and payout destination.');
      return;
    }

    setSavingMethod(true);
    setError(undefined);
    try {
      const response = await apiClient.put(
        '/api/v1/digital-products/payout-method',
        {
          type: methodType,
          withdrawal_method_id: Number(withdrawalMethodId),
          account_holder: accountHolder.trim(),
          destination: destination.trim(),
        },
      );
      setMethod(response.data as PayoutMethod);
      setDestination('');
    } catch {
      setError('Unable to save withdrawal method.');
    } finally {
      setSavingMethod(false);
    }
  };

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
      await apiClient.post(`/api/v1/digital-products/payout-requests/${payout.id}/cancel`);
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
        <Button variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCwIcon />
          <Trans message="Refresh" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 py-6">
          {error && (
            <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <SummaryStrip summary={summary} currency={currency} loading={loading} />

          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <main className="min-w-0 space-y-8">
              <SalesTable orders={orders} loading={loading} />
              <PayoutHistory payouts={payouts} onCancel={payout => void cancelPayout(payout)} />
            </main>
            <aside className="space-y-7 border-t pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-7">
              <WithdrawalMethod
                method={method}
                methods={withdrawalMethods}
                withdrawalMethodId={withdrawalMethodId}
                accountHolder={accountHolder}
                destination={destination}
                saving={savingMethod}
                onWithdrawalMethod={setWithdrawalMethodId}
                onAccountHolder={setAccountHolder}
                onDestination={setDestination}
                onSave={() => void saveMethod()}
              />
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
    {label: 'On hold', value: summary?.held_earnings_cents ?? 0, icon: Clock3Icon},
    {label: 'Reserved', value: summary?.reserved_payout_cents ?? 0, icon: LandmarkIcon},
  ];

  return (
    <section className="grid border-y sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item, index) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className={`flex items-center gap-3 px-4 py-4 ${
              index > 0 ? 'sm:border-l' : ''
            }`}
          >
            <Icon className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                <Trans message={item.label} />
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-5 w-20" />
              ) : (
                <p className="mt-0.5 text-lg font-semibold tracking-tight">
                  {formatMoney(item.value, currency)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SalesTable({orders, loading}: {orders: Order[]; loading: boolean}) {
  return (
    <section>
      <SectionHeading title="Recent sales" />
      <div className="overflow-x-auto border-y">
        {loading ? (
          <Skeleton className="m-4 h-32 w-[calc(100%-2rem)]" />
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
                      {order.product?.title ?? <Trans message="Digital product" />}
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
                    className="h-28 text-center text-muted-foreground"
                  >
                    <Trans message="No sales yet." />
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        )}
      </div>
    </section>
  );
}

function PayoutHistory({payouts, onCancel}: {payouts: Payout[]; onCancel: (payout: Payout) => void}) {
  return (
    <section>
      <SectionHeading title="Payout history" />
      <div className="overflow-x-auto border-y">
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
              <Table.Head><span className="sr-only"><Trans message="Actions" /></span></Table.Head>
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
                  <Table.Cell className="text-end">{payout.status === 'requested' && <Button size="sm" variant="ghost" onClick={() => onCancel(payout)}><Trans message="Cancel" /></Button>}</Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row>
                <Table.Cell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  <Trans message="No payout requests yet." />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </div>
    </section>
  );
}

function SectionHeading({title}: {title: string}) {
  return (
    <h2 className="mb-3 text-sm font-medium">
      <Trans message={title} />
    </h2>
  );
}

function WithdrawalMethod({
  method,
  methods,
  withdrawalMethodId,
  accountHolder,
  destination,
  saving,
  onWithdrawalMethod,
  onAccountHolder,
  onDestination,
  onSave,
}: {
  method?: PayoutMethod;
  methods: WithdrawalMethod[];
  withdrawalMethodId: string;
  accountHolder: string;
  destination: string;
  saving: boolean;
  onWithdrawalMethod: (value: string) => void;
  onAccountHolder: (value: string) => void;
  onDestination: (value: string) => void;
  onSave: () => void;
}) {
  const selectedMethod = methods.find(item => String(item.id) === withdrawalMethodId);

  return (
    <section>
      <SectionHeading title="Withdrawal method" />
      {method && (
        <p className="mb-4 text-sm text-muted-foreground">
          {method.display_label}
        </p>
      )}
      <div className="space-y-4">
        <Field.Root>
          <Field.Label><Trans message="Withdrawal method" /></Field.Label>
          <Select.Root value={withdrawalMethodId} onValueChange={value => onWithdrawalMethod(String(value))}>
            <Select.Trigger><Select.Value placeholder={<Trans message="Choose a method" />} /></Select.Trigger>
            <Select.Content>{methods.map(item => <Select.Item key={item.id} value={String(item.id)}>{item.name}</Select.Item>)}</Select.Content>
          </Select.Root>
          {selectedMethod?.instructions && <p className="mt-2 text-xs text-muted-foreground">{selectedMethod.instructions}</p>}
        </Field.Root>
        <Field.Root>
          <Field.Label>
            <Trans message="Account holder" />
          </Field.Label>
          <Input
            value={accountHolder}
            onChange={event => onAccountHolder(event.target.value)}
            placeholder="Your legal name"
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            <Trans message={selectedMethod?.destination_label ?? 'Payout destination'} />
          </Field.Label>
          <Input
            value={destination}
            onChange={event => onDestination(event.target.value)}
            placeholder={
              method
                ? 'Enter a new destination to replace it'
                : 'Account number or PayPal email'
            }
          />
        </Field.Root>
        <Button
          className="w-full"
          variant="outline"
          disabled={saving}
          onClick={onSave}
        >
          <LandmarkIcon />
          {saving ? <Trans message="Saving..." /> : <Trans message="Save method" />}
        </Button>
      </div>
    </section>
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
    <section className="border-t pt-6">
      <SectionHeading title="Request payout" />
      <p className="mb-4 text-sm text-muted-foreground">
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
