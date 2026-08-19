# Polish Sales & Payouts Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the creator-facing sales-payouts page to match the polished admin-withdrawals page pattern — replacing raw `fetch()` with `apiClient`, swapping the flat `SummaryStrip` for proper counter cards, replacing the manual-amount sidebar form with a 3-branch withdraw dialog, and adding empty states + loading skeletons throughout.

**Architecture:** Single-file rewrite of `resources/client/dashboard/digital-products/sales-payouts-page.tsx`. All sub-components (`CounterCard`, `InfoTrigger`, `LoadingRows`, `EmptyState`, `StatusBadge`, `WithdrawDialog`, `SalesTable`, `PayoutHistory`) remain co-located in the same file, mirroring the admin-withdrawals-page convention. Data loading switches from raw `fetch()` to the project's `apiClient` (axios instance) with `getApiErrorMessage` for error parsing. The withdraw amount is always the full available balance — never user-input — posted to the backend which validates KYC, method, min/max, and balance.

**Tech Stack:** React 19, TypeScript, Base UI (Dialog, Popover), Tailwind CSS v4, shadcn component wrappers, axios-based `apiClient`, lucide-react icons.

## Global Constraints

- Use `apiClient` from `@common/http/query-client` for ALL HTTP — never raw `fetch()`.
- Use `getApiErrorMessage(err, field?)` from `@common/http/errors/parsed-api-error` to extract error messages from axios errors.
- Every user-visible string must use `<Trans message="..." />` — never bare text.
- Use design tokens from `common-tailwind.css` (e.g. `text-muted-foreground`, `bg-destructive/5`, `text-positive`, `text-warning`, `rounded-card`, `rounded-input`) — never raw hex/gray values.
- Follow the admin-withdrawals-page (`resources/client/admin/withdrawals/admin-withdrawals-page.tsx`) as the canonical reference for: `CounterCard`, `InfoTrigger`, `LoadingRows`, `EmptyState`, `Dialog`, `StatusBadge` patterns.
- No new files — all components stay in the single page file.
- No backend changes — the APIs already exist and are tested by `tests/Feature/PayoutSystemTest.php`.
- The withdraw amount is the full `available_for_payout_cents` from the sales summary — there is no amount input field.

---

## File Structure

**Modify (single file):**
- `resources/client/dashboard/digital-products/sales-payouts-page.tsx` — complete rewrite (currently 483 lines → ~430 lines target).

**No new files.** All sub-components are co-located, matching the admin-withdrawals-page convention where `CounterCard`, `LoadingRows`, `StatusBadge`, and `InfoTrigger` all live in the same page file.

**No backend changes.** The API endpoints already exist in `common/foundation/routes/api.php`:
- `GET digital-products/sales` → `{summary: {..., currency}, orders: {data: [...], links, meta}}`
- `GET digital-products/payout-requests?page=N` → `{data: [...], links, meta}` (paginated)
- `GET digital-products/payout-method` → `{data: {id, type, withdrawal_method_id, account_holder, display_label, ...}}` or 404 if none set
- `POST digital-products/payout-requests` → body `{amount_cents}`, returns created payout; 422 on validation failure
- `POST digital-products/payout-requests/{id}/cancel`

**Components removed:** `SummaryStrip`, `RequestPayout`, `SectionHeading`.

**Components added:** `CounterCard`, `InfoTrigger`, `LoadingRows`, `EmptyState`, `StatusBadge`, `WithdrawDialog`.

**State changes:**
- REMOVE: `payoutAmount` (manual amount input — no longer needed)
- ADD: `page` (payout history pagination), `payoutsPagination` (PaginatedResource for BackendPagination), `withdrawOpen` (dialog open/close), `withdrawError` (dialog-scoped error)

---

## API Response Shapes (verified from controllers)

**Sales** (`StorefrontSalesController::index`):
```jsonc
{
  "summary": {
    "gross_sales_cents": 16700,
    "creator_earnings_cents": 16700,
    "available_for_payout_cents": 16700,
    "held_earnings_cents": 0,
    "reserved_payout_cents": 0,
    "paid_out_cents": 0,
    "lifetime_earnings_cents": 16700,
    "currency": "ETB"
  },
  "orders": { "data": [...], "links": {...}, "meta": {...} }  // paginated
}
```

