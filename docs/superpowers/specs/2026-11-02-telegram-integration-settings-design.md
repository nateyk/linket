# Telegram Integration Settings Design

## Intent

Make Telegram a first-class Linket creator notification integration while keeping Linket web as the source of truth for payments, fulfillment, downloads, receiving accounts, and billing. Creators manage Telegram from Account Settings. Admins manage operational readiness from Admin Settings without ever seeing or storing the bot token or webhook secret.

## Goals

- Add **Account Settings → Integrations** with Telegram connection status, connect/reconnect/disconnect actions, last activity, and notification preferences.
- Add **Admin → Settings → Integrations** with Telegram configuration health, bot identity, webhook URL, connection counts, webhook sync, and a safe test-notification action.
- Keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` environment-only.
- Preserve Telegram as notification-only. Telegram must never verify payment, mark orders paid, grant entitlements, activate Pro, or change receiving accounts.
- Make the page structure extensible so future Linket integrations can be added without another navigation redesign.

## Non-goals

- Telegram Mini Apps, inline commerce, Telegram Stars, AI assistant, Business Bots, or destructive bot commands.
- Editing bot credentials from the Linket database or UI.
- Replacing Linket's existing web/database/email notification mechanisms.

## Architecture

The existing `laravel-notification-channels/telegram:^8.0` integration remains the delivery layer. Existing hashed one-time linking tokens, private-chat enforcement, webhook-secret validation, and `update_id` deduplication remain unchanged.

A new admin integration controller exposes only safe configuration state and operational actions. A small Telegram admin service calls Telegram Bot API server-side for webhook registration/status. It never returns or logs the bot token or webhook secret.

A new migration extends `telegram_connections` with a global notification-enabled flag and JSON preferences. The connection remains the source of Telegram routing. Event-specific preferences are applied before appending the `telegram` channel.

## Creator UX

Route: `/account-settings/integrations`

Use the existing `AccountSettingsPageLayout` and `AccountSettingsPanel` patterns.

The Telegram card shows:
- Available / unavailable
- Connected / not connected
- Telegram username when available
- Connected date and last activity
- Connect or reconnect
- Disconnect with confirmation
- Refresh status
- Global Telegram notification switch
- Event switches for currently supported events:
  - Verified sales
  - Service inquiries
  - Product moderation
  - Payment disputes
  - Pro billing reminders

Connect continues to use the existing short-lived `https://t.me/<bot>?start=<opaque-token>` flow.

## Admin UX

Route: `/admin/settings/integrations`

Use the existing Admin Settings navigation and settings-panel visual language. Telegram is the first integration panel.

Show only safe values:
- Feature enabled
- Bot token configured: yes/no
- Webhook secret configured: yes/no
- Bot username configured and visible username
- Webhook URL
- Local configuration readiness
- Connected account count
- Notification-enabled connection count
- Link-token TTL
- HTTP timeout values
- Remote webhook state after refresh/sync

Actions:
- Refresh status
- Register/refresh webhook
- Send test notification to the signed-in admin's connected Telegram account when available

Never show masked or partial secrets. A partial secret is still unnecessary secret material.

## Admin Bot API Operations

Webhook sync uses Telegram Bot API `setWebhook` server-side with:
- configured public Linket webhook URL
- configured environment secret as `secret_token`
- `allowed_updates=["message"]`
- no dropping of pending updates by default

After sync, query `getWebhookInfo` and return only safe fields. Network/provider failures return a generic safe error and never include the request URL or token.

## API Contracts

Creator:
- `GET /api/v1/integrations/telegram`
- `POST /api/v1/integrations/telegram/connect`
- `PATCH /api/v1/integrations/telegram` for notification settings
- `DELETE /api/v1/integrations/telegram`

Admin:
- `GET /api/v1/admin/integrations/telegram`
- `POST /api/v1/admin/integrations/telegram/webhook/sync`
- `POST /api/v1/admin/integrations/telegram/test`

All admin routes require `admin.access` and `settings.update`.

## Security Invariants

- Environment-only bot token and webhook secret.
- No secret values in JSON, HTML, JS state, logs, toasts, URLs shown to users, or database settings.
- Existing webhook secret validation stays mandatory.
- Only private Telegram chats can link.
- Link tokens remain one-time, hashed, short-lived, and non-user-identifying.
- Disconnect invalidates routing immediately.
- Global/per-event preferences are checked before Telegram is selected.
- Test notification is informational only and cannot touch payment state.
- Webhook sync cannot change Linket financial state.

## Testing

Backend feature tests cover authorization, secret non-disclosure, preference persistence/routing, safe webhook sync payloads, provider failure sanitization, and test-notification preconditions.

Frontend DOM tests cover creator connected/disconnected/unavailable states, preference updates and disconnect confirmation, plus admin readiness, missing environment configuration, webhook sync, and test notification states.

CI must finish green with the full PHP/TypeScript/Vitest gates.
