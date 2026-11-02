# Telegram V1.1 Reliability and Creator Lifecycle Notifications

## Intent
Build on the merged Linket Telegram notification channel (PR #69) and creator/admin settings (PR #70). Keep Telegram a notification transport only; Linket/Verify.et remain authoritative for payment state, fulfillment, receiving account eligibility, and Pro billing.

## Scope and constraints
- Credentials `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` remain environment-only and must not be exposed in responses, logs, DB settings, or notifications.
- Use `laravel-notification-channels/telegram` v8 and Laravel 13 notification events.
- Telegram remains private-chat only for account linking; no purchasing, financial-state changes, or destructive bot callbacks.
- Use current React/shadcn/Base UI settings routes, Laravel permission gates, and queued notification behavior.
- No real Telegram/provider calls in automated tests; use `Http::fake()` and isolated testing DB.

## Design: delivery monitoring
- Listen to `NotificationSent` and `NotificationFailed` when the channel is `telegram`.
- Record per-connection `last_delivery_at`, `last_failed_at`, `consecutive_failures`, and `delivery_status` (`healthy` or `attention_required`). Do not retain raw requests, exception messages, buyer details, or bank data.
- Never change Linket payment state in listeners. Distinguish muted, disconnected, or absent routes from actual delivery attempts.
- Recheck per-event preference when queued notifications are about to send, not only when they are enqueued.

## Design: admin diagnostics
- Add a read-only admin health endpoint that queries `getMe` and `getWebhookInfo`, compares actual bot username and webhook URL with configured values, and returns sanitized state.
- Keep existing webhook sync as the only state-changing admin Bot API operation. Validate HTTPS webhook URL and secret token syntax before sync. Never drop pending updates automatically.
- Display remote bot identity match, remote webhook status, and pending updates in the existing admin Integrations screen.

## Design: creator connection and maintenance
- Add a creator-triggered non-financial Telegram test message (rate-limited, authenticated, connected chat only), separate from global notification preference.
- Show delivery state and last success/failure in Account Settings.
- Schedule cleanup: expire/delete one-time link tokens and prune webhook update IDs only after a safely conservative deduplication window (30 days).
- Maintain existing one-time hash-based Telegram link flow; duplicate updates must never repeat side effects.

## Design: receiving-account lifecycle
- On existing authenticated admin transitions (approve, reject, record Verify.et registration, suspend, restore), enqueue an informational Telegram notification for the owning creator after the state change.
- Reuse the existing creator Telegram preference system with a new `receiving_accounts` event key.
- Include provider name and masked ending only; never account number, rejection reason, suspension reason, recipient/transaction reference, or ownership evidence.
- Notification failures never change the state of the receiving account. Preserve existing audit records and successful admin responses.

## Non-goals
- Telegram Mini App, AI, Telegram Business, bot commands, checkout, Verify.et verification, new subscription/quota business rules.
- Introducing generic financial-state notifications that bypass actual authoritative lifecycle transitions.

## Verification
- PHPUnit/Pest feature coverage: admin permissions and sanitized API, mismatches/invalid secret/HTTP-only webhook, creator test permissions, delivery event status, retention, receiving-account event routing and no account-number disclosure.
- Frontend DOM tests for creator/admin diagnostic states, TypeScript typecheck, Vitest and full GitHub CI.
- Production readiness still requires real env setup and an opt-in test bot; synthetic CI is not evidence of successful production Telegram delivery.
