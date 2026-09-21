# Digital Product Form — UI/UX Polish Design

**Date:** 2026-09-20  
**Branch:** `fix/bulk-summary-reverted-updates` (or new feature branch)  
**Scope:** Comprehensive polish of `/dashboard/my-products/new/details` and wizard flow

---

## 1. Problem Statement

The digital product creation flow spans two pages:
1. **Wizard** (`/my-products/new` → `/my-products/new/details`) — 3 steps: type, billing, price
2. **Form** (`/my-products/new/details`) — Accordion sections: details, files, bio-pages

Current issues:
- **Visual inconsistency:** Spacing rhythm varies; tokens not consistently applied
- **Wizard↔Form disconnect:** User selections in wizard don't pre-fill form; context lost on navigation
- **Preview panel:** Static, doesn't reflect live form state
- **Form UX:** Validation errors don't auto-focus offending section; no breadcrumb
- **Accessibility gaps:** Missing `data-invalid`/`aria-invalid`, focus management
- **Loading states:** Monolithic skeleton; no progressive section rendering

---

## 2. Design Approach (Approach B — Component Composition Overhaul)

Extract reusable primitives, introduce a `ProductCreationContext` to bridge wizard and form, reassemble the form page with consistent tokens and patterns.

### 2.1 New Context Layer

**File:** `resources/client/dashboard/digital-products/product-creation-context.tsx`

```typescript
interface ProductCreationContextValue {
  wizardPrefill: {
    type?: ProductType;
    billing?: BillingMode;
    price?: string;
  } | null;
  formState: {
    title: string;
    description: string;
    price: string;
    coverUrl: string;
    files: FileEntry[];
    biolinkIds: number[];
    productType: ProductType;
  };
  actions: {
    setTitle: (v: string) => void;
    setDescription: (v: string) => void;
    setPrice: (v: string) => void;
    setCover: (url: string, entry?: {id: number}) => void;
    setFiles: (files: FileEntry[]) => void;
    setBiolinkIds: (ids: number[]) => void;
    setProductType: (t: ProductType) => void;
    clear: () => void;
  };
}
```

- Wizard writes prefill on finish; form page reads on mount
- Context is optional — direct form access still works

### 2.2 Component Primitives

| File | Purpose |
|---|---|
| `ProductFormSection.tsx` | Accordion item with completion badge, icon, error routing, consistent header |
| `ProductFormField.tsx` | Unified `Field.Root` wrapper (label, description, error, InputGroup support) |
| `ProductPreview.tsx` | Standalone preview consuming context (real-time) |
| `ProductFormProgress.tsx` | Progress bar + label (replaces inline progress) |

### 2.3 Visual/Token Alignment

- **Spacing:** `gap-4` throughout; `py-4 sm:py-5` sections; `xl:grid-cols-[minmax(0,1fr)_26rem]`
- **Colors:** Semantic tokens only (`bg-background`, `text-foreground`, `border-border`, `bg-primary/10`, `text-destructive`)
- **Radius:** `rounded-card`, `rounded-card-sm`, `rounded-input`, `rounded-button`
- **No raw values:** Zero hex, `rgb()`, `oklch()`, `bg-blue-500`, `rounded-[20px]`, custom shadows
- **Dark mode:** Free via token system — no `dark:` overrides

### 2.4 Preview Enhancements

- Real-time sync from context (title, price, cover, file count, type label)
- Disabled "Buy now" with tooltip: "Preview only — not purchasable yet"
- Reuses `ProductCard` + `ProductStatus` (zero new components)

### 2.5 Form UX & Validation

- Inline errors via `Field.Description` in `text-destructive`
- `data-invalid` + `aria-invalid` on all inputs (shadcn Field handles)
- On validation error: auto-open offending section, focus first invalid field
- Price: `InputGroup` with ETB prefix, `step="0.01"`, `min="0"`

### 2.6 Wizard → Form Flow

- Wizard `finishUrl` includes query params: `?type=digital&billing=paid&price=29.99`
- Form page reads `URLSearchParams` on mount, merges with context prefill
- Breadcrumb: `Breadcrumb` from `@shadcn/breadcrumb` — "All products → Create → Product details"

### 2.7 Accessibility

- Accordion: Base UI `Accordion.Root` (already correct)
- Buttons: `disabled` + `aria-disabled`, `Spinner` for loading
- Focus order: header actions → progress → sections → preview
- Error announcements: `Alert.Root` with `role="alert"`
- Preview: `aria-hidden="true"` on decorative icons

### 2.8 Loading/Skeleton States

- Per-section skeletons (details, files, bio-pages) replacing `BuilderSkeleton`
- Preview skeleton: image, title, price, meta
- Progressive render as data loads

---

## 3. File Mapping

### Phase 1: Context & Primitives (New Files)
```
resources/client/dashboard/digital-products/
├── product-creation-context.tsx      # Context + Provider + hooks
├── ProductFormSection.tsx            # Accordion section wrapper
├── ProductFormField.tsx              # Field.Root wrapper
├── ProductPreview.tsx                # Preview panel
└── ProductFormProgress.tsx           # Progress bar + label
```

### Phase 2: Wizard Integration
```
resources/client/dashboard/digital-products/
├── product-create-wizard.tsx         # Write prefill to context on finish
└── product-create-flow.ts            # buildCreateUrl adds query params
```

### Phase 3: Form Page Reassembly
```
resources/client/dashboard/digital-products/
└── digital-product-form-page.tsx     # Rewrite using primitives + context
```

### Phase 4: Polish & A11y
- Breadcrumb in form header
- Granular skeletons
- Preview tooltip
- Focus management on error

---

## 4. Testing Strategy

- **Existing tests:** Update `digital-product-form-page.test.tsx` assertions for new structure
- **New tests:** Context prefill, section completion logic, preview sync
- **Manual QA:** Wizard→form flow, direct form access, save/submit, validation errors, mobile accordion

---

## 5. Risk Mitigation

- Context is optional — legacy form works during transition
- No API changes — purely client-side
- Accordion uses existing Base UI primitives (no new dependencies)
- Shadcn components already installed — `Breadcrumb` available

---

## 6. Acceptance Criteria

- [ ] Wizard selections pre-fill form (type, billing, price)
- [ ] Preview updates in real-time as user edits form
- [ ] Validation errors auto-open section + focus first invalid field
- [ ] Breadcrumb shows in form header
- [ ] All colors/spacing/radius use semantic tokens (zero raw values)
- [ ] Dark mode works without `dark:` overrides
- [ ] Skeleton loads progressively per section
- [ ] Existing vitest tests pass (updated for new selectors)
- [ ] Mobile accordion works (touch, keyboard, screen reader)
