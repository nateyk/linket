# My Items Card & Filter Toolbar Polish Design

**Date:** 2026-11-21  
**Status:** In Review  
**Approaches Considered:**
- **Approach A (Selected):** Native Base UI + shadcn adaption of unified filter menu and structured item card with status dot badge, clean vertical body hierarchy (Title → Price → Single-line metrics), and footer split (Type badge + Action icons).
- **Approach B:** Popover multi-panel checklist filter + 2x2 tabular metrics card. Rejected: Overly complex for current 2-parameter backend model; misses the sleek single-line aesthetic from the user's reference.
- **Approach C:** Horizontal segmented filter chips + Card with pinned full-button CTAs. Rejected: Breaks the user's explicit requirement ("all inside one" filter); takes excessive vertical space on mobile/tablet.

---

## 1. Intent & The Why

Creators managing digital products and courses on the Linket "My Items" dashboard need an uncluttered, professional, and standard interface to search, filter, and review their catalog.

Currently:
- The filter bar displays multiple disjointed controls (`[Search products]`, `[Status ▾]`, `[Newest ▾]`), fragmenting the toolbar.
- The item card floats a plain status badge directly over arbitrary user-uploaded cover images with inconsistent contrast, has scattered metadata, and separates price from sales/earnings.

The goal is to adapt the user's reference designs into Linket's Base UI and `@theme inline` token system, providing a clean all-in-one search & filter bar and a structured, elegant item card.

---

## 2. Goals & Non-Goals

### Goals
- **All-In-One Filter Toolbar (`CreatorListingToolbar`)**:
  - Unified search input with search icon.
  - Single **"Filter"** trigger button opening a unified Base UI `Dropdown` menu containing both **Status** and **Sort by** groups.
  - Active filter state visualization (e.g. badge counter on the button when active + dismissible chip / clear action).
  - Preserves exact server query parameters (`search`, `status`, `sort`, `page`).
- **Structured Item Card (`ProductCard`)**:
  - **Cover Badge**: Pill badge anchored top-left featuring a colored status dot indicator (`● Draft`, `● In review`, `● Live`, `● Needs changes`, `● Archived`, `● Update under review`) over a high-contrast neutral container (`bg-background/90 text-foreground ring-1 ring-foreground/10 backdrop-blur-none`) that guarantees legibility over any cover image.
  - **Content Rhythm**:
    - Product title as an accessible hover link.
    - Price formatted directly beneath title (`$5` / `369.00 Br` / `Free access`).
    - Single-line metrics row: `:count sales · :revenue earned` in muted secondary typography.
    - Rejection notice alert callout directly below metrics when status is `rejected`.
  - **Footer Action Bar**:
    - Left: Product type pill badge (`Course` or `Digital download`) using `@shadcn/badge` (`variant="secondary"`).
    - Right: Action icons row: Copy link (`CopyIcon`), Open live storefront (`ExternalLinkIcon`), and More options menu (`MoreHorizontalIcon` dropdown).
- **Design System Fidelity**:
  - 100% semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-foreground/10`, `rounded-card`, `rounded-card-sm`).
  - Base UI primitives (`@shadcn/*`), zero Radix.
  - No hover scale transforms (`hover:scale-105`), no raw hex/colors, no `dark:` overrides (theme presets and dark mode resolve automatically).
  - All user-facing strings wrapped in `<Trans message="..." />` / `trans({message: '...'})`.

### Non-Goals
- No backend API alterations (schema and query contracts remain identical).
- No changes to product editing or course builder wizard pages.
- No introduction of third-party table/filter state libraries.

---

## 3. Detailed Component Architecture

### A. `CreatorListingToolbar` (`resources/client/dashboard/creator-listing-toolbar.tsx`)
```tsx
<div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
  {/* Search input with leading icon */}
  <div className="relative flex-1 sm:max-w-xs">
    <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      type="search"
      value={search}
      onChange={e => onSearchChange(e.target.value)}
      placeholder={searchLabel}
      className="h-9 ps-9"
    />
  </div>

  {/* All-In-One Filter Trigger */}
  <div className="flex items-center gap-2">
    <Dropdown.Root>
      <Dropdown.Trigger render={<Button variant="outline" size="sm" className="h-9 gap-2 px-3" />}>
        <ListFilterIcon className="size-4 text-muted-foreground" />
        <Trans message="Filter" />
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="px-1.5 py-0 text-xs">
            {activeFilterCount}
          </Badge>
        )}
      </Dropdown.Trigger>
      <Dropdown.Content align="start" className="min-w-56">
        {/* Status Group */}
        <Dropdown.Group>
          <Dropdown.GroupLabel><Trans message="Status" /></Dropdown.GroupLabel>
          <Dropdown.RadioGroup value={status || 'all'} onValueChange={...}>
            <Dropdown.RadioItem value="all"><Trans message="All statuses" /></Dropdown.RadioItem>
            {statusOptions.map(...)}
          </Dropdown.RadioGroup>
        </Dropdown.Group>

        <Dropdown.Separator />

        {/* Sort Group */}
        <Dropdown.Group>
          <Dropdown.GroupLabel><Trans message="Sort by" /></Dropdown.GroupLabel>
          <Dropdown.RadioGroup value={sort ?? defaultSort} onValueChange={...}>
            {sortOptions.map(...)}
          </Dropdown.RadioGroup>
        </Dropdown.Group>
      </Dropdown.Content>
    </Dropdown.Root>

    {/* Clear action when filters active */}
    {filtersActive && (
      <Button variant="ghost" size="sm" onClick={onClear} className="h-9 gap-1 text-muted-foreground">
        <XIcon className="size-3.5" />
        <Trans message="Clear" />
      </Button>
    )}
  </div>
