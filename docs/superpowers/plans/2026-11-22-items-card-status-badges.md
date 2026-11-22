# Items Card Status Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Product and Service card status badges using the standard Base UI / shadcn `<Badge>` with non-stark semantic tint variants and no inner icons or dots.

**Architecture:** Extend `@shadcn/badge` with a `warning` variant to match the existing `positive` and `destructive` tokens. Replace custom dot-based wrappers in `digital-products-page.tsx` and stark `variant="default"` badges in `services-page.tsx` with standard `<Badge>` invocations mapped to `positive`, `warning`, `destructive`, and `secondary`.

**Tech Stack:** React 19, TypeScript, Base UI (`@base-ui/react`), Tailwind CSS v4, Class Variance Authority (`cva`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-22-items-card-status-badges-design.md`

## Global Constraints

- Never use raw color literals or hex codes; use semantic tokens (`text-warning`, `bg-warning/10`, `text-positive`, etc.).
- Never render icons, dots, or SVG elements inside the status badges for product and service cards.
- Always wrap user-facing strings in `<Trans message="..." />` from `@ui/i18n/trans`.
- Do not introduce Radix UI; use `@base-ui/react` and installed `@shadcn/*` components.

## Review Focus

1. `StatusBadge` in `digital-products-page.tsx` must not render any `<span className="... rounded-full" />` dot or icon.
2. `StatusBadge` must support the `hasPendingUpdate` prop and render `<Trans message="Update under review" />` with `variant="warning"`.
3. In `services-page.tsx`, published services must use `variant="positive"` instead of `variant="default"`.
4. `Badge` in `badge.tsx` must correctly style the `warning` variant in both light and dark mode.
5. All contract tests in `digital-products-page.test.ts` and DOM tests in `services-page.dom.test.tsx` must pass without regressions.

---

### Task 1: Add `warning` Variant and `color` Alias to `@shadcn/badge`

**Files:**
- Modify: `common/foundation/resources/client/shadcn/badge/badge.tsx`
- Modify: `common/foundation/resources/client/shadcn/badge/badge.stories.tsx`

**Interfaces:**
- Consumes: Tailwind semantic tokens `text-warning`, `bg-warning/10`, `focus-visible:ring-warning/20`.
- Produces: `BadgeVariant` supporting `'warning' | 'positive' | 'destructive' | 'secondary' | 'outline' | 'default' | 'ghost' | 'link'`.

- [ ] **Step 1: Update `badge.tsx` with `warning` variant and `color` prop**

In `common/foundation/resources/client/shadcn/badge/badge.tsx`:
Add `warning` variant to `badgeVariants`:
```tsx
warning:
  'bg-warning/10 text-warning focus-visible:ring-warning/20 dark:bg-warning/20 dark:focus-visible:ring-warning/40 [a]:hover:bg-warning/20',
```
In `Badge` props interface, accept optional `color?: VariantProps<typeof badgeVariants>['variant']` and resolve `const resolvedVariant = variant ?? color ?? 'default'`.

- [ ] **Step 2: Verify `badge.stories.tsx` compiles with new variant**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add common/foundation/resources/client/shadcn/badge/badge.tsx
git commit -m "feat(ui): add warning variant and color alias to shadcn badge"
```

---

### Task 2: Refactor `StatusBadge` in `digital-products-page.tsx` to Use Standard `<Badge>`

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-products-page.tsx:755-816`
- Modify: `resources/client/dashboard/digital-products/digital-products-page.test.ts:88-96`

**Interfaces:**
- Consumes: `<Badge>` from `@shadcn/badge/badge`.
- Produces: `StatusBadge({status, hasPendingUpdate, className})` returning `<Badge>`.

- [ ] **Step 1: Update `StatusBadge` implementation in `digital-products-page.tsx`**

Replace custom `div` and dot `<span className="size-1.5 rounded-full ...">` with standard `<Badge>`:
```tsx
function StatusBadge({
  status,
  hasPendingUpdate = false,
  className,
}: {
  status: ProductStatus;
  hasPendingUpdate?: boolean;
  className?: string;
}) {
  const isPendingUpdate = status === 'approved' && hasPendingUpdate;

  if (isPendingUpdate) {
    return (
      <Badge variant="warning" className={className}>
        <Trans message="Update under review" />
      </Badge>
    );
  }

  switch (status) {
    case 'pending_approval':
      return (
        <Badge variant="warning" className={className}>
          <Trans message="In review" />
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="positive" className={className}>
          <Trans message="Live" />
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className={className}>
          <Trans message="Needs changes" />
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="secondary" className={className}>
          <Trans message="Archived" />
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className={className}>
          <Trans message="Draft" />
        </Badge>
      );
  }
}
```

- [ ] **Step 2: Update contract assertions in `digital-products-page.test.ts`**

Verify and ensure assertions in `digital-products-page.test.ts` pass, confirming:
- `<StatusBadge` is positioned in `<Card.Header>` with `absolute top-3 left-3`.
- No inner dot or icon is present in `StatusBadge`.
- `hasPendingUpdate` renders `<Trans message="Update under review" />`.

- [ ] **Step 3: Run Vitest on `digital-products-page.test.ts`**

Run: `npm test resources/client/dashboard/digital-products/digital-products-page.test.ts`
Expected: PASS (12/12 tests passing).

- [ ] **Step 4: Commit**

```bash
git add resources/client/dashboard/digital-products/digital-products-page.tsx resources/client/dashboard/digital-products/digital-products-page.test.ts
git commit -m "feat(dashboard): refactor digital product status badge to standard Badge"
```

---

### Task 3: Standardize `ServiceCard` Badge in `services-page.tsx`

**Files:**
- Modify: `resources/client/dashboard/services/services-page.tsx:367-375`

**Interfaces:**
- Consumes: `<Badge variant="positive">` and `<Badge variant="secondary">`.
- Produces: Non-stark status badges for services matching digital products.

- [ ] **Step 1: Update status badge in `services-page.tsx`**

Change line 368 from:
```tsx
<Badge variant={service.status === 'published' ? 'default' : 'secondary'}>
```
to:
```tsx
<Badge variant={service.status === 'published' ? 'positive' : 'secondary'}>
```

- [ ] **Step 2: Run DOM tests on `services-page.dom.test.tsx`**

Run: `npm test resources/client/dashboard/services/services-page.dom.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add resources/client/dashboard/services/services-page.tsx
git commit -m "feat(dashboard): use non-stark positive variant for published service badge"
```

---

### Task 4: Full Verification

**Files:**
- Entire repository

- [ ] **Step 1: Run TypeScript compiler check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS with 0 errors.

- [ ] **Step 2: Run ESLint**

Run: `npm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 3: Run related tests**

Run: `npm test resources/client/dashboard/digital-products/ resources/client/dashboard/services/`
Expected: PASS.