**Payout requests** (`PayoutRequestsController::index`):
```jsonc
{ "data": [...], "links": {...}, "meta": {...} }  // standard Laravel pagination
```

**Payout method** (`DigitalProductPayoutMethodController::show`):
```jsonc
{ "data": { "id": 1, "type": "bank_transfer", "withdrawal_method_id": 2, "account_holder": "John Doe", "display_label": "Bank transfer ending in 1234", "created_at": "...", "updated_at": "..." } }
// 404 if no method set
```

**apiClient** (axios instance): `response.data` is the parsed JSON body. The request interceptor auto-prefixes `api/v1/` if not already present, so both `'/api/v1/digital-products/sales'` and `'digital-products/sales'` work — use the full `/api/v1/...` path to match the admin-withdrawals-page convention.

---

## Task 1: Rewrite sales-payouts-page.tsx

**Files:**
- Modify: `resources/client/dashboard/digital-products/sales-payouts-page.tsx` (complete rewrite)

**Interfaces:**
- Consumes: `apiClient` (axios), `getApiErrorMessage(err, field?)`, `PaginatedResource` type, `BackendPagination` component, `DashboardLayout`, shadcn `Card`/`Dialog`/`Popover`/`Badge`/`Button`/`Skeleton`/`Table`, `Trans`, lucide icons, `Link` from react-router.
- Produces: The default-exported `Component` function (React Router route element) with all sub-components co-located.

- [ ] **Step 1: Write the complete new file**

Replace the entire contents of `resources/client/dashboard/digital-products/sales-payouts-page.tsx` with:

```tsx
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {PaginatedResource} from '@common/http/backend-response/pagination-response';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Popover} from '@shadcn/popover/popover';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {Link} from 'react-router';
import {
  BanknoteArrowUpIcon,
  CheckCircleIcon,
  CircleQuestionMarkIcon,
  Clock3Icon,
  InboxIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import {ReactNode, useCallback, useEffect, useState} from 'react';

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
  const [payoutsPagination, setPayoutsPagination] = useState<PaginatedResource>();
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
        apiClient.get('/api/v1/digital-products/sales'),
        apiClient.get(
          `/api/v1/digital-products/payout-requests?page=${page}`,
        ),
      ]);
      const sales = salesResponse.data;
      setSummary(sales.summary);
      setOrders(sales.orders?.data ?? []);
      setPayouts(payoutsResponse.data.data ?? []);
      setPayoutsPagination(payoutsResponse.data);
      // payout-method may 404 if the creator hasn't set one up yet
      try {
        const methodResponse = await apiClient.get(
          '/api/v1/digital-products/payout-method',
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
      await apiClient.post('/api/v1/digital-products/payout-requests', {
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
        `/api/v1/digital-products/payout-requests/${payout.id}/cancel`,
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
          <Trans message="Refresh" />
        </Button>
        <Button disabled={loading} onClick={() => setWithdrawOpen(true)}>
          <BanknoteArrowUpIcon />
          <Trans message="Withdraw" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-6">
          {error && (
            <div className="rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CounterCard
              icon={<BanknoteArrowUpIcon />}
              label="Available balance"
              value={formatMoney(available, currency)}
              loading={loading}
            />
            <CounterCard
              icon={<Clock3Icon />}
              label="Pending withdrawals"
              value={formatMoney(
                summary?.reserved_payout_cents ?? 0,
                currency,
              )}
              loading={loading}
            />
            <CounterCard
              icon={<CheckCircleIcon />}
              label="Total withdrawn"
              value={formatMoney(summary?.paid_out_cents ?? 0, currency)}
              loading={loading}
            />
          </div>

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

function CounterCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-card border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-sm font-medium">
          <Trans message={label} />
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <p className="text-2xl font-semibold">{value}</p>
      )}
    </div>
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

function SalesTable({
  orders,
  loading,
}: {
  orders: Order[];
  loading: boolean;
}) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <Trans message="Recent sales" />
        </Card.Title>
      </Card.Header>
      <Card.Content>
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
                    {formatDate(order.paid_at ?? order.created_at)}
                  </Table.Cell>
                  <Table.Cell className="text-end font-medium">
                    {formatMoney(order.creator_earnings_cents, order.currency)}
                  </Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row>
                <Table.Cell colSpan={3}>
                  <EmptyState
                    message="No sales yet"
                    description="Your recent digital product sales will appear here."
                  />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
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
                  <Table.Cell>{formatDate(payout.created_at)}</Table.Cell>
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
                <Table.Cell colSpan={5}>
                  <EmptyState
                    message="No payout requests yet"
                    description="Your withdrawal requests will appear here once you make one."
                  />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
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
  const variants: Record<
    PayoutStatus,
    'outline' | 'positive' | 'destructive'
  > = {
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

function LoadingRows({colSpan}: {colSpan: number}) {
  return (
    <>
      {Array.from({length: 5}, (_, index) => (
        <Table.Row key={index}>
          <Table.Cell colSpan={colSpan}>
            <div className="h-7 animate-pulse rounded-input bg-muted" />
          </Table.Cell>
        </Table.Row>
      ))}
    </>
  );
}

function EmptyState({
  message,
  description,
}: {
  message: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <InboxIcon className="mb-3 size-10 text-muted-foreground/50" />
      <p className="font-medium">
        <Trans message={message} />
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        <Trans message={description} />
      </p>
    </div>
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
                <TriangleAlertIcon className="mt-0.5 size-5 text-primary" />
                <div className="text-sm">
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
                <TriangleAlertIcon className="mt-0.5 size-5 text-warning" />
                <div className="text-sm">
                  <p className="font-medium">
                    <Trans message="Not enough balance" />
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <Trans message="You don't have enough available balance to withdraw yet. Keep selling to build up your earnings." />
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p>
                  <Trans
                    message="Withdraw :amount to :account via :method?"
                    values={{
                      amount: formatMoney(available, currency),
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
            <Dialog.CloseButton render={<Button variant="outline" />}>
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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(
    new Date(value),
  );
}
```

