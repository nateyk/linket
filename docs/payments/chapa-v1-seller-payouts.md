# Linket seller withdrawals — Chapa v1

**Status:** Implementation is merged into `main`; live Chapa v1 seller payouts remain disabled with `CHAPA_V1_PAYOUTS_ENABLED=false`. Test-mode acceptance and exact provider callback verification must pass before any live payout activation.

## Architecture and screens

- Sellers add mobile-money or bank receiving accounts at `/account-settings/receiving-accounts`. New accounts and edited accounts require admin approval again.
- Admins switch payout providers on/off and review receiving accounts in **Admin → Finance → Financial settings → Payout methods**.
- Admin withdrawal queue `/admin/withdrawals` follows **Requested → Processing (approved) → Chapa transfer queued → Verified settlement → Paid**, or **Verified failure → Rejected**, releasing the ledger reserve.
- The payout account approval and withdrawal approval are separate permissions/steps. Only admin-approved account snapshots can be sent to Chapa. No seller API keys are used.
- No manual paid transition is permitted for Chapa bank/mobile-money payouts. The provider queue response is pending, not settlement.
- A Chapa queued-transfer response must echo the immutable submitted merchant reference, either as a string or in `data.reference` (both appear in Chapa documentation/examples). Missing or different references remain **submission uncertain**, never trigger a second POST, and require verification or manual investigation.
- Before recording verified success/failure, the lookup must itself succeed and match the reference, ETB amount and currency. If Chapa includes the recipient account number, it must also match the immutable destination snapshot. Unknown or conflicting responses leave funds reserved for review.
- Test cases cover no secret, invalid reference, amount mismatches, uncertain provider responses, duplicate submission and exactly-once ledger settlement.

## Provider methods

Supported ETB wallets: **Telebirr**, **M-Pesa**, **Yaya Wallet**, **CBE Birr**. The administrator controls the active providers and limits. The backend gets actual transfer `bank_code` IDs from **GET https://api.chapa.co/v1/banks** and refuses inactive/missing codes instead of hardcoding IDs. Supported regular bank accounts use the same endpoint.

Newly seeded wallets are disabled by default. Existing enable/disable preferences are preserved. Existing self-approved seller accounts are marked `pending_verification` during migration.

## Setup

1. Configure the centralized **platform** Chapa v1 secret key as `CHAPA_SECRET_KEY` (or the equivalent existing platform key setting), using **test-mode keys** while testing. Do not put any secret in client-side code.
2. Set `CHAPA_TRANSFER_APPROVAL_SECRET` to the secret registered in Chapa Dashboard **Settings → Account Settings → Transfer Approval**. Register the publicly reachable URL:
   `https://linket.agrigebeya.com/api/v1/chapa/transfer-approval`
3. Run the new migration through the normal deployment process. This does **not** authorize deploying the draft implementation to production.
4. Open Admin Finance settings; enable individual wallet providers **only after test-mode acceptance**, then approve seller account details. Existing accounts require renewed approval.
5. Ensure the Chapa merchant's **available ETB balance** covers intended transfers. Chapa explicitly warns repeated insufficient-balance submissions can block access.

## Read-only test-mode audit (no payout side effects)

With a properly configured **Chapa TEST key** in Linket's platform settings, run:

```bash
php artisan chapa:v1:audit-test
php artisan chapa:v1:audit-test --reference=EXISTING_TEST_REFERENCE
```

This command:
- refuses non-`CHASECK_TEST-` credentials before any request;
- makes **GET-only** calls for the v1 bank list, ETB available/ledger balance and optionally an existing transfer verification;
- displays matching wallet slugs/IDs, status and provider verification *field names* without printing recipient account numbers or API credentials;
- never creates transfers, changes payout states, retries submissions or touches the ledger.

The command does **not** prove the actual Chapa approval callback signature derivation or enable live disbursements. Confirm callback details using genuine Chapa test-mode delivery and separately review redacted provider responses before go-live.

## Chapa v1 operations

- Create transfer: `POST https://api.chapa.co/v1/transfers` with `amount` in ETB (major units), `reference` immutable per payout, and Chapa numeric `bank_code`.
- Verify transfer: `GET https://api.chapa.co/v1/transfers/verify/{reference}`.
- Banks: `GET https://api.chapa.co/v1/banks`.
- Balance: `GET https://api.chapa.co/v1/balances`.
- Server approval receives the `Chapa-Signature` header and transfer details. A signature error, missing intent, changed recipient or amount results in HTTP 400; only exact approved requests return 200.

## Acceptance gate — DO NOT release live funds until all pass

- [ ] CI: PHP 8.4/Laravel tests on MySQL, TypeScript typecheck/Vitest, build and any CodeScene gate all green.
- [ ] **Real Chapa v1 test-mode callback**: compare its `Chapa-Signature` derivation against the documented HMAC; reject tampered and replay-mismatched requests. Chapa's published example does not supply a complete 64-character signature, so the algorithm needs provider confirmation.
- [ ] **Real v1 verification response**: check actual response fields and status names; their docs show the URL but omit response examples. Any mismatched amount/currency/reference MUST leave the payout pending.
- [ ] Test all four wallets and at least one bank with test keys; verify recipient phone-number conventions and current bank codes.
- [ ] Test administrator provider-off behavior, account approval/rejection, re-review after edit, KYC and payout min/max gates, duplicate requests and unauthorized access.
- [ ] Test Chapa approval callback, OTP/approval modes, insufficient funds and timeout/unknown-transfer reconciliation. An unknown outcome **must not** create another provider transfer reference.
- [ ] Test full ledger balance and refund/dispute offset checks and operational reporting before enabling live funds.
- [ ] Review existing in-flight requests without immutable recipient snapshots; do not send them automatically. Require safe cancellation/recreation/manual reconciliation.

For provider behavior and current specifications, refer to:
- https://developer.chapa.co/transfer/transfers
- https://developer.chapa.co/transfer/verify-transfers
- https://developer.chapa.co/transfer/list-banks
- https://developer.chapa.co/transfer/balance
- https://developer.chapa.co/integrations/test-mode-vs-live-mode
