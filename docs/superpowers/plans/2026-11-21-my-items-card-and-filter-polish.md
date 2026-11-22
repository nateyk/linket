# My Items Card & Filter Toolbar Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the My Items dashboard by implementing an all-in-one Search & Filter toolbar and a structured, standard ProductCard with cover status dot badge, clean vertical body hierarchy, and footer type pill with action icons.

**Architecture:** Refactor `CreatorListingToolbar` to unify search and filtering into a single "Filter" dropdown containing status and sort dimensions. Refactor `ProductCard` in `digital-products-page.tsx` to introduce a high-contrast cover status dot badge, single-line `:count sales · :revenue earned` metrics, and a split footer separating type pill from action buttons. Adhere strictly to Base UI (`@shadcn/*`) primitives and `@theme inline` design tokens.

**Tech Stack:** React 19, Tailwind CSS v4, Base UI (`@base-ui/react`), `@shadcn/*` (Dropdown, Button, Badge, Card, Tooltip, Input), Lucide icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-my-items-card-and-filter-polish-design.md`

## Global Constraints

- Semantic tokens only: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `ring-foreground/10`, `border-border`, `rounded-card`, `rounded-card-sm`, `rounded-card-xs`.
- Base UI primitives from `@shadcn/*`, zero Radix UI.
- No arbitrary hex colors or Tailwind color literals (`bg-blue-500`, `#fff`).
- No vetoed effects: no `backdrop-blur-*`, no `bg-clip-text`, no hover scale (`group-hover:scale-*`), no arbitrary box shadows.
- No `dark:` class overrides on new UI; theme presets (`soft-pop`, `brutalist`, `tangerine`) and dark mode resolve through CSS variables.
- Wrap all user-facing strings in `<Trans message="..." />` or `trans({message: '...'})`.

## Review Focus

1. **Cover status badge legibility on pure white / busy covers:** Badge must use a high-contrast neutral pill container (`bg-background/90 text-foreground ring-1 ring-foreground/10`) with a colored status dot so it remains clear under any background.
2. **All-in-one Filter trigger active state:** When a status or non-default sort is active, the Filter button must indicate active filtering with an indicator count badge (e.g. `Filter (1)`) and render the "Clear" button.
3. **Price and currency display when zero:** If `price_cents === 0`, render `<Trans message="Free access" />`; otherwise format price with `FormattedCurrency`.
4. **Sales and revenue formatting:** Metrics row must display on a single line (`:count sales · :amount earned`) without wrapping or overflowing card bounds.
5. **Services page compatibility:** `CreatorListingToolbar` is also used by `services-page.tsx`; ensure the updated toolbar props and behavior maintain full backward compatibility with `services-page.tsx`.

---

### Task 1: Refactor `CreatorListingToolbar` to All-In-One Filter

**Files:**
- Modify: `resources/client/dashboard/creator-listing-toolbar.tsx`

**Interfaces:**
- Consumes: `Props` (`search`, `searchLabel`, `onSearchChange`, `status`, `onStatusChange`, `statusOptions`, `sort`, `onSortChange`, `sortOptions`, `defaultSort`, `onClear`)
- Produces: Updated `CreatorListingToolbar` with search input and unified `Filter` trigger containing Status and Sort dropdown groups.

- [ ] **Step 1: Write test expectation for unified toolbar**
Verify `digital-products-page.test.ts` expects `CreatorListingToolbar` with unified Filter trigger and status/sort options inside `Dropdown.Content`.

- [ ] **Step 2: Update `CreatorListingToolbar` component**
Update `resources/client/dashboard/creator-listing-toolbar.tsx`:
- Render search input with `SearchIcon` in a pill/standard input container.
- Render single `Dropdown.Root` with trigger button labeled "Filter" (`ListFilterIcon`, `<Trans message="Filter" />`), showing an active badge if `activeFilterCount > 0`.
- Inside `Dropdown.Content`, render two groups: `Dropdown.Group` for Status (radio items) and `Dropdown.Group` for Sort (radio items) separated by `Dropdown.Separator`.
- Render the clear action button if filters are active.

- [ ] **Step 3: Verify syntax and lint**
Run node syntax check:
`node --check resources/client/dashboard/creator-listing-toolbar.tsx || npx tsc --noEmit`

---

### Task 2: Polish `ProductCard` & `StatusBadge` in `digital-products-page.tsx`

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-products-page.tsx`

**Interfaces:**
- Consumes: `Product` object from API (`status`, `has_pending_update`, `price_cents`, `currency`, `sales_count`, `gross_revenue_cents`, `title`, `cover`, `is_course`, `type`, `biolinks`)
- Produces: Polished `ProductCard` and `StatusBadge` with status dot indicator, vertical hierarchy (Title → Price → Single-line metrics), and footer type pill with action icons.

- [ ] **Step 1: Implement `StatusBadge` with indicator dot**
In `resources/client/dashboard/digital-products/digital-products-page.tsx`:
- Update `StatusBadge` to render a pill with `bg-background/90 text-foreground ring-1 ring-foreground/10 px-2.5 py-1 text-xs font-medium rounded-card-xs`.
- Include a colored status dot `size-1.5 rounded-full` based on status (`bg-muted-foreground` for draft/archived, `bg-amber-500` for pending/update, `bg-emerald-500` for approved/live, `bg-rose-500` for rejected).

- [ ] **Step 2: Update `ProductCard` content & footer layout**
- Under `Card.Content`:
  - `Card.Title` linking to edit/course page.
  - Price text: `text-sm font-semibold text-foreground` (`<Trans message="Free access" />` or `<FormattedCurrency ... />`).
  - Single-line metrics: `<SalesLabel count={product.sales_count} /> <span>·</span> <Trans message=":amount earned" ... />` in `text-xs text-muted-foreground`.
  - Rejection alert banner if `status === 'rejected'` or `pending_approval` with `rejection_reason`.
- Under `Card.Footer`:
  - Left: `<Badge variant="secondary" className="font-normal text-muted-foreground">{isCourse ? <Trans message="Course" /> : <Trans message="Digital download" />}</Badge>`.
  - Right: Action icons cluster (`copyPublicUrl`, external link, and `ProductActions` `...` dropdown).

- [ ] **Step 3: Verify syntax**
`node --check resources/client/dashboard/digital-products/digital-products-page.tsx`

---

### Task 3: Update Contract Tests in `digital-products-page.test.ts`

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-products-page.test.ts`

**Interfaces:**
- Consumes: Source text of `digital-products-page.tsx` and `creator-listing-toolbar.tsx`
- Produces: Passing contract test suite verifying the updated architecture and visual hierarchy.

- [ ] **Step 1: Update source assertions**
Ensure assertions verify:
- Status on cover uses `absolute top-3 left-3` with `<StatusBadge` and `ring-1 ring-foreground/10`.
- Price beneath title and single-line sales + earned metrics in `Card.Content`.
- Footer contains type badge (`Digital download` / `Course`) and `<ProductActions`.
- Unified toolbar contains `<CreatorListingToolbar` with status and sort options.

- [ ] **Step 2: Run test verification script**
Run verification node script against `digital-products-page.test.ts`.

---

### Task 4: Full Verification & Compatibility Check

**Files:**
- Verify: `resources/client/dashboard/digital-products/digital-products-page.tsx`
- Verify: `resources/client/dashboard/creator-listing-toolbar.tsx`
- Verify: `resources/client/dashboard/services/services-page.tsx`

- [ ] **Step 1: Check `services-page.tsx` compatibility**
Verify that `services-page.tsx` compiles cleanly with the updated `CreatorListingToolbar`.

- [ ] **Step 2: Review all checklist items from `core-ui-design-system`**
- [ ] Every color/shadow/radius is a semantic token; no hex, no `rounded-[...]`, no `shadow-[...]`.
- [ ] Components reused from `@shadcn/*`; none reinvented.
- [ ] Spacing uses `gap-*` and `size-*`; no `space-y-*`, no `w-4 h-4`.
- [ ] No vetoed effects (backdrop blur, gradient text, glow shadows, hover transforms).
- [ ] Zero `dark:` overrides on new UI.
- [ ] Strings wrapped in `<Trans />`.
