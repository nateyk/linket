# Checkout verification session hardening

## Outcome

Direct Verify.et checkout keeps the current database statuses and the receiving-account selector that already ships. One session policy owns reference preparation, the five-attempt budget, and lock-on-exhaustion, whether Verify.et answers inline, by webhook, or by reconcile. After payment is stored as paid, file delivery is a visible `delivering` state, then `delivered` with the existing signed download URLs. The order API adds friendly status aliases without renaming stored values.

## Decisions

1. Keep stored order statuses: `pending_payment`, `verifying`, `paid`, `failed_verification`, `expired`, and the existing `manual_review`.
2. API and checkout UI expose aliases: `pending`, `verifying`, `completed`, `failed`, `cancelled`. `manual_review` stays `manual_review`. The stored `status` field remains the database value.
3. `verification_attempts` max is 5. A terminal false result consumes one attempt on the sync submit path, the webhook path, and the reconcile path. The same verification attempt is counted once.
4. Provider responses that leave the verification `verifying` (timeouts, 429, 5xx) do not consume an attempt.
5. `manual_review` does not consume an attempt and does not lock the session. The buyer cannot submit another reference while the order is `manual_review`.
6. Checkout TTL stays one hour from `payment_expires_at`. Uncompleted `pending_payment`, `verifying`, and `failed_verification` orders past that time become `expired`.
7. Delivery confirmation stays on the existing poll loop. No Echo or websocket channel.
8. Receiving-account selection stays as built: eligible approved accounts, selector with bank name, account number, holder name, and instructions, persisted as `creator_payment_method_id` plus snapshots. This work adds a feature test, not a new selector.

## Status aliases

| Stored `status` | `status_label` |
| --- | --- |
| `pending_payment`, `pending` | `pending` |
| `verifying` | `verifying` |
| `paid`, `completed`, `fulfilled` | `completed` |
| `failed_verification`, `failed` | `failed` |
| `expired`, `cancelled` | `cancelled` |
| `manual_review` | `manual_review` |

`PublicStorefrontOrderResource` and the payment submit, recheck, instructions, and cancel payloads include `status_label` next to `status`.

## Session policy

New `App\Storefront\Services\StorefrontVerificationSession`.

`prepareReference(string $bank, string $raw, ?string $accountSuffix, ?string $phone): string`

1. Trim the raw reference.
2. If it is a supported receipt URL for that bank, extract the token. Supported origins stay the ones already in `ReceiptReference`: CBE, Awash, Siinqee, Kaafi Ebirr.
3. Uppercase Telebirr, BOA, M-Pesa, Dashen, and any `FT` reference.
4. Run the existing per-bank format checks on that normalized value, including BOA 5-digit suffix, CBE FT 8-digit suffix, and CBE Birr phone.
5. Return the normalized reference. Format failures stay `ValidationException` on `reference`, `account_suffix`, or `phone_number`.

`OrderPaymentController::submit` calls `prepareReference` once. It does not call `validateFormat` on the raw string.

Duplicate rejection uses the normalized reference. Reject when another order’s `DirectPaymentVerification` has that reference and status `success`, `manual_approved`, `manual_review`, or `verifying`, or when `canonical_transaction_identity` is already set. The current order may resubmit its own mismatched reference. The response stays the existing validation error on `reference`.

`recordMismatch(StorefrontOrder $order, DirectPaymentVerification $verification): void`

1. Lock the order row.
2. Do nothing if the order is `paid`, `manual_review`, or already `expired`.
3. Idempotency key is `{verification_id}:{verification_attempt}`. Persist it on `storefront_orders.last_counted_attempt_key`. If that key is already stored, do not increment again and do not release the allowance again.
4. Otherwise increment `verification_attempts`.
5. If the new count is 5 or more, set `status` to `expired`.
6. If the count is still under 5, set `status` to `failed_verification`.
7. Release the creator verification allowance only on the first count of that attempt, using the existing `definitive_verification_mismatch` reason. A duplicate call must not release twice.

Column `last_counted_attempt_key` is a nullable string, added in a new migration. Do not edit `2026_11_09_120000_add_verification_attempts_and_delivery_state_to_storefront_orders.php` if that migration has already run.

What counts as a mismatch:

- Evidence mismatch, ineligible payable, duplicate transaction identity, or payable already settled inside `VerifyEtGateway`.
- Verify.et HTTP 400 and 422, which `VerifyEtFailureHandler` already maps to verification status `mismatch`.
- The unique-constraint catch in `processResult` that returns `mismatch`.

`recordMismatch` is the only writer of `verification_attempts` and of the mismatch order status. Call it from:

- `VerifyEtGateway::syncStorefrontOrderStatus` when the outcome is `mismatch`
- `VerifyEtFailureHandler::handle` when it maps the provider error to `mismatch`
- the unique-constraint catch in `VerifyEtGateway::processResult` that returns `mismatch`

Remove the allowance release in `VerifyEtGateway::handlePostTransactionOutcome`. `recordMismatch` owns that release. Remove the attempt increment in `OrderPaymentController::submit`, and remove the later order-status overwrites in `ProcessVerifyEtWebhook`, `ReconcilePendingVerifications`, and `OrderPaymentController::recheck` that set `failed_verification` on their own. Those callers read the order after the gateway returns and build the HTTP payload from it.

Submit mismatch HTTP body, status 422:

