# Order details Paid status polish

Date: 2026-11-23  
Status: Approved for planning

## Goal

Polish the creator Direct Billing **Order details** dialog so it looks professional and native to Core UI / shadcn, and replace legacy “Payment verified” wording with concise status labels such as **Paid**. Keep the current layout structure; do not redesign via Superdesign.

## Decisions

- Structure: keep **summary card → payment columns → delivery → footer**.
- Status copy: one concise vocabulary everywhere (filters, list badges, dialog).
- Duplicate status: show payment status **only** on the summary card; remove the Chapa section Status row.
- Legacy removal: frontend “Payment verified” strings and redundant dual short/long label paths once the concise set is the single source.
- Out of scope: backend verification models/commands, payout verify flows, new dialog chrome, Superdesign canvas redesign.

## Status labels

| Status keys | Label |
|---|---|
| `pending`, `pending_payment` | Pending |
| `verifying` | Verifying |
| `paid`, `completed`, `fulfilled` | Paid |
| `failed_verification` | Rejected |
| `manual_review` | Review |
| `expired` | Expired |

Filter option for `paid` uses **Paid** (not “Payment verified”).

Delivery lock copy updates from “until the payment is verified” to “until payment is confirmed” (or equivalent Trans message that drops “verified”).

## Layout (Order details)

1. **Summary** — Existing muted `Item` card: product title, buyer, created date, amount, **one** status `Badge` with concise labels.
2. **Payment information** — Unchanged rows: transaction reference, gateway, optional platform fee, your earnings (emphasized). Tighten spacing/hierarchy only.
3. **Chapa payment status** — When gateway is Chapa: keep **Paid at** (when present) and the short disclaimer. **Remove** the Status row that re-renders `OrderStatusBadge`.
4. **Delivery** — Same structure (access badge, download summary, file list); wording update only for the lock message.
5. **Footer** — Refresh status + Close unchanged.

Primitives stay on existing `@shadcn` Dialog / Item / Badge / Button and semantic tokens. No new component kit.

## Files

- `resources/client/dashboard/digital-products/payment-status.ts`
- `resources/client/dashboard/digital-products/payment-status-badge.tsx`
- `resources/client/dashboard/digital-products/direct-billing-page.tsx`
- Matching unit/DOM tests (`payment-status.test.ts`, `payment-status-badge.dom.test.tsx`, and Order details coverage in `direct-billing-page.dom.test.tsx` as needed)

## Cleanup

- Remove “Payment verified” from shared helpers, filter options, and tests.
- Collapse unused dual compact vs full label rendering once both paths show the same concise set (keep a single label helper / component if possible).
- Do **not** remove backend `DirectPaymentVerification` or related payment verification services.

## Tests

- Expect **Paid** (and the other concise labels) instead of “Payment verified”.
- Assert Order details does not show a second payment-status badge inside the Chapa block.
- Leave load/refresh/error dialog coverage intact unless broken by copy changes.

## Success criteria

- No “Payment verified” user-facing string in Direct Billing UI.
- Order details shows status once, with cleaner hierarchy and Core UI tokens only.
- Tests updated and green for the touched frontend files.
