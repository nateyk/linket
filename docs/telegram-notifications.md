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
