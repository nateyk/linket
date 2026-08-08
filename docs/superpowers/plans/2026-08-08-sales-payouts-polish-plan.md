# Sales & Payouts Page UI/UX Polish Plan

## Goal
Rewrite `resources/client/dashboard/digital-products/sales-payouts-page.tsx` to match the Diget withdrawals pattern and the polished admin pages (withdrawals, payment activity, KYC).

## Key Changes

### 1. Data Loading: `fetch()` → `apiClient`
- Replace 3 raw `fetch()` calls with `apiClient.get()` (axios)
- Use `getApiErrorMessage(reason)` from `@common/http/errors/parsed-api-error` for error parsing
- Payout-method endpoint wrapped in nested try/catch (404 when no method set)

### 2. SummaryStrip → CounterCard Grid (3 cards)
Replace the flat inline icon+label+value row with 3 proper card tiles:
- **Available Balance** (`available_for_payout_cents`) — `BanknoteArrowUpIcon`
- **Pending Withdrawals** (`reserved_payout_cents`) — `Clock3Icon`
- **Total Withdrawn** (`paid_out_cents`) — `CheckCircleIcon`

Each card: `rounded-card border bg-card p-4`, icon + label row, `Skeleton` on load, `text-2xl font-semibold` value.

### 3. Header: Add InfoTrigger + Withdraw Button
- Add `CircleQuestionMarkIcon` help popover (InfoTrigger pattern from admin pages)
- Add "Withdraw" button in header that opens a confirmation dialog
- Remove the sidebar `RequestPayout` form entirely (no manual amount input)

### 4. Withdraw Dialog (3 branches — Diget pattern)
The withdraw amount is **always the full available balance** — user never inputs an amount:

| Branch | Condition | UI |
|--------|-----------|-----|
| 1. No method | `!method` | Info alert + "Set up now" link to `/account-settings/billing` |
| 2. Insufficient | `available <= 0` | Warning alert ("Not enough balance") |
| 3. Confirm | `method && available > 0` | "Withdraw X to Y via Z?" + Cancel/Confirm buttons |

On confirm: `POST /api/v1/digital-products/payout-requests` with `{amount_cents: available}`.
If backend rejects (min not met, KYC, etc.), error shows in dialog body via `getApiErrorMessage(reason, 'amount_cents')`.

### 5. Empty States + Loading Skeletons
- **LoadingRows**: 5 rows of `animate-pulse rounded-input bg-muted` (parametrized by colSpan)
- **EmptyState**: `InboxIcon` + heading + description (matching admin pages pattern)
- Applied to both SalesTable and PayoutHistory

### 6. Card-Wrapped Tables
- SalesTable and PayoutHistory wrapped in `Card.Root > Card.Header > Card.Title + Card.Content`
- PayoutHistory gets `BackendPagination` component
- `StatusBadge` uses `Badge variant=` (not `color=` — old code had incorrect Badge API)

### 7. Removed Components
- `SummaryStrip` → replaced by `CounterCard` grid
- `RequestPayout` → replaced by `WithdrawDialog`
- `SectionHeading` → replaced by `Card.Title`
- `payoutAmount` state → removed (amount is auto-calculated)

## File to Modify
- `resources/client/dashboard/digital-products/sales-payouts-page.tsx` (complete rewrite, ~430 lines)

## No Backend Changes
All APIs already exist and are tested by `tests/Feature/PayoutSystemTest.php`.

## Verification
1. `npx prettier --write` on the file
2. `npx tsc --noEmit --skipLibCheck` — no new errors in our file
3. `php artisan test --compact --filter=PayoutSystem` — backend sanity check
4. Visual: load `/dashboard/sales-payouts` and verify all 3 dialog branches, counter cards, empty states, loading skeletons, pagination
5. Commit
