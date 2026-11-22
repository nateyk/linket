# Items Card Status Badges Design

**Date:** 2026-11-22  
**Status:** Approved  
**Topic:** Cohesive, Non-Stark Status Badges for Product and Service Cards  

## 1. Intent and Why

The creator dashboard displays items in two main card grids: Digital Products (`digital-products-page.tsx`) and Services (`services-page.tsx`).

In a recent update:
- Digital product cards introduced a custom chip with an inner dot icon (`• Live`, `• Draft`, etc.) wrapped in a hand-rolled `div` with custom shadow and ring styling.
- Service cards used Base UI `<Badge>` with `variant="default"` for published services, resulting in a stark, high-contrast primary solid blue badge against the card cover.

The user requested:
1. Removing the inner dot / icon from status badges.
2. Eliminating stark contrast badges on product and service cards.
3. Establishing one cohesive visual language across both card types using the standard Base UI / shadcn `<Badge>` component.

## 2. Approaches Considered

- **Approach 1: Custom Dot Wrapper without Icons.** Keeping the custom `div` container with `bg-background/90` and removing just the SVG/dot.  
  *Why dropped:* Creates bespoke HTML/CSS drift instead of reusing the project's standard `@shadcn/badge` component. Violates the core-ui-design-system principle ("Use existing components first. Delete before add").

- **Approach 2: Standard Badge with `default` (Primary Solid) for Live Items.** Using `<Badge variant="default">` for live/published products and services.  
  *Why dropped:* Explicitly rejected by user ("sont ineed staret constre badges for prodecet ans screavice acars"). Solid primary fills create visually jarring buttons on top of photo and illustration covers.

- **Approach 3 (Chosen): Standard `@shadcn/badge` with Subtle Semantic Tints.**  
  Both Product and Service cards use the official Base UI `<Badge>` component. Active/live statuses use `variant="positive"` (`bg-positive/10 text-positive`), in-review statuses use `variant="warning"` (`bg-warning/10 text-warning`), rejected uses `variant="destructive"` (`bg-destructive/10 text-destructive`), and drafts/archived use `variant="secondary"`. No inner icons or dots are rendered.

## 3. Specifications

### 3.1 Badge Primitives (`common/foundation/resources/client/shadcn/badge/badge.tsx`)
- Add `warning` variant to `badgeVariants`:
  ```tsx
  warning:
    'bg-warning/10 text-warning focus-visible:ring-warning/20 dark:bg-warning/20 dark:focus-visible:ring-warning/40 [a]:hover:bg-warning/20',
  ```
- Support `color` prop as alias for `variant` (e.g. `variant = color ?? 'default'`) for backwards compatibility with Storybook and existing call sites.
- Keep standard `cva` and Base UI `useRender` composition intact.

### 3.2 Product Cards (`resources/client/dashboard/digital-products/digital-products-page.tsx`)
Refactor co-located `StatusBadge`:
- Replace custom `div` and dot `span` with standard `<Badge variant={...}>{label}</Badge>`.
- Variant & Label Mapping:
  - `approved` with `hasPendingUpdate`: `variant="warning"`, `<Trans message="Update under review" />`
  - `approved`: `variant="positive"`, `<Trans message="Live" />`
  - `pending_approval`: `variant="warning"`, `<Trans message="In review" />`
  - `rejected`: `variant="destructive"`, `<Trans message="Needs changes" />`
  - `archived`: `variant="secondary"`, `<Trans message="Archived" />`
  - `draft`: `variant="secondary"`, `<Trans message="Draft" />`
- No inner icons or dots.

### 3.3 Service Cards (`resources/client/dashboard/services/services-page.tsx`)
Update status badge in `ServiceCard`:
- `published`: `<Badge variant="positive"><Trans message="Published" /></Badge>`
- `draft`: `<Badge variant="secondary"><Trans message="Draft" /></Badge>`
- No inner icons or dots; eliminates the stark primary blue `variant="default"`.

### 3.4 Verification & Testing
- Update `resources/client/dashboard/digital-products/digital-products-page.test.ts` to assert `<StatusBadge` uses `<Badge>` and renders the correct non-stark variants.
- Verify `resources/client/dashboard/services/services-page.dom.test.tsx` passes.
- Run typecheck and lint.
