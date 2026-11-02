# Linket Telegram Creator Notifications

Linket uses Telegram as a creator notification channel. Telegram is not a payment-verification authority and must never mark orders paid, create download entitlements, activate Pro, or bypass Verify.et.

## Package

The integration uses `laravel-notification-channels/telegram:^8.0`, which supports Laravel 13 and PHP 8.3+.

## Environment

Configure these values only in the deployment environment or secret manager:

```dotenv
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_LINK_TOKEN_TTL_MINUTES=10
TELEGRAM_HTTP_TIMEOUT=10
TELEGRAM_HTTP_CONNECT_TIMEOUT=5
```

Do not commit populated secrets.

The Telegram Bot API webhook target is:

```text
https://<linket-host>/integrations/telegram/webhook
```

When registering the webhook with Telegram, pass the same random value as `secret_token` that is configured in `TELEGRAM_WEBHOOK_SECRET`. Linket validates the `X-Telegram-Bot-Api-Secret-Token` header before it stores or processes an update.

## Connection flow

1. An authenticated Linket creator calls `POST /api/v1/integrations/telegram/connect`.
2. Linket generates a short-lived one-time token, persists only its SHA-256 hash, and returns a `https://t.me/<bot>?start=<token>` URL.
3. The creator opens the bot and presses **Start**.
4. Telegram sends the private-chat update to Linket.
5. Linket validates the webhook secret, deduplicates `update_id`, consumes the token once, and binds the Linket user to that Telegram user/chat.
6. The creator can disconnect with `DELETE /api/v1/integrations/telegram`.

The default token lifetime is 10 minutes and the backend hard-caps it at 30 minutes.

## Security invariants

- Only private chats can establish a Linket connection.
- The Telegram user ID must equal the private chat ID when linking.
- A Telegram user/chat can belong to only one Linket account.
- Raw connection tokens are never persisted.
- Raw webhook payloads are not persisted; only processed update IDs are stored for deduplication.
- Creator-facing user-generated text is sent with Telegram parse mode disabled.
- Full receiving-account numbers, transaction references, buyer email addresses, and buyer phone numbers are not included in creator Telegram messages.
- Telegram can never verify a payment or override Verify.et.
- Verified-sale notifications are emitted only after `DirectStorefrontFulfillment` commits a Verify.et-backed paid order.
- Telegram delivery failures must never roll back fulfillment.

## Initial creator events

The first integration covers:

- Verify.et-backed verified sales
- product moderation changes
- product moderation summaries
- new service inquiries
- creator-side payment dispute updates
- direct-transfer Pro renewal reminders

Existing mail/database delivery remains unchanged. Telegram is appended only when the integration is enabled, a bot token exists, and the creator has a connected Telegram chat.

## Deployment

After deploying the code:

1. Run migrations.
2. Add the Telegram environment values.
3. Rebuild Laravel configuration cache.
4. Register the HTTPS webhook with Telegram using the configured secret token and `allowed_updates=["message"]`.
5. Restart Horizon/queue workers.
6. Connect a test creator and test a non-financial event first.
7. Test a synthetic Verify.et-backed sale and confirm Telegram delivery happens only after the order is paid.

Do not use a production payment reference merely to test Telegram.


## Account settings integration

Creators manage Telegram from:

```text
Account Settings → Integrations → Telegram
```

The page uses the existing one-time private-chat connection flow. A connected creator can pause Telegram globally or enable/disable these event groups independently:

- verified sales
- service inquiries
- product moderation
- creator-side payment disputes
- Pro billing reminders

These preferences affect Telegram only. Existing mail/database delivery continues according to each notification's own routing.

Disconnecting Telegram removes the routing connection immediately. Reconnecting creates a new short-lived one-time link token.

## Admin integration operations

Administrators with both `admin.access` and `settings.update` manage operational readiness from:

```text
Admin → Settings → Integrations → Telegram
```

The admin surface is intentionally operational, not a credential editor. It can show:

- whether Telegram is enabled
- whether the bot token, bot username and webhook secret are configured
- the public webhook URL
- connected creator counts
- notification-enabled creator counts
- effective link-token lifetime and HTTP timeout values
- safe remote webhook status after synchronization

It can also:

- synchronize the webhook with Telegram using `allowed_updates=["message"]`
- send a non-financial test notification to the current admin when that admin has connected Telegram

`TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` are never returned to the browser, stored in Linket settings, partially masked for display, or exposed through these endpoints.

The admin API routes are:

```text
GET  /api/v1/admin/integrations/telegram
POST /api/v1/admin/integrations/telegram/webhook/sync
POST /api/v1/admin/integrations/telegram/test
```

The creator API also supports:

```text
PATCH /api/v1/integrations/telegram
```