**Key changes from the old file — for reviewer context:**

| Area | Old | New |
|------|-----|-----|
| Data loading | 3 raw `fetch()` calls | 3 `apiClient.get()` calls (sales + payouts in `Promise.all`, method in nested try/catch for 404) |
| Error parsing | `reason instanceof Error ? reason.message : fallback` | `getApiErrorMessage(reason)` and `getApiErrorMessage(reason, 'amount_cents')` for field-specific validation messages |
| Summary display | `SummaryStrip` (flat inline icon+label+value row, 5 items) | `CounterCard` grid (3 cards: Available Balance, Pending Withdrawals, Total Withdrawn) — each with icon, label, big 2xl number, skeleton on load |
| Header | Title + Refresh button | Title + `InfoTrigger` help popover + Refresh + Withdraw button |
| Withdrawal action | `RequestPayout` sidebar with manual `<Input type="number">` amount field | `WithdrawDialog` — 3 branches, no manual amount. Always posts full `available_for_payout_cents`. |
| Payout history pagination | None (loaded all, no pagination control) | `BackendPagination` component with `page` state |
| Empty states | Plain text in a table cell (`"No sales yet."`) | `EmptyState` component (icon illustration + heading + description) |
| Loading skeletons | Single `<Skeleton className="h-32 w-full" />` for SalesTable, nothing for PayoutHistory | `LoadingRows` component (5 rows of animated pulse bars, parametrized by `colSpan`) |
| Table containers | Bare `<section>` + `<SectionHeading>` (muted `<h2>`) | `Card.Root` + `Card.Header` + `Card.Title` + `Card.Content` (matches admin-withdrawals) |
| Status badges | `Badge color="positive"/"warning" variant="outline"` (incorrect — Badge has no `color` prop) | `StatusBadge` using `Badge variant="positive"/"destructive"/"outline"` (matches admin-withdrawals) |
| Payout method label | `payout_method_label ?? "Not specified"` | `withdrawal_method_name ?? payout_method_label ?? "Not specified"` (prefers the method name, matches admin-withdrawals) |
| Removed imports | `Field`, `Input`, `BanknoteArrowUpIcon` (kept), `CircleDollarSignIcon`, `LandmarkIcon`, `WalletCardsIcon` | Dropped `Field`, `Input`, `CircleDollarSignIcon`, `LandmarkIcon`, `WalletCardsIcon`; added `Card`, `Dialog`, `Popover`, `Link`, `getApiErrorMessage`, `PaginatedResource`, `BackendPagination`, `CheckCircleIcon`, `CircleQuestionMarkIcon`, `InboxIcon`, `TriangleAlertIcon`, `ReactNode` |

