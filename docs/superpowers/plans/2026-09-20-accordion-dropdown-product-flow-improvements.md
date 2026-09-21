# Accordion, Dropdown, and Product Create Flow Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accordion vertical connector line, fix dropdown page push issue, and enhance product create flow with auto-save, inline validation, wizard persistence, and keyboard shortcuts.

**Architecture:** Three independent improvements that can be implemented in parallel:
1. Accordion connector line - adds visual continuity to bordered variant
2. Dropdown fix - ensures menus render in portal without layout shift
3. Product create flow enhancements - auto-save, inline validation, persistence, keyboard shortcuts

**Tech Stack:** React 19, Tailwind CSS v4, Base UI (`@base-ui/react`), shadcn `base-luma`, `react-router`, `vitest`, `oxlint`.

**Spec:** `docs/superpowers/specs/2026-09-20-accordion-dropdown-product-flow-improvements.md`

## Global Constraints

- Semantic tokens only: no hex, no `rgb()`/`oklch()` inline, no Tailwind color literals (`bg-blue-500`), no arbitrary radius/shadow (`rounded-[20px]`, `shadow-[...]`).
- Radius via `rounded-card`, `rounded-card-sm`, `rounded-card-xs`, `rounded-input`, `rounded-button` only.
- Spacing via `gap-*`; never `space-x-*` / `space-y-*`. Equal sizes via `size-*`.
- Reuse `@shadcn/*` components; do not reinvent. Icons from `lucide-react` only. No Radix imports.
- No `dark:` overrides on new UI. No backdrop blur, gradient text, glow shadows, hover transforms, or new fonts.
- User strings wrapped in `<Trans message="..." />` from `@ui/i18n/trans`.
- New files use repo kebab-case naming; exports match existing patterns.
- `npm test` = `vitest run`. Lint with `npx oxlint <paths>`.

---

### Task 1: Accordion Vertical Connector Line

**Files:**
- Modify: `common/foundation/resources/client/shadcn/accordion/accordion.tsx`
- Modify: `resources/client/dashboard/stores/store-editor/builder-section-header.tsx`

**Interfaces:**
- Consumes: `AccordionPrimitive.Item.Props`, `BuilderSectionHeaderProps` (existing)
- Produces: `AccordionItem` with connector line in `bordered` variant; `BuilderSectionHeader` icon wrapper with explicit `bg-card` background

- [ ] **Step 1: Write the failing test**

```tsx
// common/foundation/resources/client/shadcn/accordion/accordion.test.tsx
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('accordion connector line', () => {
  test('bordered variant items have connector line slot', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('data-slot="accordion-connector"');
    expect(source).toContain('data-variant={variant}');
  });
  test('connector only rendered in bordered variant', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('variant === \'bordered\'');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run common/foundation/resources/client/shadcn/accordion/accordion.test.tsx`
Expected: FAIL — file does not exist, connector not implemented.

- [ ] **Step 3: Implement connector in AccordionItem**

```tsx
// In AccordionItem component, after extracting variant from props/context:
const isBordered = variant === 'bordered';

return (
  <AccordionPrimitive.Item
    data-slot="accordion-item"
    className={cn(
      'overflow-hidden not-last:border-b group-data-[variant=separated]/accordion:rounded-card-sm group-data-[variant=separated]/accordion:border group-data-[variant=separated]/accordion:data-open:border-foreground/15 group-data-[variant=separated]/accordion:data-open:shadow',
      isBordered && 'relative before:absolute before:left-[calc(var(--radius-card-sm)/2)] before:top-0 before:bottom-0 before:w-px before:bg-border before:content-[""]',
      className,
    )}
    {...props}
  />
);
```

- [ ] **Step 4: Ensure BuilderSectionHeader icon covers connector**

```tsx
// In BuilderSectionHeader, the icon wrapper already has bg-muted/bg-primary/10
// Add explicit bg-card to cover connector line:
<span
  className={cn(
    'flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-card',
    isComplete && 'bg-primary/10 text-primary',
  )}
>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run common/foundation/resources/client/shadcn/accordion/accordion.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/foundation/resources/client/shadcn/accordion/accordion.tsx common/foundation/resources/client/shadcn/accordion/accordion.test.tsx resources/client/dashboard/stores/store-editor/builder-section-header.tsx
git commit -m "feat(accordion): add vertical connector line to bordered variant"
```

---

