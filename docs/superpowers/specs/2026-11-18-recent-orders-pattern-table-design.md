# Recent orders pattern-style table

**Date:** 2026-11-18  
**Status:** Implemented  
**Scope:** Creator dashboard overview `RecentOrders` in `resources/client/dashboard/dashboard-home-page.tsx`

## Goal

Replace the dense product-first Recent orders widget with a pattern-style, mobile-friendly layout using Linket `@shadcn` primitives, and show **short** payment status labels on this widget.

## Non-goals

- Redesign `/dashboard/orders` full list
- Change global `PaymentStatusLabel` / `paymentStatusLabel()` strings for other surfaces
- Add buyer photo URLs (initials avatar only; no new API fields)

## Desktop (`md+`)

Columns (always visible; remove Columns dropdown and TanStack visibility for buyer/date):

| Column | Content |
|--------|---------|
| Order | Mono `#` + first 8 of uuid; product title as muted secondary line under id |
| Customer | `Avatar` size `sm` with initials fallback + buyer name (or “Guest buyer”) + date under name |
| Status | Short badge (see mapping) |
| Amount | Right-aligned `FormattedCurrency` |

Keep Card header (title, description, “See all orders”), search, and status filter toolbar.

## Mobile (`< md`)

Keep dual layout: hide table with `hidden md:block`; show stacked list `md:hidden`.

Each list row:

1. Avatar + buyer name · amount (end)
2. Order id + product title (muted, truncated)
3. Short status badge + date

No horizontal scroll. Same filter/search as desktop.

## Short status labels (widget-local)

Introduce a Recent-orders-only helper (do not change shared long labels yet):

| Status | Badge text | Badge variant |
|--------|------------|---------------|
| `pending`, `pending_payment` | Pending | warning / muted as today |
| `verifying` | Verifying | warning |
| `paid`, `completed`, `fulfilled` | Paid | positive |
| `failed_verification` | Rejected | destructive |
| `manual_review` | Review | warning |
| `expired` | Expired | destructive / muted |

Filter dropdown labels can stay as today (“Verified”, “Awaiting payment”, etc.) — only the **row badge** shortens.

## Components

- `@shadcn/table`, `@shadcn/avatar`, `@shadcn/badge`, `@shadcn/card`, existing form Select/Input
- `Trans` for all visible copy; lucide icons unchanged for toolbar/CTA
- Semantic tokens only (`text-muted-foreground`, `bg-card`, etc.)

## Tests

Update `dashboard-home-page.dom.test.tsx`:

- Expect 4 desktop headers: Order, Customer, Status, Amount
- Expect short badges: `Paid`, `Review` (not “Payment verified” / “Manual review needed”)
- Remove assertions for “Choose visible columns” / column checkbox flow
- Keep search, status filter, sort, mobile list presence, “See all orders”

## Acceptance

- Desktop matches pattern-style columns with avatar + short statuses
- Mobile list readable without horizontal scroll
- Product title still visible under order id (desktop) / with id (mobile)
- Existing overview filters/search still work on the five loaded orders