- `status`: stored value `failed_verification` or `expired`
- `status_label`: `failed` or `cancelled`
- `message`: remaining-attempts copy, or the cancelled-session copy when locked
- `order_id`, `verification_attempts`, `attempts_remaining`, `session_locked`

When the session is already locked or expired, submit returns 422 with `session_locked: true` and `attempts_remaining: 0` and does not call Verify.et. A past `payment_expires_at` returns 410 with the same lock fields and `status_label: cancelled`.

`expireIfDue(StorefrontOrder $order): void` sets `expired` when `payment_expires_at` is past and status is `pending_payment`, `pending`, `verifying`, `failed_verification`, or `failed`. It does not touch `paid` or `manual_review`. `instructions`, `show`, and `submit` call it. `billing:reconcile-pending-verifications` expires the same statuses, and includes `verifying`, which the command currently skips. Orders with `verification_attempts >= 5` in those uncompleted statuses are expired by that command too.

Buyer cancel still stores `expired` and returns `status_label: cancelled`.

## Delivery

`DirectStorefrontFulfillment::fulfill` today sets `delivering` and `delivered` inside one database transaction, and `VerifyEtSettlementHandler::settleOrder` calls it inside the gateway transaction. A nested commit is not visible to pollers.

Split fulfillment:

1. Inside the settlement transaction, `markPaid` sets `status` to `paid`, fee fields, `paid_at`, and `delivery_status` to `delivering`. It creates the commission accrual and consumes the creator allowance as it does today. It does not create download entitlements.
2. After the gateway transaction commits, dispatch `App\Storefront\Jobs\DeliverStorefrontOrder` with `afterCommit`. The job is unique per order id.
3. The job verifies the order is `paid`, creates file entitlements and course enrollment, then sets `delivery_status` to `delivered` and `delivered_at`. On failure it sets `delivery_status` to `failed` and `delivery_error`, and leaves `status` as `paid`.
4. The receipt mail dispatches only after `delivered`.

Zero-price checkout calls `markPaid` and then runs delivery inline in the same request so the create response can include download links. It does not wait on a queue.

`PublicStorefrontOrderResource` includes signed `storefront.download` URLs only when the order is paid, `delivery_status` is `delivered`, and entitlements exist. While `delivering` or `failed`, `downloads` is an empty list and `delivery.status` is that state.

The payment modal keeps its poll loop: 8s while verifying, 2s while delivering. It reads `status_label` for the status line and shows the existing preparing and download states. Add a delivery-failed message that tells the buyer the payment was received and access is not ready yet. No new transport.

## Receiving accounts

No payload or UI redesign. `selectAccount` keeps validating an approved, active, unsuspended method owned by the creator in the product workspace, and stores `creator_payment_method_id` plus provider, account number, and account name snapshots. A feature test covers that persistence and that a completed order cannot switch accounts.

## Tests

PHPUnit feature tests, run with `ddev artisan test --compact` on the touched files:

1. A CBE receipt URL is normalized to its token before format validation and can be submitted.
2. A reference already `success` or `manual_review` on another order is rejected before Verify.et is called.
3. An inline mismatch increments `verification_attempts` and returns `attempts_remaining`.
4. The fifth mismatch stores `expired`, `session_locked: true`, and `attempts_remaining: 0`.
5. A webhook mismatch and a repeated webhook for the same verification attempt increment the counter once.
6. A retryable provider failure that stays `verifying` does not increment the counter.
7. The reconcile command expires a `verifying` order whose `payment_expires_at` is past.
8. `selectAccount` persists `creator_payment_method_id` and the account snapshots.
9. A successful settlement leaves `delivery_status` `delivering` until `DeliverStorefrontOrder` runs, then `delivered` with a signed download URL on the public order payload.
10. A delivery exception leaves the order `paid` with `delivery_status` `failed`.

Update the direct-payment modal DOM test so the failed delivery state renders the payment-received message.

## Implementation guardrails

- Call `recordMismatch` only when `payable_type` is `StorefrontOrder`. Commission invoices and Pro subscription payments do not use this attempt budget.
- The idempotency key is `{verification_id}:{attempt}`. Reusing a verification row increments `attempt`, so a corrected resubmit counts again. A repeated webhook for the same attempt does not.
- `recordMismatch` locks the order row inside a transaction. `CreatorVerificationAllowance::release` only updates a `reserved` row, so a second release does not throw.
- `submit` returns 409 when the order is already `manual_review`.
- `DeliverStorefrontOrder` catches delivery failures, stores `delivery_status` `failed` outside the rolled-back entitlement transaction, and dispatches the receipt only after `delivered`.
- Zero-price checkout stays one transaction. A failure there rolls the order back. A paid Verify.et order stays `paid` if file delivery fails.
- The checkout modal polls while `delivering` and stops when delivery is `failed`.
- `statusLabel()` lives on `StorefrontOrder`. Instructions, submit, recheck, cancel, and the public order resource all return `status` and `status_label`.
- Feature tests keep `DirectStorefrontFulfillment::$runDeliveryInlineInTests` on so existing entitlement assertions still pass. The delivering-state test turns it off, fakes the queue, and runs `DeliverStorefrontOrder` directly.

## Out of scope

- Renaming stored statuses or backfilling old rows to the alias names.
- Laravel Echo, SSE, or a new Verify.et webhook endpoint.
- Changing bank regex rules beyond “normalize, then validate”.
- Replacing the receiving-account selector.
- Chapa checkout.