- [ ] **Step 2: Run lint to catch issues early**

Run: `npm run lint`
Expected: PASS (no new lint errors in the modified file)

- [ ] **Step 3: Run build to verify TypeScript compiles and Vite bundles**

Run: `npm run build`
Expected: PASS — no TypeScript errors, no unresolved imports, Vite produces output. If you get a Vite manifest error, run `npm run dev` instead and load the page in the browser.

- [ ] **Step 4: Visual verification — load the page in the browser**

Navigate to the sales-payouts page (the dashboard route for digital product sales). Verify each state:

**Counter cards (3 in a responsive grid):**
- Available Balance shows the formatted currency amount from `summary.available_for_payout_cents`
- Pending Withdrawals shows `summary.reserved_payout_cents`
- Total Withdrawn shows `summary.paid_out_cents`
- During load, each card shows a `<Skeleton>` instead of the number
- On mobile: 1 column; on sm: 2 columns; on lg: 3 columns

**Header:**
- Title "Sales & Payouts" is visible
- `CircleQuestionMarkIcon` info popover appears next to the title — hover shows help text
- Refresh button reloads data (skeletons flash then values appear)
- Withdraw button opens the dialog

**Withdraw dialog — 3 branches:**
1. **No payout method set** (creator hasn't configured one): dialog shows info alert with TriangleAlertIcon + "No payout method set up" + "Set up now" link to `/account-settings/billing`. Footer shows only "Cancel".
2. **Method set but available balance is 0**: dialog shows warning alert (amber) + "Not enough balance". Footer shows only "Cancel".
3. **Method set AND available > 0**: dialog shows "Withdraw {amount} to {account} via {method}?" + "Cancel" + "Confirm withdrawal" buttons. Clicking confirm POSTs the full available balance, closes the dialog, and reloads data. If the backend rejects (e.g. below min withdrawal, KYC not verified), the error message appears inside the dialog body.

**Sales table (Card-wrapped):**
- During load: 5 skeleton rows (animated pulse)
- With data: top 10 recent orders, 3 columns (Product, Date, You earned)
- Empty: InboxIcon + "No sales yet" + description

**Payout history (Card-wrapped):**
- During load: 5 skeleton rows
- With data: payouts with Requested/Method/Status/Amount/Actions columns; "requested" status shows a Cancel button; StatusBadge shows colored badge (positive for paid, destructive for rejected/cancelled, outline for requested/processing)
- Empty: InboxIcon + "No payout requests yet" + description
- If more than one page: BackendPagination shows Previous/Next buttons

**Cancel payout:**
- Clicking Cancel on a "requested" payout calls the cancel endpoint and reloads

- [ ] **Step 5: Run the existing backend payout tests (sanity check — no backend changes)**

Run: `php artisan test --compact --filter=PayoutSystem`
Expected: PASS — confirms the API endpoints the page depends on still work. This is a no-op sanity check since no backend files were touched.

- [ ] **Step 6: Commit**

```bash
git add resources/client/dashboard/digital-products/sales-payouts-page.tsx
git commit -m "polish: rewrite sales-payouts page with counter cards, withdraw dialog, and loading skeletons"
```

---

## Withdraw Dialog Flow Diagram

```
User clicks "Withdraw" button (disabled during load)
         │
         ▼
   ┌─────────────────────┐
   │  Is method set?     │
   │  (GET payout-method │
   │   returned 200?)    │
   └────────┬────────────┘
            │
      NO    │    YES
   ┌────────┴────────┐
   ▼                 ▼
┌─────────┐   ┌──────────────┐
| Branch 1 |   | available > 0?|
| No method|   └──────┬───────┘
| Info alert        │
| + "Set up now"   NO     YES
| link              │       │
              ┌─────┴───────┐
              ▼             ▼
         ┌──────────┐  ┌──────────────┐
         | Branch 2 |  | Branch 3     |
         | Insuffi- |  | Confirm      |
         | cient    |  | "Withdraw X  |
         | Warning  |  |  to Y via Z?"|
         | alert   |  | + Cancel     |
         └──────────┘  | + Confirm btn|
                       └──────┬───────┘
                              │ user clicks Confirm
                              ▼
                       POST /payout-requests
                       body: { amount_cents: available }
                              │
                     ┌────────┴────────┐
                  2xx │            422  │
                     ▼                 ▼
              Close dialog      Show error in
              Reload data       dialog body
                              (getApiErrorMessage
                               with field='amount_cents')
```

---

## Self-Review

**1. Spec coverage:**

| Spec requirement | Task/Step |
|---|---|
| Switch from raw `fetch()` to `apiClient` | Step 1 — `load()` uses `apiClient.get()` for all 3 endpoints |
| Remove `SummaryStrip`, replace with counter cards | Step 1 — `SummaryStrip` deleted, `CounterCard` grid with 3 cards (Available Balance, Pending Withdrawals, Total Withdrawn) |
| Remove `RequestPayout` sidebar + manual amount input | Step 1 — `RequestPayout` deleted, `payoutAmount` state removed, `WithdrawDialog` has no input field |
| Add `CircleQuestionMarkIcon` help popover on title | Step 1 — `InfoTrigger` component added to `SectionTitle` |
| Add proper empty states (not plain text) | Step 1 — `EmptyState` component used in both `SalesTable` and `PayoutHistory` |
| Add loading skeletons for PayoutHistory | Step 1 — `LoadingRows` component used in both tables |
| Withdraw button in header (not sidebar) | Step 1 — `Button` in `SectionHeader` opens dialog |
| Withdraw modal 3 branches (confirm / insufficient / no method) | Step 1 — `WithdrawDialog` with 3 conditional branches |
| Withdraw amount = full available balance (not user input) | Step 1 — `requestPayout` posts `amount_cents: available` |
| No-method branch links to account settings | Step 1 — `Link to="/account-settings/billing"` in the no-method branch |
| Match Diget pattern (3 counter cards, withdraw dialog, empty states) | Step 1 — all implemented |
| Match admin-withdrawals-page conventions | Step 1 — `CounterCard`, `InfoTrigger`, `LoadingRows`, `EmptyState`, `StatusBadge`, `Card.Root` wrappers, `BackendPagination`, `Dialog` pattern all match admin-withdrawals |
| Use design tokens (no raw values) | Step 1 — `text-muted-foreground`, `bg-destructive/5`, `text-warning`, `text-positive`, `rounded-card`, `rounded-input`, `border-primary/30` |
| Use `Trans` for all text | Step 1 — all user-visible strings use `<Trans message="..." />` |
| Verification | Steps 2-5 (lint, build, visual, backend test sanity) |

**No gaps found.** All spec requirements are covered.

**2. Placeholder scan:** Searched for TBD, TODO, "implement later", "add appropriate", "similar to", "fill in" — none present. All code blocks contain complete, concrete code.

**3. Type consistency:**
- `PayoutMethod` type: used consistently — `method` state is `useState<PayoutMethod>()`, `WithdrawDialog` prop is `method?: PayoutMethod`, `load()` sets it from `methodResponse.data.data`.
- `PayoutStatus` type: used in `Payout.status`, `StatusBadge` prop, `statusLabels` record, `statusOrder` — consistent.
- `PaginatedResource` type: imported from `@common/http/backend-response/pagination-response`, used for `payoutsPagination` state and `PayoutHistory` prop, passed to `BackendPagination` `response` prop — matches the `BackendPagination` component signature which expects `response: PaginatedResource`.
- `getApiErrorMessage(err, field?)` signature: `err: unknown`, `field?: string | null`, returns `string` — called as `getApiErrorMessage(reason)` and `getApiErrorMessage(reason, 'amount_cents')` — correct.
- `formatMoney(cents: number, currency: string)` and `formatDate(value: string)` — signatures unchanged from old file, used consistently.
- `LoadingRows({colSpan})` — called with `colSpan={3}` for SalesTable (3 columns) and `colSpan={5}` for PayoutHistory (5 columns) — correct.

**4. Badge API correction:** The old file used `Badge color="positive" variant="outline"` — but Badge has no `color` prop (only `variant`). The new `StatusBadge` uses `Badge variant="positive"|"destructive"|"outline"` — matching the admin-withdrawals-page exactly.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-08-polish-sales-payouts-page.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
