# Telegram V1.1 Reliability and Lifecycle Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Telegram notification channel production-observable and add creator receiving-account status notifications.

**Architecture:** Keep Laravel notification-channel routing as the delivery mechanism. Add sanitized delivery lifecycle events, read-only Telegram Bot API diagnostics, scheduled record pruning, and informational notifications from authoritative existing admin account transitions.

**Tech Stack:** Laravel 13, PHP 8.4, MySQL 8, React/TypeScript, Vitest, Base UI/shadcn, Telegram Bot API, `laravel-notification-channels/telegram` v8.

**Spec:** `docs/superpowers/specs/2026-11-02-telegram-v11-reliability-design.md`

## Global Constraints
- Never read or store bot credentials from Linket settings database.
- Telegram must never approve a payment, release an order, or activate Pro.
- No real Bot API calls in tests.
- Follow `/api/v1/integrations/telegram` and `/api/v1/admin/integrations/telegram` routes.

## Review Focus
- Credential-bearing Telegram API URL or raw failed request must never be exposed by errors or logs.
- Wrong configured bot username must be detected even when `getMe` succeeds.
- A queued notification must honor current creator mute/opt-out.
- Duplicate admin status requests must not send duplicate notifications.
- Cleanup must not prune recently processed Telegram update IDs and allow duplicate link side-effects.

---

### Task 1: Bot health and secure admin operations

**Files:**
- Modify: `app/Telegram/Services/TelegramBotAdminService.php`
- Modify: `app/Telegram/Controllers/AdminTelegramIntegrationController.php`
- Modify: `routes/api.php`
- Modify: `resources/client/admin/settings/integrations-settings.tsx`
- Test: `tests/Feature/AdminTelegramIntegrationTest.php`
- Test: `resources/client/admin/settings/integrations-settings.dom.test.tsx`

**Interfaces:**
- `TelegramBotAdminService::inspect(): array` returns redacted `bot`, `webhook`, and `status`.
- `GET /api/v1/admin/integrations/telegram/health` returns `{telegram:{...localHealth,...inspect}}`.
- `syncWebhook()` validates `https://` and Telegram secret token syntax before external calls.

- [ ] Add failing tests for live bot/webhook match, mismatch and unsafe config.
- [ ] Run focused backend tests to RED.
- [ ] Implement diagnostics, route, and admin UI.
- [ ] Run focused backend, TypeScript and DOM tests to GREEN.
- [ ] Commit.

### Task 2: Safe delivery monitoring, creator test and current preference enforcement

**Files:**
- Create: `app/Telegram/Listeners/TelegramDeliveryMonitor.php`
- Create: `database/migrations/2026_11_02_110000_add_telegram_delivery_state.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `app/Telegram/Models/TelegramConnection.php`
- Modify: `app/Telegram/Controllers/TelegramConnectionController.php`
- Modify: `app/Telegram/Support/TelegramNotificationChannels.php`
- Modify: `resources/client/account-settings/integrations-page.tsx`
- Test: `tests/Feature/TelegramNotificationIntegrationTest.php`

**Interfaces:**
- `TelegramDeliveryMonitor::sent(NotificationSent $event): void` and `failed(NotificationFailed $event): void` process Telegram only and never record sensitive message payload.
- `POST /api/v1/integrations/telegram/test` sends a non-financial test to the connected creator.
- `TelegramNotificationChannels::isAvailableFor($notifiable, $key)` is reused to honor preferences at send-time.

- [ ] Write tests for event monitoring, connected test and mute after queue.
- [ ] Run focused tests RED.
- [ ] Implement migration, listener, API and UI.
- [ ] Run focused tests and TypeScript GREEN.
- [ ] Commit.

### Task 3: Scheduled retention

**Files:**
- Create: `app/Telegram/Commands/PruneTelegramRecords.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `routes/console.php`
- Test: `tests/Feature/TelegramNotificationIntegrationTest.php`

**Interfaces:**
- `telegram:prune-records` deletes consumed/expired link tokens and processed webhook IDs older than 30 days, not newer records.
- Scheduled daily and without overlap.

- [ ] Write test for old-vs-recent records.
- [ ] Run focused RED.
- [ ] Implement command and schedule.
- [ ] Run focused GREEN.
- [ ] Commit.

### Task 4: Receiving-account lifecycle notifications

**Files:**
- Create: `app/Storefront/Notifications/ReceivingAccountStatusNotification.php`
- Modify: `app/Storefront/Controllers/CreatorPaymentMethodsController.php`
- Modify: `app/Telegram/Support/TelegramNotificationPreferences.php`
- Modify: `resources/client/account-settings/integrations-page.tsx`
- Test: `tests/Feature/AdminReceivingAccountsTest.php`

**Interfaces:**
- `ReceivingAccountStatusNotification(int $accountId, string $event)` implements queued `ShouldQueue`, honors `receiving_accounts` and owner checks.
- Events: `approved`, `rejected`, `provider_registered`, `suspended`, `restored`.
- Emit only after successful state transition using `afterCommit`; never expose account numbers/reasons.

- [ ] Write failing tests for successful transitions, idempotent provider registration, safe content, and opt-out.
- [ ] Run focused RED.
- [ ] Implement notification and state-change dispatch.
- [ ] Run focused GREEN.
- [ ] Commit.

### Task 5: CI and release evidence

**Files:**
- Modify: `docs/telegram-notifications.md`

- [ ] Document new endpoints, environment requirements and deployment steps.
- [ ] Run PHP tests, TypeScript, Vitest, audits, build.
- [ ] Open draft PR, observe CI, repair any new regressions.
