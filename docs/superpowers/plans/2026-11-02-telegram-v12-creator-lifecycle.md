# Telegram V1.2 Creator Lifecycle Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe, preference-aware Telegram creator lifecycle notifications for a successful bot link, free-sale quota milestones, verified Pro billing changes and manual payment review.

**Architecture:** Extend the existing Laravel 13 notification classes and webhook/billing/fulfillment services. Emit informational queued notices after persisted transitions; use guarded shouldSend() and owner checks at queue delivery; keep financial state unmodified by Telegram errors.

**Tech Stack:** Laravel 13, PHP 8.4, MySQL 8, Laravel Notification Channels Telegram v8, React TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-telegram-v12-creator-lifecycle-design.md`

## Global Constraints
- Never send real provider calls or real Telegram messages from tests; fake notifications and HTTP.
- Never emit a notification solely because a buyer submitted an unverified receipt.
- Do not update or merge `main` until all CI checks succeed and the PR is reviewed.
- Keep current routes/UI and no new bot commands.

## Review Focus
- Retried or concurrent webhook must send zero duplicates and must not send before successful verification.
- Creator disconnect/reconnect or toggling a preference while queued must prevent unauthorized/stale notifications.
- A creator must never receive another creator's order or subscription information.
- Notification exceptions must never roll back or abort payment settlement.
- A changed free quota limit must not produce incorrect "remaining" or duplicate milestone labels.

---

### Task 1: Connection acknowledgement
**Files:** `app/Telegram/Notifications/TelegramConnectedNotification.php`, `app/Telegram/Services/TelegramAccountLinker.php`, `tests/Feature/TelegramNotificationIntegrationTest.php`.
**Interface:** TelegramConnectedNotification(int $chatId) ShouldQueue; the linker triggers on first consumed /start only.
- [ ] Write failing integration test: exactly one notification after valid private /start, none after replay or invalid/group token, message targets same chat and does not leak token.
- [ ] Verify RED via focused PHP test on CI.
- [ ] Add notification and safe dispatch after successful link, with afterCommit and failure isolation.
- [ ] Verify GREEN.

### Task 2: Free verified-sale quota alerts
**Files:** `app/Telegram/Support/TelegramNotificationPreferences.php`, `resources/client/account-settings/integrations-page.tsx`, `app/Storefront/Services/DirectStorefrontFulfillment.php`, new `app/Storefront/Services/CreatorQuotaTelegramNotifier.php`, new `app/Storefront/Notifications/FreeQuotaMilestoneNotification.php`, new schema migration and `tests/Feature/TelegramCreatorLifecycleTest.php`.
**Interface:** `CreatorQuotaTelegramNotifier::notifyFromVerifiedOrder(StorefrontOrder $order): void`; unique milestone records ensure once per creator/limit/count.
- [ ] Test only connected opted-in users, verified sale 8/9/10 when configured limit 10, idempotent milestone, exact copy and no buyer/receiving info, no notification for Pro or unverified orders.
- [ ] Verify RED, implement dedup and preference UI, verify GREEN.

### Task 3: Pro lifecycle state notifications
**Files:** `app/Payments/Notifications/DirectProLifecycleNotification.php`, `app/Payments/VerifyEt/VerifyEtGateway.php`, `app/Payments/Commands/ProcessDirectSubscriptionRenewals.php`, `tests/Feature/TelegramCreatorLifecycleTest.php`.
**Interface:** notification (subscriptionId,event,paymentId nullable), events `activated`, `renewed`, `past_due`, `expired`, behind `pro_billing`.
- [ ] Tests that status changes notify once, Chapa untouched, duplicate Verify.et evidence causes no repeat, preference/owner respected, no provider/receipt data in message.
- [ ] Verify RED, implement guarded post-settlement dispatch and conditional scheduler updates, verify GREEN.

### Task 4: Payment review-needed alerts
**Files:** `app/Storefront/Notifications/PaymentReviewNeededNotification.php`, `app/Storefront/Services/CreatorPaymentReviewNotifier.php`, `app/Storefront/Controllers/OrderPaymentController.php`, `app/Jobs/ProcessVerifyEtWebhook.php`, `app/Payments/Commands/ReconcilePendingVerifications.php`, `app/Payments/VerifyEt/VerifyEtGateway.php`, `app/Telegram/Support/TelegramNotificationPreferences.php`, `resources/client/account-settings/integrations-page.tsx`, `tests/Feature/TelegramCreatorLifecycleTest.php`.
**Interface:** `CreatorPaymentReviewNotifier::notify(StorefrontOrder $order): void` called only after successful transition to manual_review and never authorizes payment.
- [ ] Test review-only, no warning for unmatched/verified, owner and mute, no raw provider evidence and no duplicate warning for replay.
- [ ] Verify RED, implement narrowly at existing transition call sites and shield payment processing from delivery exceptions, verify GREEN.

### Task 5: Release verification and documentation
**Files:** `docs/telegram-notifications.md` and V1.2 tests.
- [ ] Document settings, safe event descriptions and deployment (env-only bot token, queue worker, scheduler).
- [ ] Validate PHP tests, TypeScript, Vitest, production Vite build, route/cache checks, audits; review draft PR and resolve failures.
