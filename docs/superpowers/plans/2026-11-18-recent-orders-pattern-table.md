# Recent orders pattern-style table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the creator dashboard Recent orders widget to pattern-style columns (Order · Customer+avatar · Status · Amount), short status badges, and a readable mobile list.

**Architecture:** Keep `RecentOrders` inside `dashboard-home-page.tsx`. Add a widget-local short status helper + badge. Replace TanStack columns and mobile list markup; remove column-visibility UI. Update DOM tests for the new headers/labels.

**Tech Stack:** React 19, `@shadcn/table` / `avatar` / `badge` / `card`, TanStack Table, Vitest + Testing Library, `Trans`.

**Spec:** `docs/superpowers/specs/2026-11-18-recent-orders-pattern-table-design.md`

## Global Constraints

- Semantic tokens only; `@shadcn/*` then `@ui/*`; lucide icons; `<Trans message="..." />` with static strings
- Short status labels scoped to this widget only (do not change global `PaymentStatusLabel` / `paymentStatusLabel`)
- Product title under order id (desktop); with id on mobile
- No buyer image API — Avatar initials only
- Do not commit unless user asks

## File map

| File | Responsibility |
|------|----------------|
| `resources/client/dashboard/dashboard-home-page.tsx` | RecentOrders columns, toolbar, mobile list, short badge |
| `resources/client/dashboard/dashboard-home-page.dom.test.tsx` | Assert new headers, short badges, no Columns control |

---

### Task 1: Failing tests for pattern columns + short statuses

**Files:**
- Modify: `resources/client/dashboard/dashboard-home-page.dom.test.tsx`

**Produces:** Updated expectations that fail against current UI

- [ ] **Step 1:** Update tests that assert 3 headers → 4 (`Order`, `Customer`, `Status`, `Amount`)
- [ ] **Step 2:** Replace `Payment verified` / `Manual review needed` expectations with `Paid` / `Review`
- [ ] **Step 3:** Remove “Choose visible columns” / Buyer checkbox coverage; keep search + status filter + mobile list + See all orders
- [ ] **Step 4:** Run `ddev npm run test -- --run resources/client/dashboard/dashboard-home-page.dom.test.tsx` and confirm failures match the redesign

### Task 2: Implement pattern table + short badges + mobile list

**Files:**
- Modify: `resources/client/dashboard/dashboard-home-page.tsx` (`RecentOrders`, `OrderStatusBadge`)

**Consumes:** Spec status mapping; existing `DashboardOrder` shape  
**Produces:** Pattern-style UI satisfying Task 1 tests

- [ ] **Step 1:** Add widget-local short status label helper + map `OrderStatusBadge` to use it with existing Badge variants
- [ ] **Step 2:** Replace columns with `order` / `customer` / `status` / `amount`; customer cell uses `Avatar` + name + date; order cell uses `#uuid` + product title
- [ ] **Step 3:** Remove `columnVisibility` state, Columns dropdown, and related TanStack visibility config
- [ ] **Step 4:** Rebuild mobile list per spec (avatar, amount, id+product, badge+date)
- [ ] **Step 5:** Re-run DOM tests until green
- [ ] **Step 6:** Spot-check `/dashboard` at desktop and mobile widths in the running app
