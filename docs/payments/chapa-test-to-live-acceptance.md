# Linket — Chapa TEST acceptance and controlled LIVE payout checklist

**Status: operator runbook, not provider acceptance.** The payment collection path uses the Linket platform Chapa v2 SDK; seller transfer submission and server approval currently use the separate Chapa **v1** transfer API. Test both provider versions with the exact merchant credentials, callbacks and transfer destinations that will be used.

This document never authorizes a transfer by itself. Keep `CHAPA_V1_PAYOUTS_ENABLED=false` until Chapa confirms marketplace collections and third-party payouts for Linket, the test acceptance is signed off, and the owner authorizes a tightly limited live disbursement. Do not paste merchant, webhook or approval secrets into tickets, screenshots, logs or customer-facing forms.

## A. Required gates before activating live funds

- [ ] Latest main SHA, exact-SHA deployment success, php artisan migration status, queue worker/scheduler health and `/up` are recorded. Check any deploy or reconciliation exception reports.
- [ ] Invoice `intl`/NumberFormatter is enabled on **both** the web PHP handler and the deployment CLI binary. Confirm an authenticated invoice renders; do not expose a public phpinfo endpoint.
- [ ] Chapa confirms the merchant is allowed to collect centrally for creators, perform third-party wallet/bank payouts and honor necessary KYC/AML/tax/refund obligations.
- [ ] All required Free/Pro commission, hold, transfer fee, reserve, minimum payout and refund policies are approved and snapshotted.
- [ ] Finance ledger and signed creator balances are healthy by creator, currency, destination/workspace; no unexplained creator deficits or pending provider transfers.
- [ ] Chapa TEST callback delivery confirms **real** Transfer Approval `Chapa-Signature` derivation, body field names, bank aliases and recipient normalization. The published approval-doc example is not itself a complete signed fixture.
- [ ] At least one actual Chapa TEST checkout, independent verification, webhook handling, full/partial refund, and payout PENDING-to-verified-final event were observed and redacted evidence retained.
- [ ] TEST outage/timeout, duplicate callback, failed payout, reversed payout and retry with the **same existing intent/reference** were checked without ledger double posts.
- [ ] Operator has a rollback plan, a finance reviewer and a real-time monitoring window; no unrestricted seller withdrawals are enabled.

## B. Safe TEST workflow

1. Configure matching `CHASECK_TEST-` / public TEST credentials under **Admin → Financial settings → Platform Chapa**. Keep Chapa webhook and transfer-approval secrets independent.
2. Register `https://linket.agrigebeya.com/api/v1/chapa/transfer-approval` in the correct Chapa **TEST** account. Under **Admin → Financial settings → Platform Chapa → Chapa transfer approval**, save the same TEST approval secret in the dedicated password field. It is encrypted in the settings database, separate from the merchant API key and payment webhook secret, and is not shown again. Existing installations may continue using the server-only `CHAPA_TRANSFER_APPROVAL_SECRET` environment fallback. Confirm **Transfer approval secret: Configured** and **Merchant mode: TEST**. Do not paste this secret into the checkout form or admin withdrawal confirmation.
3. Register the separate **payment webhook URL** displayed on the same screen in the Chapa merchant dashboard, set the correct webhook signing secret, and check its configured status. Keep `CHAPA_V1_PAYOUTS_ENABLED=false`; TEST switch `CHAPA_V1_TEST_PAYOUTS_ENABLED=true` must have no effect with live keys. Configure `CHAPA_ADMIN_PAYOUT_STEP_UP_REQUIRED=true` only when the admin has a local Linket password and the updated interface is deployed.
4. Use one nonproduction creator and a separate buyer account. Publish an inexpensive ETB digital item. Complete **genuine Chapa TEST checkout**, capture the merchant reference, verify exact amount/currency/ownership and confirm fulfillment/commission recorded **once**.
5. Reconcile provider payment and settled cash evidence. Let the approved hold/settlement state mature normally—do not create synthetic sales, backdate paid timestamps or force available balances.
6. Creator saves a supported TEST wallet/bank receiving account. Administrator approves the payout account **separately** from the later withdrawal request. Confirm provider limit and destination snapshot.
7. Creator requests an eligible small withdrawal. Confirm the amount moves Available → Reserved **exactly once**. Administrator approves; review ID, amount, currency and destination, enter **Linket admin password** if step-up is enabled, and submit the provider transfer **once**.
8. Observe Chapa's real server-to-server approval callback on the configured URL. Confirm a valid signature and exact approved transfer details return HTTP 200, and missing/invalid/mismatched callbacks fail closed. Do not reveal the secret.
9. PENDING stays Processing and Reserved. Query the immutable transfer reference until a terminal status is independently verified. Success disburses liability once; failure releases reservation once; reversal/unknown cases require reconciliation.
10. Reconcile orders, financial journal, available/held/reserved/deficit balances and provider statements. Save redacted provider/test evidence with timestamps and IDs.

