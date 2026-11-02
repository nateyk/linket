# Telegram Integration Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver creator and admin Telegram integration settings with environment-only secrets, webhook operations, and preference-aware notification routing.

**Architecture:** Extend the merged Telegram connection model with notification preferences, add safe admin operational endpoints around the Telegram Bot API, and add integration hubs inside the existing creator and admin settings shells. Reuse Linket's existing shadcn/Base UI primitives and existing Telegram delivery package.

**Tech Stack:** Laravel 13, PHP 8.4, MySQL 8, React/TypeScript, TanStack Query/apiClient, shadcn/Base UI, laravel-notification-channels/telegram 8.x.

**Spec:** `docs/superpowers/specs/2026-11-02-telegram-integration-settings-design.md`

## Global Constraints

- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` remain environment-only.
- Telegram is notification-only and can never verify payments or alter financial/fulfillment state.
- Existing one-time hashed account linking and private-chat-only behavior remain intact.
- Use existing Account Settings and Admin Settings shells and shared primitives.
- New provider/network errors must not expose bot tokens, webhook secrets, or token-bearing Telegram URLs.

## Review Focus

- Missing/invalid environment configuration returns safe unavailable states rather than exposing credentials.
- A disconnected or globally muted creator receives no Telegram channel.
- Per-event preference opt-out suppresses only that Telegram event and does not disable mail/database delivery.
- Telegram API failures during webhook sync return sanitized errors and do not leak the token-bearing request URL.
- Admin actions stay protected by both admin and settings-update authorization.

---

### Task 1: Backend integration settings and preference routing

**Files:**
- Modify: `tests/Feature/TelegramNotificationIntegrationTest.php`
- Create: `tests/Feature/AdminTelegramIntegrationTest.php`
- Create: `database/migrations/2026_11_02_070000_add_preferences_to_telegram_connections.php`
- Modify: `app/Telegram/Models/TelegramConnection.php`
- Create: `app/Telegram/Support/TelegramNotificationPreferences.php`
- Modify: `app/Telegram/Support/TelegramNotificationChannels.php`
- Modify: `app/Models/User.php`
- Modify: `app/Telegram/Controllers/TelegramConnectionController.php`
- Create: `app/Telegram/Services/TelegramBotAdminService.php`
- Create: `app/Telegram/Controllers/AdminTelegramIntegrationController.php`
- Modify: `routes/api.php`

**Interfaces:**
- Produces creator Telegram settings payload including `notifications_enabled` and normalized `preferences`.
- Produces admin safe health payload and webhook sync/test endpoints.
- Produces `TelegramNotificationChannels::append(..., ?string $preferenceKey)`.

- [ ] Write failing backend feature tests for creator preferences, admin authorization/non-disclosure, safe webhook sync, and test notification preconditions.
- [ ] Run focused PHP tests and confirm expected failures.
- [ ] Implement migration, support constants, routing checks, controllers/services, and routes.
- [ ] Re-run focused PHP tests until green.
- [ ] Commit backend task.

### Task 2: Wire existing creator Telegram events to preferences

**Files:**
- Modify: `app/Storefront/Notifications/VerifiedSaleNotification.php`
- Modify: `app/CreatorServices/Notifications/NewServiceInquiryNotification.php`
- Modify: `app/Storefront/Notifications/ProductModerationNotification.php`
- Modify: `app/Storefront/Notifications/ProductModerationSummaryNotification.php`
- Modify: `app/Storefront/Notifications/PaymentDisputeStatusChangedNotification.php`
- Modify: `app/Payments/Notifications/DirectRenewalReminder.php`
- Test: `tests/Feature/TelegramNotificationIntegrationTest.php`

**Interfaces:**
- Consumes preference keys from Task 1.
- Existing mail/database channel behavior stays unchanged.

- [ ] Add failing tests proving one event can be muted while another remains eligible.
- [ ] Run focused tests and confirm RED.
- [ ] Pass the appropriate preference key to Telegram channel selection in each notification.
- [ ] Run focused tests to GREEN.
- [ ] Commit preference wiring.

### Task 3: Creator Account Settings → Integrations UI

**Files:**
- Create: `resources/client/account-settings/integrations-page.tsx`
- Create: `resources/client/account-settings/integrations-page.dom.test.tsx`
- Modify: `resources/client/account-settings/app-account-settings-page.tsx`
- Modify: `resources/client/app-router.tsx`

**Interfaces:**
- Consumes creator GET/POST/PATCH/DELETE Telegram endpoints from Task 1.

- [ ] Write DOM tests for unavailable, disconnected, connected, preference update, and disconnect-confirmation states.
- [ ] Run focused Vitest and confirm RED.
- [ ] Implement the Integrations sidebar item and Telegram settings panel with existing shared components.
- [ ] Re-run focused Vitest to GREEN.
- [ ] Commit creator UI.

### Task 4: Admin Settings → Integrations UI

**Files:**
- Create: `resources/client/admin/settings/integrations-settings.tsx`
- Create: `resources/client/admin/settings/integrations-settings.dom.test.tsx`
- Modify: `resources/client/admin/admin-routes.tsx`
- Modify: `resources/client/admin/admin-config.tsx`

**Interfaces:**
- Consumes admin health, webhook sync, and test endpoints from Task 1.

- [ ] Write DOM tests for ready/not-ready configuration, secret non-display, sync status, and test notification states.
- [ ] Run focused Vitest and confirm RED.
- [ ] Implement the Admin Integrations settings route/nav and Telegram operational panel.
- [ ] Re-run focused Vitest to GREEN.
- [ ] Commit admin UI.

### Task 5: Documentation and regression verification

**Files:**
- Modify: `docs/telegram-notifications.md`

**Interfaces:**
- Documents environment-only secret policy, creator/admin routes, webhook sync, and preference behavior.

- [ ] Update deployment/operations documentation.
- [ ] Run focused PHP tests, focused Vitest, TypeScript typecheck, and formatter/lint gates used by CI.
- [ ] Run the full CI workflow through the pull request and resolve any regression.
- [ ] Commit documentation/final fixes.
