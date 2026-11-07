# Chapa v2 seller gateway and platform cutover

## Outcome

Pro sellers can connect their own Chapa public and secret keys and use Chapa Hosted Checkout as the storefront payment collector. Buyers pay into the seller’s Chapa account. A verified Chapa success marks the order paid, fulfills it, and grants access. Linket’s existing platform Chapa billing and payouts move from API v1 to API v2 through one shared client.

Bank receiving accounts and Verify.et stay the current collector. Chapa does not replace them and does not run at the same time for new checkouts.

## Decisions

1. Seller Chapa is a storefront collect option. It is not a change to Free, Pro, commission, or Verify.et rules.
2. Chapa success is enough to fulfill. The Chapa path never calls Verify.et and never stores Verify.et evidence.
3. Only Pro can connect Chapa, select it, or start a new Chapa checkout. Free keeps bank accounts and Verify.et only.
4. The seller has one active collector: `verify_et` or `chapa`. Switching blocks the other collector for new checkouts. Stored keys and bank accounts stay.
5. Checkout is Hosted Checkout only. The server calls Chapa with the seller secret. The public key is stored for the seller settings screen and is not used to charge.
6. Sellers enter a public key and a secret key only. There is no seller webhook and no seller webhook secret in this project.
7. Linket learns the result from the hosted-checkout return URL, then verifies the payment with the seller secret before fulfillment.
8. Platform subscriptions, platform callbacks, platform webhooks, and admin payout transfers migrate to v2 in this project, before the seller gateway ships on the shared client.
9. [Chapa CLI](https://github.com/Chapa-Et/chapa-cli) is the legacy v1 terminal tool (`https://api.chapa.co/v1`, one token in `~/.chapa-cli_config.json`). Developers may use it to initialize, verify, list banks, read events, and check webhook signatures for a single v1 key. Linket does not shell out to it. v2 payments use `ChapaV2Client`, because the CLI cannot store a secret per seller and Chapa has no v2 CLI yet.

## Invariants

1. New storefront checkouts use exactly one collector. An active Verify.et collector never starts Chapa. An active Chapa collector never starts Verify.et.
2. A new Chapa checkout starts only when the creator is Pro now, Chapa is the active collector, and both keys are saved.
3. Pro lapse does not change the active collector and does not enable Verify.et. New Chapa checkouts stop. Saved keys stay. Bank and Verify.et checkout is available again only after the seller switches the collector back to `verify_et`, under the existing Free and Pro rules.
4. An order already sent to Chapa may still verify and fulfill after Pro lapses. The next checkout cannot start.
5. Fulfillment requires a server-side v2 verify result of `SUCCESS` plus matching amount, currency, and merchant reference. Pending, failed, cancelled, and mismatched results do not fulfill.
6. Fulfillment is idempotent. A repeated return does not grant access twice.
7. A Chapa checkout started while the creator is Pro stores the existing Pro monetization policy. Fulfillment keeps that policy. The sale is an eligible verified sale under that policy and does not consume a Free allowance slot. It appears in normal order history and entitlement grant. It does not create a Verify.et evidence row. Reporting that requires Verify.et evidence stays unchanged.
8. Seller secrets are encrypted at rest, write-only in the UI, and absent from logs, receipts, and API responses. Public keys are masked in the UI.
9. Seller charges use the seller secret. Platform charges and payouts use `CHAPA_SECRET_KEY`. The two secrets are never substituted for each other.
10. New platform and seller creates use Chapa API v2 only. A v1-shaped success does not fulfill a newly created charge.
11. Historical Chapa orders, subscriptions, webhook deliveries, and payout rows stay as stored. This project does not rewrite them.

## Architecture

One Linket `ChapaV2Client` accepts the secret on each call. It creates hosted payments, verifies a payment by reference, and performs the platform payout calls that replace the current v1 transfer calls. Amounts cross the API boundary as integer cents. Each create sends an `Idempotency-Key` and reuses that same key when retrying that create. The client does not read a global package secret.

Phase A uses the client with the platform secret for subscription checkout, verify, billing callback, billing webhook, and admin payout transfers.

Phase B uses the same client with the seller secret for storefront hosted checkout and the storefront return URL. Phase B starts after Phase A is independently testable.

`chapa/chapa-laravel` leaves the live path once those platform calls use the v2 client. The base URL for new calls is `https://api.chapa.global/v2`.

## Data model

Seller Chapa credentials live in a new `creator_chapa_gateways` table, one row per workspace. The table stores `workspace_id`, `user_id`, `public_key`, and encrypted `secret_key`. A row exists only after the secret authenticates. Pro lapse does not delete the row or mark it unusable; checkout code enforces Pro. The table does not store a webhook secret and has no admin-approval status. It is not a `creator_payment_methods` row. Bank ownership review and provider registration stay on that existing table.

Saving credentials requires both keys. Before persisting, Linket authenticates the secret with `GET /v2/payments/methods`. An authentication failure rejects the save and writes nothing. The public key is required and stored; hosted checkout does not send it to the browser.

The active collector is a workspace setting, `active_payment_collector`, with values `verify_et` and `chapa`. Existing workspaces default to `verify_et`. Selecting `chapa` requires Pro and a saved gateway row. Selecting `verify_et` requires no Chapa data.

A seller Chapa order uses `payment_gateway = chapa` and a new merchant reference of at most 20 characters. The idempotency key for that create is stored with the order and reused for a retry of the same create. New v2 creates do not reuse the longer v1 reference format. Internal order amounts stay in the current storage form and convert to integer cents only at the Chapa client boundary. The API minimum is 100 cents.

## Checkout and fulfillment

When the active collector is `verify_et`, `DirectStorefrontCheckout` and Verify.et verification stay as they are.

When the active collector is `chapa`:

1. Reject the checkout unless the creator is Pro, the gateway row has both keys, and the sale is a normal paid storefront sale.
2. Create a pending order with `payment_gateway = chapa` and the Pro monetization policy.
3. Create a v2 hosted payment with the seller secret, integer cents, the stored idempotency key, the short merchant reference, and Linket’s return URL.
4. Redirect the buyer to Chapa.

The return URL loads the order, verifies it with that order’s seller secret, and fulfills only on a matching success. Fulfillment grants access through the existing entitlement path. It does not call Verify.et.

If Pro is inactive while the collector remains `chapa`, the settings screen says Chapa checkout is paused until Pro is active. Paid checkout is unavailable. There is no bank button on that checkout.

## Seller settings

The Chapa connection lives on the seller Receiving accounts page, above the bank and wallet accounts. It is not an entry in that payment-method list.

The form has a public key and a secret key. After save, the UI shows a masked public key and that a secret is stored. It never shows the secret again. Replacing keys overwrites both and re-runs secret authentication.

The collector control offers Bank accounts (Verify.et) and Chapa. Chapa is selectable only for Pro with saved keys. A lapsed Pro who left Chapa selected sees the paused state above. The control does not switch collectors on its own.

The storefront paid action follows the active collector. It does not offer both collectors on one checkout.

## Platform v2

Platform create, verify, callback, webhook, and payout code call `ChapaV2Client` with `CHAPA_SECRET_KEY`. Success for a new charge is uppercase `SUCCESS` plus matching amount, currency, and reference.

The platform webhook remains. During cutover it accepts a valid v2 signature and an already-valid v1 delivery so an in-flight v1 event is not dropped. New charges are created only on v2. Sellers never configure this webhook.

## Failures and security

A create or verify transport error leaves the order unpaid. Pending stays pending. Failed, cancelled, and mismatched payments do not fulfill. A missing seller secret at verify time does not fulfill.

Keys and webhook signing material are never logged. Seller API responses omit the secret. The public key is masked outside the edit field.

## Tests

Phase A proves platform hosted create, verify, webhook, callback, and payout use the v2 client and the platform secret. A v1-shaped success does not fulfill a new charge. An already-valid in-flight v1 webhook still processes. Historical rows are not rewritten.

Phase B proves:

- Chapa checkout starts only for Pro, an active Chapa collector, and saved keys.
- Free, lapsed Pro, and an active Verify.et collector cannot start it.
- Switching collectors blocks the other path for new checkouts and deletes neither keys nor bank accounts.
- A matching success fulfills, grants access, records the Pro sale policy, and writes no Verify.et evidence. A duplicate return does not grant twice.
- A return for an in-flight order still fulfills after Pro lapses. The next checkout does not start.
- A bad secret is rejected on save and nothing is stored.
- Amount, currency, and reference mismatches do not fulfill.

## Sequencing

Implementation is two sequential plans from this spec:

1. Shared v2 client and platform cutover.
2. Seller credentials, collector switch, hosted checkout, and fulfillment.

Each plan must leave its own phase testable before the next starts.

## Non-goals

Inline charge, direct charge, split payments, refunds, seller webhooks, seller payout configuration, calling Chapa CLI from the application, changes to the Free 10 limit, Pro price, commission, receiving-account review, or Verify.et matching. Forecast and reporting queries that require Verify.et evidence are unchanged. Auto-switching the collector when Pro lapses is out of scope.
