# Linket Telegram V1.2 — Creator Lifecycle Alerts

## Outcome
Extend the merged creator Telegram notification channel with private-chat confirmation and creator-critical non-financial updates: free verified-sale quota milestones, Pro activation/renewal/past-due/expiry, and buyer-payment verification requiring review.

## Invariants
1. Telegram is notification-only. No chat action may approve Verify.et results, mark orders paid, create entitlements, change receiving accounts, activate Pro, or bypass free-sale limits.
2. Only authoritative, persisted Linket state transitions emit these alerts, never raw provider claims. A duplicate webhook or scheduler pass must not generate duplicate transition alerts.
3. Every notification rechecks creator ownership, relevant persisted status and current Telegram opt-in at delivery, using `TelegramNotificationChannels::isAvailableFor`; no buyer contact details, transaction references, full settlement account, receipt, or raw provider evidence in messages.
4. All notification failures are isolated from payment verification, order fulfillment, and subscription lifecycle logic. Queued delivery waits until transaction commit.
5. Connection confirmation is sent only for a consumed one-time `/start` link in a private chat, only to the linked chat, and is idempotent.
6. Free alerts are based on consumed **verified** free sales, not reserved checkouts; warn at the last three consumption counts (e.g. 8/10, 9/10, 10/10). Warnings are deduplicated per creator, configured lifetime limit, and count.
7. Only Verify.et Pro payment settlement can emit activation/renewal. The scheduled lifecycle command may emit past-due and expired updates only when database state changes. Legacy Chapa subscriptions remain untouched.
8. Review-needed alerts are sent only when a Verify.et order is transitioned into `manual_review` (not for mismatches that are conclusively failed and not for pending/verifying).
9. Honor creator category toggles in `Account Settings → Integrations → Telegram`, including `free_sales_quota` and `payment_review`. Existing `pro_billing` controls all Pro lifecycle events.
10. No production bot token, webhook secret, private chat ID, buyer PII, full receiving number, or Verify.et payload in admin audit logs or API responses.

## Phased implementation
- Connection success: queued notification targeted to the successfully linked private chat.
- Free usage: milestone dedup records with unique (creator_id,limit,consumed), read-only informative message and Pro link.
- Pro lifecycle: event notification using subscription id + event, behind Verify.et activation/renewal and safe state-specific command transitions.
- Payment review: small helper called from the existing conditional order status transitions (buyer submit/recheck, webhook, reconciliation) and the free-allowance special path; notices only, no manual payment override.
- Tests: webhook replay/invalid token, muted/ownership, quota duplicates, Pro state transitions, review notification idempotency, strict financial isolation, TS typecheck/frontend tests, complete CI.

## Non-goals
Telegram command center /sales, AI, Mini App, Business Bot, inside-Telegram ETB checkout, security account alerts without authoritative event source, or changing financial accounting/settlement.