for Telegram-only global and per-event preferences.

## Deployment order for preference support

The Telegram connection schema now includes notification preference columns. During deployment:

1. Put the Telegram environment variables in the production secret/config environment.
2. Run database migrations before restarting web or queue workers.
3. Rebuild the Laravel configuration cache.
4. Restart Horizon/queue workers.
5. Open **Admin → Settings → Integrations → Telegram** and confirm the integration reports **Ready**.
6. Use **Sync webhook** to register/refresh the HTTPS webhook.
7. Connect a dedicated admin/test Telegram account through **Account Settings → Integrations**.
8. Send the safe test notification.
9. Test a normal non-financial creator event before validating verified-sale notification delivery.

Never use a real payment reference only to test Telegram.

## V1.1 operational diagnostics and delivery health

After PR #70, V1.1 adds **Admin → Settings → Integrations → Check Telegram health**. The read-only API `GET /api/v1/admin/integrations/telegram/health` calls Telegram `getMe` and `getWebhookInfo` without changing the webhook. It reports identity/URL match, pending updates, allowed updates and safe error timestamps; bot token, webhook secret, remote human-readable error strings and HTTP request contents are not returned. Webhook sync refuses non-HTTPS callback URLs and invalid `secret_token` syntax (Telegram permits only `A-Z`, `a-z`, `0-9`, underscore, and hyphen, length 1–256).

A connected creator can request a non-financial test with `POST /api/v1/integrations/telegram/test` (rate-limited). The Account Settings page displays delivery-attention state. Laravel `NotificationSent` / `NotificationFailed` listeners update the Telegram connection with last successful/failed delivery timestamps, a bounded failure count and a safe health enum; **no message body, exception message, bank detail or failed provider request is persisted**. Queue-time preference rechecks ensure a muted creator no longer receives a delayed Telegram job; email/database remain independent.

The scheduled `telegram:prune-records` command deletes consumed or expired link tokens older than 30 days and processed webhook IDs older than 30 days. The command is daily, non-overlapping and intentionally preserves recent deduplication rows.

Creator notifications also cover receiving account **approved**, **rejected**, **provider registered**, **suspended** and **restored** state transitions. Messages contain the provider and only the last four account-number characters. No account proof, full account number, rejection/suspension reason or Verify.et reference is included. Creators can opt out under the `receiving_accounts` event preference.

### Deployment checklist

1. Deploy code and **run migrations first** (delivery-health columns), then refresh config cache and restart queue workers.
2. Confirm `APP_URL` resolves to the public HTTPS Linket domain; HTTP webhook URLs are rejected.
3. Confirm the environment-only Telegram secret contains 1–256 permitted ASCII characters.
4. In Admin → Settings → Integrations, use **Check Telegram health**; resolve bot identity/webhook mismatches before **Sync webhook**.
5. Connect a test creator, use **Send test**, then verify a non-financial receiving-account status event with fake/synthetic account data.
6. Confirm scheduled `telegram:prune-records` appears in `php artisan schedule:list`.
7. Do not treat synthetic CI success as proof of production Bot API connectivity, and never use a real payment receipt solely for Telegram testing.


## Creator lifecycle notifications — V1.2

Telegram alerts remain informational: Linket/Verify.et are the **only** sources of truth for payment status, Pro activation, free-sale allowance consumption and download entitlements.

When a creator successfully links a private Telegram chat using a valid, consumed, one-time token, Linket queues one acknowledgement to that same connected chat. Replayed link attempts do not issue duplicates.

Two additional creator switches are available under **Account Settings → Integrations → Telegram**:
- **Free sales allowance** (`free_sales_quota`): warns when verified free-sale consumption reaches the final three slots of the current configured lifetime limit. Reserved or unverified checkouts never count, and a unique milestone record deduplicates retries.
- **Payment review** (`payment_review`): informs the creator when Linket actually marks a Verify.et buyer order `manual_review`. It does not mean the funds have been confirmed, and it provides no override action.

The existing **Pro billing** switch controls Verified Pro activation, renewal, past-due and expired notices. Only a successfully settled Verify.et subscription payment activates or renews Pro. Chapa subscriptions are unaffected. Repeated scheduler passes and duplicated provider callbacks do not produce duplicate transition messages.

All new messages recheck creator ownership, connection/prefs, and persisted status when the queued message is delivered. They never expose buyer contact data, full receiving account numbers, payment reference IDs or provider verification evidence. No Telegram response is used to change settlement, accounting, entitlements or quotas.

For production rollout: deploy the new idempotency-table migration, refresh config and restart queue workers. Then verify a connected **test** creator receives these informational events using synthetic orders, not real receipts. CI tests fake the Telegram transport and cannot prove real production connectivity.