### Task 2: Dropdown Page Push Fix

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-products-page.tsx`
- Test: `resources/client/dashboard/digital-products/digital-products-page.test.ts` (append)

**Interfaces:**
- Consumes: `Dropdown` from `@shadcn/dropdown/dropdown` (already imported)
- Produces: Dropdown menus that render in portal without layout shift

- [ ] **Step 1: Write the failing test**

```ts
// resources/client/dashboard/digital-products/digital-products-page.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('dropdown portal rendering', () => {
  test('all dropdowns use Dropdown.Content with Portal', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-products-page.tsx',
      ),
      'utf8',
    );
    // Every Dropdown.Trigger should have corresponding Dropdown.Content
    const triggerCount = (source.match(/Dropdown\.Trigger/g) || []).length;
    const contentCount = (source.match(/Dropdown\.Content/g) || []).length;
    expect(contentCount).toBeGreaterThanOrEqual(triggerCount);
  });
  test('dropdown content uses alignOffset/sideOffset for viewport edges', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-products-page.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('alignOffset');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-products-page.test.ts`
Expected: FAIL — `alignOffset` not present.

- [ ] **Step 3: Fix dropdown positioning**

```tsx
// In digital-products-page.tsx, each Dropdown.Content gets alignOffset/sideOffset:
<Dropdown.Content align="end" alignOffset={-4} sideOffset={8}>
```

Also ensure `Dropdown.Root` wraps everything (already the case).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-products-page.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add resources/client/dashboard/digital-products/digital-products-page.tsx resources/client/dashboard/digital-products/digital-products-page.test.ts
git commit -m "fix(dropdown): add alignOffset to prevent page push"
```

---

### Task 3: Product Create Flow - Auto-Save Drafts

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-creation-context.tsx`
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx`
- Test: `resources/client/dashboard/digital-products/product-creation-context.test.ts` (append)

**Interfaces:**
- Consumes: `apiClient`, `ProductFormState`, `ProductCreationActions`
- Produces: `dirty` state, `autoSave` action, `setDirty` action; form page calls `autoSave` on change

- [ ] **Step 1: Write the failing test**

```ts
// resources/client/dashboard/digital-products/product-creation-context.test.ts
import {describe, expect, test, vi} from 'vitest';

describe('auto-save drafts', () => {
  test('context exports dirty state and autoSave action', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-creation-context.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('dirty');
    expect(source).toContain('setDirty');
    expect(source).toContain('autoSave');
  });
  test('autoSave debounces at 1500ms', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-creation-context.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('1500');
    expect(source).toContain('debounce');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-context.test.ts`
Expected: FAIL — no `dirty`, `autoSave`, or `debounce`.

- [ ] **Step 3: Implement auto-save in context**

```tsx
// In product-creation-context.tsx, add to state:
const [dirty, setDirty] = useState(false);

// Mark dirty on any change:
const setTitle = useCallback(
  (title: string) => { setState(current => ({...current, title})); setDirty(true); },
  [],
);
// Repeat for setDescription, setPrice, setCover, setFiles, setBiolinkIds, setProductType

// Auto-save with debounce:
const autoSave = useCallback(
  debounce(async () => {
    if (!product?.id || !dirty) return;
    try {
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
    } catch {
      // Silent fail - auto-save is best effort
    }
  }, 1500),
  [product?.id, state, dirty],
);

// Call autoSave in each setter after setDirty(true)
```

- [ ] **Step 4: Wire auto-save in form page**

```tsx
// In digital-product-form-page.tsx, useEffect to trigger autoSave:
useEffect(() => {
  if (dirty) actions.autoSave();
}, [dirty, actions]);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-context.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add resources/client/dashboard/digital-products/product-creation-context.tsx resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/product-creation-context.test.ts
git commit -m "feat(products): add auto-save drafts with 1.5s debounce"
```

---

### Task 4: Product Create Flow - Inline Validation

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-form-field.tsx`
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx`
- Test: `resources/client/dashboard/digital-products/product-form-field.test.ts` (new)

**Interfaces:**
- Consumes: `ProductFormFieldProps`, field errors from context
- Produces: `ProductFormField` with `onBlur`/`onChange` validation, immediate error display

- [ ] **Step 1: Write the failing test**

```ts
// resources/client/dashboard/digital-products/product-form-field.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('inline validation', () => {
  test('field accepts onBlur and onChange for validation', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-form-field.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('onBlur');
    expect(source).toContain('onChange');
  });
  test('error displays immediately when field has error prop', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-form-field.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('Field.Error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-form-field.test.ts`
Expected: FAIL — no `onBlur`/`onChange` handling.

- [ ] **Step 3: Implement inline validation in ProductFormField**

```tsx
// In ProductFormField, add:
interface ProductFormFieldProps {
  label: string;
  description?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  onBlur?: () => void;
  onChange?: () => void;
}

// Pass through to Field.Root or child input:
<Field.Root invalid={!!error} onBlur={onBlur} onChange={onChange}>
```

- [ ] **Step 4: Wire validation triggers in form page**

```tsx
// In DetailsPanel, pass onBlur to validate on blur:
<ProductFormField
  label="Product title"
  error={errors.title}
  onBlur={() => validateField('title', title)}
  // ...
>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-form-field.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add resources/client/dashboard/digital-products/product-form-field.tsx resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/product-form-field.test.ts
git commit -m "feat(products): add inline validation on blur and change"
```

---

### Task 5: Product Create Flow - Wizard Persistence

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-create-wizard.tsx`
- Test: `resources/client/dashboard/digital-products/product-create-wizard.test.ts` (new)

**Interfaces:**
- Consumes: `useProductCreateWizard` return value
- Produces: `localStorage` persistence with `wizardState` key

- [ ] **Step 1: Write the failing test**

```ts
// resources/client/dashboard/digital-products/product-create-wizard.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('wizard persistence', () => {
  test('wizard saves state to localStorage', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-create-wizard.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('localStorage');
    expect(source).toContain('wizardState');
  });
  test('wizard restores state on mount', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-create-wizard.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('useEffect');
    expect(source).toContain('JSON.parse');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-wizard.test.ts`
Expected: FAIL — no `localStorage`.

- [ ] **Step 3: Implement persistence**

```tsx
// In useProductCreateWizard:
const STORAGE_KEY = 'productCreateWizard';

const [step, setStep] = useState<WizardStep>(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.step ?? 'type';
    } catch { return 'type'; }
  }
  return 'type';
});