</div>
```

### B. `StatusBadge` with Indicator Dot (`resources/client/dashboard/digital-products/digital-products-page.tsx`)
Rendered inside `absolute top-3 left-3`:
```tsx
<div className="inline-flex items-center gap-1.5 rounded-card-xs bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs ring-1 ring-foreground/10">
  <span className={cn('size-1.5 rounded-full', statusDotColor)} aria-hidden="true" />
  <span>{statusLabel}</span>
</div>
```
Status Dot Colors:
- `draft`: `bg-muted-foreground`
- `pending_approval`: `bg-amber-500`
- `approved`: `bg-emerald-500`
- `rejected`: `bg-rose-500`
- `archived`: `bg-muted-foreground/60`
- `has_pending_update`: `bg-amber-500`

### C. `ProductCard` Content & Footer Hierarchy
```tsx
<Card.Root className="group flex h-full flex-col gap-0 overflow-hidden py-0 ring-1 ring-foreground/10 transition-shadow hover:shadow-sm">
  <Card.Header className="relative block p-0">
    <Link to={editPath} className="block aspect-video overflow-hidden bg-muted ...">
      {/* Cover image or fallback */}
    </Link>
    <div className="absolute top-3 left-3">
      <StatusBadge status={product.status} hasPendingUpdate={product.has_pending_update} />
    </div>
  </Card.Header>

  <Card.Content className="flex flex-1 flex-col gap-1.5 p-4 pb-0">
    {/* Title */}
    <Card.Title className="truncate text-sm font-semibold leading-5">
      <Link to={editPath} className="hover:underline hover:underline-offset-3">
        {product.title}
      </Link>
    </Card.Title>

    {/* Price */}
    <div className="text-sm font-semibold text-foreground">
      {product.price_cents === 0 ? <Trans message="Free access" /> : <FormattedCurrency ... />}
    </div>

    {/* Single-line Metrics */}
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <SalesLabel count={product.sales_count} />
      <span>·</span>
      <span>
        <Trans
          message=":amount earned"
          values={{
            amount: formatMoney(product.gross_revenue_cents, product.currency.toUpperCase()),
          }}
        />
      </span>
    </div>

    {/* Rejection callout if applicable */}
    {(product.status === 'rejected' || product.status === 'pending_approval') && product.rejection_reason && (
      <div className="mt-1 flex gap-2 rounded-card-sm bg-destructive/8 p-2.5 text-xs text-destructive">
        <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
        <span className="line-clamp-2">{product.rejection_reason}</span>
      </div>
    )}
  </Card.Content>

  <Card.Footer className="mt-auto flex items-center justify-between gap-3 px-4 py-3 pt-3">
    {/* Left: Type Badge */}
    <Badge variant="secondary" className="font-normal text-muted-foreground">
      {isCourse ? <Trans message="Course" /> : <Trans message="Digital download" />}
    </Badge>

    {/* Right: Actions */}
    <div className="flex items-center gap-1">
      {primaryBiolink && product.status === 'approved' && (
        <>
          <Button size="icon-sm" variant="ghost" onClick={copyPublicUrl}>
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </Button>
          <Button size="icon-sm" variant="ghost" render={<a href={publicUrl} target="_blank" />}>
            <ExternalLinkIcon />
          </Button>
        </>
      )}
      <ProductActions product={product} ... />
    </div>
  </Card.Footer>
</Card.Root>
```

---

## 4. Verification & Testing Strategy

1. **Vitest Contract Tests (`digital-products-page.test.ts`)**:
   - Ensure all existing assertions continue to pass (or are updated if verifying new hierarchy like the single-line metrics or the unified toolbar).
   - Test that `CreatorListingToolbar` renders the all-in-one Filter trigger and maintains status/sort parameters.
2. **Visual & Theme Verification**:
   - Verify readability in default (`soft-pop`), `brutalist`, and `tangerine` presets.
   - Verify both light mode and dark mode for contrast on cover badge, card body, and dropdown.
3. **TypeScript / Lint Check**:
   - Full TypeScript build check (`npm run build` or `npm run typecheck`).
