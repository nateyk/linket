# Chapa merchant TEST/LIVE switch — operator acceptance

The Linket Admin Finance screen uses the **existing Chapa v1 hosted-checkout and transfer adapter**. It does not yet activate the separate Chapa v2 API; v2 private keys `CHAPA_TEST_…` and `CHAPA_LIVE_…` must not be used with v1 endpoints. The provider's separate TEST/LIVE mode also needs to match the key.

## Configure once

1. Open **Admin → Financial settings → Platform Chapa**. Select TEST. Enter the v1 TEST public/secret keys, payment webhook signing secret and independent transfer approval secret, then save. Keys are encrypted; they cannot be read back.
2. Select LIVE and save its distinct v1 merchant public/secret keys, webhook secret and approval secret. Saving LIVE keys does **not** switch the active merchant, start a payment, or enable payouts.
3. Register the payment webhook URL and separate Transfer Approval URL in the matching Chapa merchant dashboard mode, and verify the server has a reachable HTTPS endpoint. A configured status is **not** proof of signed provider delivery.
4. For live checkout activation only, obtain merchant/legal/finance approval, complete genuine TEST provider acceptance and approve the applicable settlement, refund, KYC and commission policies. Then set `CHAPA_LIVE_MODE_SWITCH_ALLOWED=true` through the secure deployment configuration process. **Keep `CHAPA_V1_PAYOUTS_ENABLED=false`** until separate live payout authorization.

## Switch safely

1. Check the Admin Finance in-flight counts. Resolve or independently reconcile every pending checkout, Pro payment, payout and withdrawal; never delete ledger evidence or force terminal status. Temporarily stop selling while completing the cutover.
2. Select the other mode and choose **Switch to TEST/LIVE**. Type the exact confirmation phrase and reauthenticate using the **Linket administrator password**. The server rechecks provider authentication and outstanding items.
3. **Every switch leaves checkout PAUSED.** Verify the displayed active environment, masked credential presence, webhook/approval statuses and server logs.
4. Select **Enable TEST/LIVE checkout**, reauthenticate and type the confirmation phrase again. One small buyer checkout may now run in that mode. The separate live payout feature flag remains unchanged.
5. Use **Pause checkout** to stop new checkouts. Existing transaction records, refunds, holds and payout reservations remain unchanged.

## Provider transaction acceptance

- Place one genuine provider TEST order for an ETB-priced item. Verify Chapa's actual provider reference, webhook signature, independent payment verification, fulfillment and creator balance. Replay webhook/verification to confirm no duplicate journal entry.
- Test failed, pending, cancelled, duplicate and reversed states, including a provider-verified refund. Verify balances and liabilities with the independent reconciliation command.
- Approve a supported TEST receiving account and withdrawal. Confirm admin review, Chapa's *actual* signed Transfer Approval request, immutable recipient/amount/reference, provider PENDING, then independent final verification.
- TEST wallet/bank availability and merchant available balance come from Chapa. An earlier read-only audit showed Telebirr and M-Pesa in the TEST catalog but an available TEST balance of `0.00 ETB`; a real provider TEST transfer may need provider sandbox provisioning. Do not label a simulated status a real bank settlement.
- For a bounded small-value LIVE acceptance, use only approved live credentials, a merchant-funded/settled balance and explicit operator authorization. Pay the live item, confirm settlement and wait for configured hold/restrictions. **Do not enable third-party live payouts merely because checkout succeeded.** Require an independently approved transfer and provider settlement evidence.

## Stop conditions

Pause checkout and keep payout dispatch disabled if a mode or reference mismatch is detected, a webhook signature is invalid, a transaction remains pending, a payout destination differs, provider settlement is unknown, or ledger/creator liabilities do not reconcile. Never retry an ambiguous payout POST with a new reference.

## Relevant Chapa sources

- https://developer.chapa.co/integrations/test-mode-vs-live-mode (v1 environment/key format)
- https://developer.chapa.co/transfer/transfers (v1 transfer approval)
- https://docs.chapa.global/docs/v2/integrations/test-live-mode (v2 keys and environment behavior)