### Administrative readiness and mobile QA

- On a mobile viewport around 390px, the finance title must remain in the header without covering tabs, the tabs should scroll horizontally, and the withdrawal shortcut must remain keyboard- and screen-reader-accessible.
- A saved Chapa key means credentials are configured, **not** that provider webhooks or payouts have been verified. The Transfer Approval status is configuration-only and cannot prove a genuine signed callback.
- A missing payment webhook signing secret prevents trusted webhook processing; a missing transfer approval secret prevents server-approved payout dispatch. Both statuses should be visible to the administrator but neither secret should be displayed.
- Changing from TEST to LIVE credentials requires configuring the approval secret for that merchant environment separately. Live payout dispatch stays disabled under its independent server-side flag.
- The existing read-only `php artisan chapa:v1:audit-test` command can confirm available wallet codes and TEST merchant balance without sending a transfer. If available balance is `0.00 ETB`, do not assume the provider will settle a test payout; obtain supported sandbox funding or status-simulation guidance from Chapa, and record any simulated results as simulated rather than bank settlement.

## C. One controlled small-value LIVE acceptance, **only after all A/B gates pass**

1. Obtain explicit owner and finance approval for one bounded real-money test; choose a low ETB product price and a permitted withdrawal amount at or above the current provider/Linket minimum, including fees.
2. Schedule a limited change window; take required backups; verify current deployment and ensure the Chapa merchant's cleared **available** balance is sufficient. Do not treat the order payment as payout-ready until settlement is independently confirmed.
3. Configure the proper LIVE platform Chapa credentials via the secure admin/server settings process. Verify which v1/v2 endpoints and approval secrets apply in the LIVE account. Do not reuse TEST callback secrets. Keep `CHAPA_V1_PAYOUTS_ENABLED=false` during checkout verification.
4. Purchase the real digital product from a separate buyer account. Confirm provider-side payment, webhook verification, order fulfillment, platform commission and creator held liability using **matching real references and statements**.
5. After verified provider cash settlement and the configured hold, approve one creator receiving destination, request a single payout, and require independent admin review with optional password/MFA confirmation.
6. Only then, with explicit operator approval and monitoring in place, enable the separate live disbursement flag for that planned transaction. Submit **once** and observe Chapa's LIVE server approval and verification. An HTTP POST/queued response is not paid.
7. Verify the actual provider destination, amount, transfer reference, final transfer status, journal disbursement and reserve clearance. Switch the LIVE payout flag off immediately after the bounded test if general payout rollout is not authorized.
8. Record a GO/NO-GO decision with redacted receipts, provider reconciliation, incidents, release SHA and human approvers. Keep general payouts disabled until approved.

## D. Stop and investigate

If approval signature mismatches, a transfer times out, references disagree, ledger reports negative liabilities, a recipient changes, cash cannot be verified or a provider return remains ambiguous: **do not repeat the payout POST**. Keep the creator reservation, turn off the live-disbursement flag if enabled, preserve immutable provider references and escalate for manual Chapa/finance reconciliation. Never mark Paid to make the UI appear finished.

**Secrets are server-side configuration, not an admin button password.** Chapa calls the Approval URL after the admin approves/submits a withdrawal; the admin may re-enter only the Linket password for optional step-up, not any Chapa merchant or callback secret.

References:
- https://developer.chapa.co/transfer/transfers
- https://developer.chapa.co/transfer/verify-transfers
- https://docs.chapa.global/docs/v2/integrations/webhooks
- https://github.com/nateyk/linket/blob/main/docs/payments/chapa-v1-seller-payouts.md
