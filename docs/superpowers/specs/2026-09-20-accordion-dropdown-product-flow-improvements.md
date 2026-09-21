# Accordion, Dropdown, and Product Create Flow Improvements

**Date:** 2026-09-20  
**Branch:** `fix/bulk-summary-reverted-updates`  
**Scope:** Three independent improvements — accordion connector line, dropdown positioning fix, product create flow UX enhancements

---

## 1. Accordion Vertical Connector Line

### Problem
Current accordion in `bordered` variant shows borders between items but lacks the visual continuity of a vertical connector line that runs through the icon circles, providing a clear visual path through the steps.

### Solution
Add a vertical connector line on the left side of each accordion item that:
- Runs from the top of the first trigger to the bottom of the last trigger
- Is covered by the icon circles (which have `bg-card`/`bg-background` background)
- Uses the accent color (`bg-primary/10` or similar semantic token)
- Only appears in `bordered` variant (where step continuity matters most)

### Implementation
**File:** `common/foundation/resources/client/shadcn/accordion/accordion.tsx`

Add to `AccordionItem` (in `bordered` variant):
```tsx
// Connector line - only in bordered variant
{(() => {
  if (variant !== 'bordered') return null;
  return (
    <div
      data-slot="accordion-connector"
      className="absolute left-[calc(var(--radius-card-sm)/2)] top-0 bottom-0 w-px bg-border"
    />
  );
})()}
```

Add to `AccordionTrigger` icon wrapper in `builder-section-header.tsx`:
- Ensure the icon circle has `bg-card` (or `bg-background`) to cover the line
- Already has `bg-muted`/`bg-primary/10` — add explicit `bg-card` for line coverage

---

## 2. Dropdown Page Push Fix

### Problem
Some dropdown menus cause the page content to shift/push when opened, indicating a positioning or portal issue.

### Investigation
The `DropdownContent` component already wraps content in `MenuPrimitive.Portal` which should render outside the main flow. The issue is likely:
1. Missing `Portal` in specific usage
2. `align="end"` with insufficient viewport space
3. `z-index` conflicts with sticky elements

### Solution
**Audit all dropdown usages** in `digital-products-page.tsx` and fix any:
- Ensure `Dropdown.Root` has `Dropdown.Portal` (already in `DropdownContent`)
- Add `alignOffset` / `sideOffset` where needed
- Use `side="bottom"` (default) consistently
- Check `z-index` on sticky sidebar (`lg:sticky lg:top-6`)

**Files to check/fix:**
- `resources/client/dashboard/digital-products/digital-products-page.tsx`

---

## 3. Product Create Flow UX Enhancements

### Current State
Wizard (type → billing → price) → Form page (accordion sections: details, files, bio-pages) with live preview, breadcrumb, focus management, and granular skeletons.

### Enhancements

| Enhancement | Description | Files |
|---|---|---|
| **Auto-save drafts** | Debounced (1.5s) auto-save to API `/api/v1/digital-products/draft` | `product-creation-context.tsx`, `digital-product-form-page.tsx` |
| **Inline validation** | Show field errors as user types (blur + change) | `product-form-field.tsx`, `digital-product-form-page.tsx` |
| **Wizard persistence** | Save wizard state to `localStorage` for page refresh recovery | `product-create-wizard.tsx` |
| **Enhanced preview** | Real-time character count, file size preview | `product-preview.tsx` |
| **File upload UX** | Drag-drop zone, progress bar per file, type validation | `FilesPanel`, `SharedFileUploader` |
| **Keyboard shortcuts** | Cmd+S save, Arrow keys for accordion navigation | `digital-product-form-page.tsx` |

### Auto-save API
```typescript
// In product-creation-context.tsx
const autoSave = useCallback(
  debounce(async () => {
    if (!product?.id || !dirty) return;
    await apiClient.put(`/api/v1/digital-products/${product.id}/draft`, {
      title: state.title,
      description: state.description,
      price_cents: Math.round(Number(state.price) * 100),
      currency: 'etb',
      cover_file_entry_id: state.coverFileId,
      file_ids: state.files.map(f => f.id),
      biolink_ids: state.biolinkIds,
      type: state.productType,
    });
    setDirty(false);
  }, 1500),
  [product?.id, state, dirty],
);
```

---

## Global Constraints (from core-ui-design-system)

- Semantic tokens only: `bg-background`, `text-foreground`, `border-border`, `bg-primary/10`, `rounded-card*`
- No raw hex, `rgb()`, `dark:` overrides, backdrop blur, gradient text, custom shadows
- Reuse `@shadcn/*` components; lucide-react icons only
- User strings via `<Trans message="..." />`
- Spacing via `gap-*`, `size-*`; no `space-*`

---

## Acceptance Criteria

### Accordion Connector
- [ ] Vertical line visible in `bordered` variant
- [ ] Line covered by icon circles (no line through icon)
- [ ] Line color uses `border-border` semantic token
- [ ] Works in `digital-product-form-page.tsx` accordion

### Dropdown Fix
- [ ] No page content shift when dropdown opens
- [ ] Dropdown positions correctly at viewport edges
- [ ] Works with sticky sidebar

### Product Create Flow
- [ ] Auto-save triggers after 1.5s of inactivity
- [ ] Inline validation shows on blur + change
- [ ] Wizard state persists across page refresh
- [ ] Preview shows character count, file sizes
- [ ] File upload shows progress per file
- [ ] Cmd+S saves draft, arrow keys navigate accordion

---

## File Mapping

### Phase 1: Accordion Connector
```
common/foundation/resources/client/shadcn/accordion/accordion.tsx  (modify AccordionItem)
resources/client/dashboard/stores/store-editor/builder-section-header.tsx  (ensure bg-card on icon)
```

### Phase 2: Dropdown Fix
```
resources/client/dashboard/digital-products/digital-products-page.tsx  (audit + fix)
```

### Phase 3: Product Create Flow
```
resources/client/dashboard/digital-products/product-creation-context.tsx  (auto-save, dirty tracking)
resources/client/dashboard/digital-products/product-form-field.tsx      (inline validation)
resources/client/dashboard/digital-products/digital-product-form-page.tsx (keyboard shortcuts, preview enhancements)
resources/client/dashboard/digital-products/product-create-wizard.tsx   (localStorage persistence)
```

---

## Testing Strategy

- **Accordion:** Visual regression test for connector line in `bordered` variant
- **Dropdown:** E2E test opening dropdown at viewport edges, verify no layout shift
- **Auto-save:** Unit test debounce timing, integration test API call
- **Validation:** Test blur/change error display
- **Persistence:** Test wizard state recovery after refresh
EOF
echo "Spec written"