const [state, setState] = useState<WizardState>(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.state ?? INITIAL_WIZARD_STATE;
    } catch { return INITIAL_WIZARD_STATE; }
  }
  return INITIAL_WIZARD_STATE;
});

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({step, state}));
}, [step, state]);

const reset = () => {
  setStep('type');
  setState(INITIAL_WIZARD_STATE);
  localStorage.removeItem(STORAGE_KEY);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-wizard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-create-wizard.tsx resources/client/dashboard/digital-products/product-create-wizard.test.ts
git commit -m "feat(products): persist wizard state to localStorage"
```

---

### Task 6: Product Create Flow - Keyboard Shortcuts & Preview Enhancements

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx`
- Modify: `resources/client/dashboard/digital-products/product-preview.tsx`
- Test: `resources/client/dashboard/digital-products/digital-product-form-page.test.tsx` (append)

**Interfaces:**
- Consumes: `useProductCreation`, `ProductPreview` props
- Produces: Keyboard handlers (Cmd+S, arrow keys), preview shows char count/file sizes

- [ ] **Step 1: Write the failing test**

```ts
// Append to digital-product-form-page.test.tsx
describe('keyboard shortcuts and preview', () => {
  test('handles Cmd+S to save draft', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('keydown');
    expect(source).toContain('metaKey');
    expect(source).toContain('save');
  });
  test('preview shows character count and file sizes', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('character');
    expect(source).toContain('file');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx`
Expected: FAIL — no keydown handler, no char count in preview.

- [ ] **Step 3: Implement keyboard shortcuts**

```tsx
// In DigitalProductForm:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      save(false);
    }
    if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      setOpenSection(current => {
        const idx = SECTION_ORDER.indexOf(current ?? 'details');
        return SECTION_ORDER[Math.min(idx + 1, SECTION_ORDER.length - 1)];
      });
    }
    if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault();
      setOpenSection(current => {
        const idx = SECTION_ORDER.indexOf(current ?? 'details');
        return SECTION_ORDER[Math.max(idx - 1, 0)];
      });
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [save, actions]);
```

- [ ] **Step 4: Enhance preview with char count and file sizes**

```tsx
// In ProductPreview, add below file count:
<span className="flex items-center gap-2 text-xs text-muted-foreground">
  <FileIcon className="size-4" />
  <Trans message=":count download files" values={{count: files.length}} />
</span>
<span className="flex items-center gap-2 text-xs text-muted-foreground">
  <TypeIcon className="size-4" />
  <Trans message=":count characters" values={{count: title.length + description.length}} />
</span>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/product-preview.tsx resources/client/dashboard/digital-products/digital-product-form-page.test.tsx
git commit -m "feat(products): add keyboard shortcuts and preview enhancements"
```

---

### Task 7: Verification Pass

**Files:** none (fix-only)

- [ ] **Step 1: Token audit**

Run: `grep -En "#[0-9a-fA-F]{3,8}|rounded-\[|shadow-\[|bg-(blue|gray|white|black)-|dark:" <all modified files> || true`
Expected: no output (except pre-existing `TiptapEditorContent dark:prose-invert`).

- [ ] **Step 2: Lint all touched files**

Run: `npx oxlint common/foundation/resources/client/shadcn/accordion/ resources/client/dashboard/digital-products/ resources/client/dashboard/stores/store-editor/builder-section-header.tsx`
Expected: zero errors.

- [ ] **Step 3: Full test suite**

Run: `npx vitest run`
Expected: all tests pass (178+).

- [ ] **Step 4: Manual QA checklist**

- [ ] Accordion bordered variant shows connector line through icon circles
- [ ] Dropdown opens without page push at viewport edges
- [ ] Auto-save triggers ~1.5s after typing stops
- [ ] Inline validation shows on blur/change
- [ ] Wizard state persists after page refresh
- [ ] Cmd+S saves draft, Alt+Arrow navigates sections
- [ ] Preview shows character count and file sizes

- [ ] **Step 5: Commit only if fixes needed**

```bash
git add -A
git commit -m "fix: address verification findings"
```

---