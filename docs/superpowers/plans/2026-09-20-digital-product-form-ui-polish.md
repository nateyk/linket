# Digital Product Form UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the digital-product creation flow (`/dashboard/my-products/new/*`) with reusable form primitives, wizard-to-form prefill, a live preview, breadcrumb, focus management, and per-section skeletons — using only semantic tokens and existing shadcn/Base UI components.

**Architecture:** Keep all API calls and routes unchanged. Wizard state travels via URL query params (`type`, `billing`, `price_cents`); the form page initializes a form-level `ProductCreationProvider` from those params and reassembles its UI from four new primitives. Pure helpers are exported for unit tests; component wiring is covered by the repo's existing source-assertion test style.

**Tech Stack:** React 19, Tailwind CSS v4, Base UI (`@base-ui/react`), shadcn `base-luma`, `react-router`, `vitest`, `oxlint`.

**Spec:** `docs/superpowers/specs/2026-09-20-digital-product-form-ui-polish-design.md`

## Global Constraints

- Semantic tokens only: no hex, no `rgb()`/`oklch()` inline, no Tailwind color literals (`bg-blue-500`), no arbitrary radius/shadow (`rounded-[20px]`, `shadow-[...]`).
- Radius via `rounded-card`, `rounded-card-sm`, `rounded-card-xs`, `rounded-input`, `rounded-button` only.
- Spacing via `gap-*`; never `space-x-*` / `space-y-*`. Equal sizes via `size-*`.
- Reuse `@shadcn/*` components; do not reinvent. Icons from `lucide-react` only. No Radix imports.
- No `dark:` overrides on new UI. No backdrop blur, gradient text, glow shadows, hover transforms, or new fonts.
- User strings wrapped in `<Trans message="..." />` from `@ui/i18n/trans`.
- New files use repo kebab-case naming (`product-form-field.tsx`), matching `product-create-wizard.tsx`.
- Keep existing API call strings verbatim (`/api/v1/digital-products/${productId}`, `/api/v1/biolinks?fields_preset=minimal`, `uploadType="digitalProductFiles"`, `saved = response.data.data as Product;`).
- `npm test` = `vitest run`. Lint with `npx oxlint <paths>`.

---

### Task 1: Wizard prefill transport (URL carries billing + typed prefill parser)

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-create-flow.ts`
- Test: `resources/client/dashboard/digital-products/product-create-flow.test.ts`

**Interfaces:**
- Consumes: `WizardState`, `parseEtbToCents`, `initialPriceFromParam` (existing, unchanged).
- Produces: `buildCreateUrl(state): string | null` (now appends `&billing=<free|paid>` on details URLs; course URLs unchanged), `parseWizardPrefill(params: URLSearchParams): WizardPrefill` where `export interface WizardPrefill { type: ProductType | null; billing: BillingMode | null; price: string | null; }`.

- [ ] **Step 1: Write the failing tests**

```ts
// append to resources/client/dashboard/digital-products/product-create-flow.test.ts
import {parseWizardPrefill} from './product-create-flow';

describe('wizard prefill transport', () => {
  test('details urls carry the billing mode', () => {
    expect(
      buildCreateUrl({type: 'ebook', billing: 'paid', price: '10'}),
    ).toBe(
      '/dashboard/my-products/new/details?type=ebook&billing=paid&price_cents=1000',
    );
    expect(
      buildCreateUrl({type: 'audio', billing: 'free', price: ''}),
    ).toBe('/dashboard/my-products/new/details?type=audio&billing=free');
  });
  test('course urls are unchanged', () => {
    expect(
      buildCreateUrl({type: 'course', billing: 'paid', price: '19.99'}),
    ).toBe('/dashboard/my-products/new/course?price_cents=1999');
  });
  test('parseWizardPrefill validates type, billing, and price', () => {
    expect(
      parseWizardPrefill(
        new URLSearchParams('type=ebook&billing=paid&price_cents=1000'),
      ),
    ).toEqual({type: 'ebook', billing: 'paid', price: '10'});
    expect(
      parseWizardPrefill(
        new URLSearchParams('type=bogus&billing=paid&price_cents=1000'),
      ).type,
    ).toBeNull();
    expect(
      parseWizardPrefill(
        new URLSearchParams('type=ebook&billing=bogus&price_cents=1000'),
      ).billing,
    ).toBeNull();
    expect(
      parseWizardPrefill(new URLSearchParams('type=audio&billing=free')).price,
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-flow.test.ts`
Expected: FAIL — `buildCreateUrl` output lacks `billing`; `parseWizardPrefill` is not defined.

- [ ] **Step 3: Implement billing param + parser**

```ts
// in resources/client/dashboard/digital-products/product-create-flow.ts
export interface WizardPrefill {
  type: ProductType | null;
  billing: BillingMode | null;
  price: string | null;
}

const PRODUCT_TYPES: ProductType[] = ['digital', 'ebook', 'audio', 'course'];

export function parseWizardPrefill(params: URLSearchParams): WizardPrefill {
  const rawType = params.get('type');
  const rawBilling = params.get('billing');
  const type: ProductType | null =
    rawType && (PRODUCT_TYPES as string[]).includes(rawType)
      ? (rawType as ProductType)
      : null;
  const billing: BillingMode | null =
    rawBilling === 'free' || rawBilling === 'paid' ? rawBilling : null;
  return {
    type,
    billing,
    price: initialPriceFromParam(params.get('price_cents')),
  };
}
```

Change the details branch of `buildCreateUrl` to:

```ts
return `/dashboard/my-products/new/details?type=${state.type}&billing=${state.billing}${
  state.billing === 'paid' ? `&price_cents=${cents}` : ''
}`;
```

Leave the `course` branch byte-identical. Update the two existing `buildCreateUrl` expectations in `product-create-flow.test.ts` to include `&billing=paid` / `&billing=free`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-flow.test.ts`
Expected: PASS (all suites, including the pre-existing `parseEtbToCents`, `wizard steps`, `initialPriceFromParam` blocks).

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-create-flow.ts resources/client/dashboard/digital-products/product-create-flow.test.ts
git commit -m "feat(products): carry billing mode in wizard urls and parse prefill"
```

---

### Task 2: ProductCreationContext provider + pure initial-state resolver

**Files:**
- Create: `resources/client/dashboard/digital-products/product-creation-context.tsx`
- Test: `resources/client/dashboard/digital-products/product-creation-context.test.ts`

**Interfaces:**
- Consumes: `ProductType` from `./product-type-picker`, `BillingMode` + `WizardPrefill` from `./product-create-flow`.
- Produces: `export interface FileEntry { id: number; name: string; file_size?: number; extension?: string; }`, `export interface ProductFormState { title: string; description: string; price: string; coverUrl: string; coverFileId: number | null; files: FileEntry[]; biolinkIds: number[]; productType: ProductType; }`, `export function resolveInitialFormState(prefill: WizardPrefill | null): ProductFormState`, `export function ProductCreationProvider({prefill, children}: {prefill: WizardPrefill | null; children: React.ReactNode})`, `export function useProductCreation(): {state: ProductFormState; actions: {...}}` (throws `new Error('useProductCreation must be used within ProductCreationProvider')` outside provider). Actions: `setTitle, setDescription, setPrice, setCover(url, entry?), setFiles, setBiolinkIds, setProductType, clear`.

- [ ] **Step 1: Write the failing tests**

```ts
// resources/client/dashboard/digital-products/product-creation-context.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {resolveInitialFormState} from './product-creation-context';

describe('resolveInitialFormState', () => {
  test('applies wizard prefill for a fresh product', () => {
    expect(
      resolveInitialFormState({
        type: 'ebook',
        billing: 'paid',
        price: '19.99',
      }),
    ).toEqual({
      title: '',
      description: '',
      price: '19.99',
      coverUrl: '',
      coverFileId: null,
      files: [],
      biolinkIds: [],
      productType: 'ebook',
    });
  });
  test('falls back to digital with empty price when prefill is absent', () => {
    expect(resolveInitialFormState(null)).toMatchObject({
      productType: 'digital',
      price: '',
    });
  });
});

describe('product creation provider wiring', () => {
  test('exports a provider, hook, and state actions', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-creation-context.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('ProductCreationProvider');
    expect(source).toContain('useProductCreation');
    expect(source).toContain('setBiolinkIds');
    expect(source).toContain('must be used within ProductCreationProvider');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-context.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// resources/client/dashboard/digital-products/product-creation-context.tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {BillingMode, WizardPrefill} from './product-create-flow';
import type {ProductType} from './product-type-picker';

export interface FileEntry {
  id: number;
  name: string;
  file_size?: number;
  extension?: string;
}

export interface ProductFormState {
  title: string;
  description: string;
  price: string;
  coverUrl: string;
  coverFileId: number | null;
  files: FileEntry[];
  biolinkIds: number[];
  productType: ProductType;
}

export interface ProductCreationActions {
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setPrice: (value: string) => void;
  setCover: (url: string, entry?: {id: number}) => void;
  setFiles: (files: FileEntry[]) => void;
  setBiolinkIds: (ids: number[]) => void;
  setProductType: (type: ProductType) => void;
  clear: () => void;
}

const EMPTY_STATE: ProductFormState = {
  title: '',
  description: '',
  price: '',
  coverUrl: '',
  coverFileId: null,
  files: [],
  biolinkIds: [],
  productType: 'digital',
};

export function resolveInitialFormState(
  prefill: WizardPrefill | null,
): ProductFormState {
  if (!prefill) return {...EMPTY_STATE};
  return {
    ...EMPTY_STATE,
    price: prefill.price ?? '',
    productType: prefill.type ?? 'digital',
  };
}

const ProductCreationContext = createContext<{
  state: ProductFormState;
  actions: ProductCreationActions;
  billing: BillingMode | null;
} | null>(null);

export function ProductCreationProvider({
  prefill,
  children,
}: {
  prefill: WizardPrefill | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<ProductFormState>(() =>
    resolveInitialFormState(prefill),
  );
  const setTitle = useCallback(
    (title: string) => setState(current => ({...current, title})),
    [],
  );
  const setDescription = useCallback(
    (description: string) => setState(current => ({...current, description})),
    [],
  );
  const setPrice = useCallback(
    (price: string) => setState(current => ({...current, price})),
    [],
  );
  const setCover = useCallback(
    (coverUrl: string, entry?: {id: number}) =>
      setState(current => ({
        ...current,
        coverUrl,
        coverFileId: entry?.id ?? null,
      })),
    [],
  );
  const setFiles = useCallback(
    (files: FileEntry[]) => setState(current => ({...current, files})),
    [],
  );
  const setBiolinkIds = useCallback(
    (biolinkIds: number[]) => setState(current => ({...current, biolinkIds})),
    [],
  );
  const setProductType = useCallback(
    (productType: ProductType) =>
      setState(current => ({...current, productType})),
    [],
  );
  const clear = useCallback(() => setState({...EMPTY_STATE}), []);
  const value = useMemo(
    () => ({
      state,
      actions: {
        setTitle,
        setDescription,
        setPrice,
        setCover,
        setFiles,
        setBiolinkIds,
        setProductType,
        clear,
      },
      billing: prefill?.billing ?? null,
    }),
    [
      state,
      setTitle,
      setDescription,
      setPrice,
      setCover,
      setFiles,
      setBiolinkIds,
      setProductType,
      clear,
      prefill,
    ],
  );
  return (
    <ProductCreationContext.Provider value={value}>
      {children}
    </ProductCreationContext.Provider>
  );
}

export function useProductCreation() {
  const context = useContext(ProductCreationContext);
  if (!context) {
    throw new Error(
      'useProductCreation must be used within ProductCreationProvider',
    );
  }
  return context;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-context.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-creation-context.tsx resources/client/dashboard/digital-products/product-creation-context.test.ts
git commit -m "feat(products): add product creation context with wizard prefill"
```

---

### Task 3: ProductFormField + ProductFormSection primitives

**Files:**
- Create: `resources/client/dashboard/digital-products/product-form-field.tsx`
- Create: `resources/client/dashboard/digital-products/product-form-section.tsx`
- Test: `resources/client/dashboard/digital-products/product-form-primitives.test.ts`

**Interfaces:**
- Consumes: `Field` from `@shadcn/forms/field`, `Accordion` from `@shadcn/accordion/accordion`, `BuilderSectionHeader` from `@app/dashboard/stores/store-editor/builder-section-header`, `Badge` from `@shadcn/badge/badge`, `Trans` from `@ui/i18n/trans`. Setup-section ids: `export type ProductSetupSection = 'details' | 'files' | 'bio-pages'` (defined in `product-form-section.tsx`; the form page imports it instead of its local `SetupSection`).
- Produces: `ProductFormField({label, description?, error?, htmlFor?, required?, children})`, `ProductFormSection({id, title, description, icon, isComplete, count?, hasError?, children})`. `ProductFormField` sets `invalid={!!error}` on `Field.Root` and renders the error via `Field.Error`. `ProductFormSection` renders `Accordion.Item` (`value={id}`) + `Accordion.Trigger` wrapping `BuilderSectionHeader` (with count `Badge`) + `Accordion.Content` with inner `max-w-2xl` wrapper.

- [ ] **Step 1: Write the failing tests**

```ts
// resources/client/dashboard/digital-products/product-form-primitives.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const fieldSource = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/digital-products/product-form-field.tsx',
  ),
  'utf8',
);
const sectionSource = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/digital-products/product-form-section.tsx',
  ),
  'utf8',
);

describe('product form primitives', () => {
  test('field wires label, description, and invalid state through shadcn Field', () => {
    expect(fieldSource).toContain("from '@shadcn/forms/field'");
    expect(fieldSource).toContain('Field.Root');
    expect(fieldSource).toContain('Field.Label');
    expect(fieldSource).toContain('Field.Description');
    expect(fieldSource).toContain('Field.Error');
    expect(fieldSource).toContain('invalid={');
  });
  test('section reuses accordion, builder header, and badge', () => {
    expect(sectionSource).toContain("from '@shadcn/accordion/accordion'");
    expect(sectionSource).toContain('BuilderSectionHeader');
    expect(sectionSource).toContain("from '@shadcn/badge/badge'");
    expect(sectionSource).toContain('Accordion.Item');
    expect(sectionSource).toContain('Accordion.Trigger');
    expect(sectionSource).toContain('Accordion.Content');
  });
  test('primitives carry no raw visual values', () => {
    for (const source of [fieldSource, sectionSource]) {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(source).not.toMatch(/rounded-\[/);
      expect(source).not.toMatch(/shadow-\[/);
      expect(source).not.toMatch(/bg-(blue|gray|white|black)-/);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/product-form-primitives.test.ts`
Expected: FAIL — files do not exist (`ENOENT` on readFileSync).

- [ ] **Step 3: Write minimal implementations**

```tsx
// resources/client/dashboard/digital-products/product-form-field.tsx
import {Field} from '@shadcn/forms/field';
import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';

interface ProductFormFieldProps {
  label: string;
  description?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}

export function ProductFormField({
  label,
  description,
  error,
  htmlFor,
  required = false,
  children,
}: ProductFormFieldProps) {
  return (
    <Field.Root invalid={!!error}>
      <Field.Label htmlFor={htmlFor}>
        <Trans message={label} />
        {required && <span aria-hidden="true"> *</span>}
      </Field.Label>
      {children}
      {description && (
        <Field.Description>
          <Trans message={description} />
        </Field.Description>
      )}
      {error && <Field.Error>{error}</Field.Error>}
    </Field.Root>
  );
}
```

```tsx
// resources/client/dashboard/digital-products/product-form-section.tsx
import {BuilderSectionHeader} from '@app/dashboard/stores/store-editor/builder-section-header';
import {Accordion} from '@shadcn/accordion/accordion';
import {Badge} from '@shadcn/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

export type ProductSetupSection = 'details' | 'files' | 'bio-pages';

interface ProductFormSectionProps {
  id: ProductSetupSection;
  title: string;
  description: string;
  icon: LucideIcon;
  isComplete: boolean;
  count?: number | null;
  hasError?: boolean;
  children: ReactNode;
}

export function ProductFormSection({
  id,
  title,
  description,
  icon,
  isComplete,
  count,
  hasError = false,
  children,
}: ProductFormSectionProps) {
  return (
    <Accordion.Item
      value={id}
      className={cn(hasError && 'border-destructive/40')}
    >
      <Accordion.Trigger>
        <BuilderSectionHeader
          icon={icon}
          isComplete={isComplete}
          title={<Trans message={title} />}
          description={<Trans message={description} />}
          trailing={
            count !== null && count !== undefined && count > 0 ? (
              <Badge
                variant="secondary"
                className="h-4 min-w-[16px] px-1 text-[10px]"
              >
                {count}
              </Badge>
            ) : undefined
          }
        />
      </Accordion.Trigger>
      <Accordion.Content className="border-t pt-4">
        <div className="max-w-2xl">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-form-primitives.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-form-field.tsx resources/client/dashboard/digital-products/product-form-section.tsx resources/client/dashboard/digital-products/product-form-primitives.test.ts
git commit -m "feat(products): add product form field and section primitives"
```

---

### Task 4: ProductPreview + ProductFormProgress primitives

**Files:**
- Create: `resources/client/dashboard/digital-products/product-preview.tsx`
- Create: `resources/client/dashboard/digital-products/product-form-progress.tsx`
- Test: `resources/client/dashboard/digital-products/product-preview.test.ts`

**Interfaces:**
- Consumes: `useProductCreation` from `./product-creation-context`, `ProductCard` from `@app/digital-products/shared/product-card`, `Button` from `@shadcn/button/button`, `Progress` from `@shadcn/progress/progress`, `Tooltip` from `@shadcn/tooltip/tooltip`, `Trans`/`useTrans` from `@ui/i18n`, `PRODUCT_TYPE_CONFIG`-equivalent label map (local `PRODUCT_TYPE_LABELS: Record<ProductType, string>` for `digital|ebook|audio|course`).
- Produces: `export function formatPreviewPrice(price: string): string` (returns `` `ETB ${n.toFixed(2)}` `` or `'ETB 0.00'` for non-finite input), `export function ProductStatus({status}: {status: string})` (moved verbatim from the form page, including its icon/tone/label map and Tooltip pattern), `export function ProductPreview()` (no props; reads context; renders status row + `ProductCard` with disabled Buy-now action wrapped in `Tooltip`), `export function ProductFormProgress({completed, total}: {completed: number; total: number})` (renders "Product setup" label, `:completed of :total required sections complete` via `Trans`, and `Progress.Root value={(completed/total)*100}` with `h-2` track).

- [ ] **Step 1: Write the failing tests**

```ts
// resources/client/dashboard/digital-products/product-preview.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {formatPreviewPrice} from './product-preview';

describe('formatPreviewPrice', () => {
  test('formats finite input to two decimals', () => {
    expect(formatPreviewPrice('19.99')).toBe('ETB 19.99');
    expect(formatPreviewPrice('10')).toBe('ETB 10.00');
  });
  test('falls back for empty or non-numeric input', () => {
    expect(formatPreviewPrice('')).toBe('ETB 0.00');
    expect(formatPreviewPrice('abc')).toBe('ETB 0.00');
  });
});

describe('product preview wiring', () => {
  test('preview reuses the shared product card and live context', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain(
      "import {ProductCard} from '@app/digital-products/shared/product-card'",
    );
    expect(source).toContain('useProductCreation');
    expect(source).toContain('<ProductCard');
    expect(source).toContain('Tooltip.Content');
  });
  test('progress shows completed ratio through shadcn progress', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-form-progress.tsx',
      ),
      'utf8',
    );
    expect(source).toContain("from '@shadcn/progress/progress'");
    expect(source).toContain('Progress.Root');
    expect(source).toContain('Progress.Indicator');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/product-preview.test.ts`
Expected: FAIL — `./product-preview` module does not exist.

- [ ] **Step 3: Write minimal implementations**

```tsx
// resources/client/dashboard/digital-products/product-preview.tsx
import {ProductCard} from '@app/digital-products/shared/product-card';
import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ArchiveIcon,
  CheckIcon,
  Clock3Icon,
  FileIcon,
  PackageOpenIcon,
  PencilIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import {useProductCreation} from './product-creation-context';
import type {ProductType} from './product-type-picker';

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  digital: 'Digital product',
  ebook: 'E-book',
  audio: 'Audio',
  course: 'Course',
};

export function formatPreviewPrice(price: string): string {
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice)
    ? `ETB ${numericPrice.toFixed(2)}`
    : 'ETB 0.00';
}

export function ProductPreview() {
  const {
    state: {title, price, coverUrl, files, productType},
  } = useProductCreation();
  const {trans} = useTrans();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          <Trans message="Customer preview" />
        </p>
      </div>
      <ProductCard
        images={coverUrl ? [coverUrl] : []}
        title={title.trim() || trans({message: 'Your digital product'})}
        tags={[trans({message: PRODUCT_TYPE_LABELS[productType]})]}
        price={formatPreviewPrice(price)}
        meta={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileIcon className="size-4" aria-hidden="true" />
            <Trans
              message=":count download files"
              values={{count: files.length}}
            />
          </span>
        }
        action={
          <Tooltip.Root>
            <Tooltip.Trigger
              aria-label={trans({message: 'Preview only'})}
              render={
                <span className="inline-flex">
                  <Button disabled>
                    <Trans message="Buy now" />
                  </Button>
                </span>
              }
            >
              <FileIcon className="size-4" aria-hidden="true" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <Trans message="Preview only — not purchasable yet" />
            </Tooltip.Content>
          </Tooltip.Root>
        }
        imageFallback={
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <PackageOpenIcon className="size-8" aria-hidden="true" />
            <span className="text-xs">
              <Trans message="Add a cover image" />
            </span>
          </div>
        }
      />
    </div>
  );
}

export function ProductStatus({status}: {status: string}) {
  const configs: Record<
    string,
    {icon: LucideIcon; tone: string; label: string}
  > = {
    draft: {
      icon: PencilIcon,
      tone: 'text-muted-foreground bg-muted',
      label: 'Draft',
    },
    pending_approval: {
      icon: Clock3Icon,
      tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
      label: 'In review',
    },
    approved: {
      icon: CheckIcon,
      tone: 'text-primary bg-primary/10',
      label: 'Approved',
    },
    rejected: {
      icon: TriangleAlertIcon,
      tone: 'text-destructive bg-destructive/10',
      label: 'Needs changes',
    },
    archived: {
      icon: ArchiveIcon,
      tone: 'text-muted-foreground bg-muted',
      label: 'Archived',
    },
  };
  const config = configs[status] ?? configs.draft;
  const Icon = config.icon;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label={config.label}
        render={
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-card-sm ${config.tone}`}
          />
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message={config.label} />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
```

```tsx
// resources/client/dashboard/digital-products/product-form-progress.tsx
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';

export function ProductFormProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <Trans message="Product setup" />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans
            message=":completed of :total required sections complete"
            values={{completed, total}}
          />
        </p>
      </div>
      <Progress.Root
        value={(completed / total) * 100}
        className="w-full lg:w-48"
        aria-label="Product setup progress"
      >
        <Progress.Track className="h-2">
          <Progress.Indicator />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
}
```

Note: `ProductStatus` is moved verbatim from `digital-product-form-page.tsx` (same icon/tone/label map, same Tooltip `render`-prop pattern); the form page will import it from `./product-preview` in Task 5 and delete its local copy. The `pending_approval` tone keeps the existing `dark:text-amber-400` because it is a verbatim move — no new `dark:` overrides are introduced.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-preview.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-preview.tsx resources/client/dashboard/digital-products/product-form-progress.tsx resources/client/dashboard/digital-products/product-preview.test.ts
git commit -m "feat(products): add live product preview and setup progress primitives"
```

---

### Task 5: Form page reassembly (provider, primitives, breadcrumb)

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx`
- Test: `resources/client/dashboard/digital-products/digital-product-form-page.test.tsx` (append new assertions; keep all existing ones passing)

**Interfaces:**
- Consumes: `ProductCreationProvider` + `useProductCreation` + `FileEntry` type from `./product-creation-context`, `parseWizardPrefill` from `./product-create-flow`, `ProductFormSection` + `ProductSetupSection` from `./product-form-section`, `ProductFormField` from `./product-form-field`, `ProductPreview` + `ProductStatus` from `./product-preview`, `ProductFormProgress` from `./product-form-progress`, `Breadcrumb` from `@shadcn/breadcrumb/breadcrumb`, `useSearchParams` from `react-router`.
- Produces: unchanged route `Component` (still wraps in `FileUploadProvider`); form state now lives in the provider; `SECTION_META` keeps the same three labels/descriptions/icons; all API strings, `getValidationErrors`, save/submit/delete logic, and `DetailsPanel`/`FilesPanel`/`BioPagesPanel` behavior unchanged except that their inputs are rendered through `ProductFormField` and sections through `ProductFormSection`.

- [ ] **Step 1: Write the failing tests (append to the existing file)**

```tsx
// append inside resources/client/dashboard/digital-products/digital-product-form-page.test.tsx
describe('product form reassembly', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
    ),
    'utf8',
  );

  test('initializes the creation provider from wizard query params', () => {
    expect(source).toContain('parseWizardPrefill');
    expect(source).toContain('<ProductCreationProvider');
    expect(source).toContain('useProductCreation');
  });

  test('renders sections, progress, preview, and breadcrumb through primitives', () => {
    expect(source).toContain('<ProductFormSection');
    expect(source).toContain('<ProductFormProgress');
    expect(source).toContain('<ProductPreview');
    expect(source).toContain("from '@shadcn/breadcrumb/breadcrumb'");
    expect(source).toContain('<Breadcrumb');
    expect(source).toContain('All products');
  });

  test('invalid fields carry accessible error state', () => {
    expect(source).toContain('<ProductFormField');
    expect(source).toContain('aria-invalid');
  });
});
```

(`fs` and `path` are already imported at the top of that test file.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx`
Expected: FAIL — new assertions missing (`parseWizardPrefill`, `ProductCreationProvider`, `Breadcrumb`, `aria-invalid`).

- [ ] **Step 3: Reassemble the form page**

Apply these edits to `resources/client/dashboard/digital-products/digital-product-form-page.tsx` (nothing else in the file changes unless listed):

1. Replace the local `type FileEntry` and `type SetupSection` declarations with imports:
```tsx
import type {FileEntry} from './product-creation-context';
import type {ProductSetupSection} from './product-form-section';
```
and rename usages `SetupSection` → `ProductSetupSection` (`openSection` state, `isSectionComplete`, `SECTION_ORDER`).
2. Wrap the form: `Component` renders `<FileUploadProvider><ProductCreationProvider prefill={parseWizardPrefill(searchParams)}><DigitalProductForm /></ProductCreationProvider></FileUploadProvider>` — read `useSearchParams` in `Component` for this. Delete the local `useState` block for `title/description/price/coverUrl/coverFileId/files/biolinkIds` and instead `const {state, actions} = useProductCreation()` at the top of `DigitalProductForm`, mapping `title = state.title` etc. Keep `product/biоlinks/loading/saving/submitting/error/fieldErrors/convertToEtb/deleteDialogOpen/openSection` local state as-is. Price initialization (`initialPriceFromParam`) is deleted — the provider already seeds price from prefill. For edit mode (`productId` present), the existing fetch effect calls the context actions (`actions.setTitle`, `actions.setPrice`, `actions.setCover`, `actions.setFiles`, `actions.setBiolinkIds`, `actions.setProductType`) instead of local setters.
3. Replace the inline progress header block with `<ProductFormProgress completed={completedSections} total={2} />` and the accordion items with `<ProductFormSection id={section} title={...} description={...} icon={...} isComplete={...} count={...} hasError={section === 'details' ? !!(fieldErrors.title || fieldErrors.price_cents) : section === 'files' ? !!fieldErrors.file_ids : false}>`.
4. Replace each `Field.Root/Label/Description` group inside `DetailsPanel` with `<ProductFormField label="..." description="..." error={...} htmlFor="..." required>`, adding `id="product-title"` + `aria-invalid={!!errors.title}` to the title `Input`, and `id="product-price"` + `aria-invalid={!!errors.price_cents}` to the price `InputGroupInput`.
5. Replace the `aside` preview block with `<ProductPreview />` plus the existing `<ProductStatus status={...} />` row (import `ProductStatus` from `./product-preview`; delete the local `ProductStatus` definition and its now-unused icon imports `ArchiveIcon/BookIcon?/CheckIcon/Clock3Icon/PencilIcon/TriangleAlertIcon` only if unused elsewhere — `BookIcon` is used in `PRODUCT_TYPE_CONFIG`, keep it).
6. Add the breadcrumb above the header actions inside `DashboardLayout.SectionHeader`:
```tsx
<Breadcrumb>
  <Breadcrumb.Item>
    <Breadcrumb.Link to="/dashboard/my-products">
      <Trans message="All products" />
    </Breadcrumb.Link>
  </Breadcrumb.Item>
  <Breadcrumb.Separator />
  <Breadcrumb.Item>
    <Breadcrumb.Page>
      <Trans message={pageTitle} />
    </Breadcrumb.Page>
  </Breadcrumb.Item>
</Breadcrumb>
```
7. Change the grid to `xl:grid-cols-[minmax(0,1fr)_26rem]` and the section wrapper to `py-4 sm:py-5`. Keep every API string, `getValidationErrors`, and save/submit/delete logic byte-identical.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx`
Expected: PASS — all pre-existing assertions (submission gating, API envelope, course redirect, uploader wiring, approved-draft warning, file capability, preview `ProductCard`) plus the three new reassembly blocks.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/digital-product-form-page.test.tsx
git commit -m "feat(products): reassemble product form on creation context and primitives"
```

---

### Task 6: Validation focus management + per-section skeletons

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-create-flow.ts` (add `firstInvalidFieldId`)
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx` (import helper, focus effect, skeletons)
- Test: `resources/client/dashboard/digital-products/digital-product-form-page.test.tsx` (append)

**Interfaces:**
- Consumes: `FieldErrors` (local type, unchanged), section ids `ProductSetupSection`.
- Produces: `export function firstInvalidFieldId(fieldErrors: Record<string, string>): 'product-title' | 'product-price' | 'product-files' | null` in `product-create-flow.ts` (priority: `title` → `product-title`, `price_cents` → `product-price`, `file_ids` → `product-files`, `cover_file_entry_id`/`description` → `product-title`, else `null`), `DetailsSkeleton`/`FilesSkeleton`/`BioPagesSkeleton`/`PreviewSkeleton` (local components in the form page built from `Skeleton` from `@shadcn/skeleton/skeleton`), focus effect: after `setFieldErrors` with entries, `setOpenSection(...)` (existing) then `requestAnimationFrame(() => document.getElementById(firstInvalidFieldId(fieldErrors))?.focus({preventScroll: false}))`; the files uploader wrapper gets `id="product-files"` + `tabIndex={-1}`.

- [ ] **Step 1: Write the failing tests (append)**

```tsx
import {firstInvalidFieldId} from './product-create-flow';

describe('product form error focus and skeletons', () => {
  test('routes the first invalid field to a focusable id', () => {
    expect(firstInvalidFieldId({title: 'Required'})).toBe('product-title');
    expect(firstInvalidFieldId({price_cents: 'Invalid'})).toBe(
      'product-price',
    );
    expect(firstInvalidFieldId({file_ids: 'Required'})).toBe('product-files');
    expect(firstInvalidFieldId({})).toBeNull();
  });

  test('focuses the offending field and renders granular skeletons', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('firstInvalidFieldId');
    expect(source).toContain('getElementById');
    expect(source).toContain('.focus(');
    expect(source).toContain('DetailsSkeleton');
    expect(source).toContain('FilesSkeleton');
    expect(source).toContain('PreviewSkeleton');
    expect(source).toContain('id="product-files"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx`
Expected: FAIL — `firstInvalidFieldId` is not exported; skeleton names absent.

- [ ] **Step 3: Implement focus helper, focus effect, and skeletons**

```tsx
// add to resources/client/dashboard/digital-products/product-create-flow.ts
export function firstInvalidFieldId(
  fieldErrors: Record<string, string>,
): 'product-title' | 'product-price' | 'product-files' | null {
  if (fieldErrors.title) return 'product-title';
  if (fieldErrors.price_cents) return 'product-price';
  if (fieldErrors.file_ids) return 'product-files';
  if (fieldErrors.cover_file_entry_id || fieldErrors.description)
    return 'product-title';
  return null;
}
```

In the `save` catch block, after the existing `setFieldErrors(validationErrors)` + `setOpenSection(...)`, add:

```tsx
const focusId = firstInvalidFieldId(validationErrors);
if (focusId) {
  requestAnimationFrame(() => {
    document.getElementById(focusId)?.focus({preventScroll: false});
  });
}
```

Add `tabIndex={-1}` and `id="product-files"` to the wrapper `div` in `FilesPanel` (`<div className="flex flex-col gap-3" id="product-files" tabIndex={-1}>`).

Replace `BuilderSkeleton` with:

```tsx
function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}

function FilesSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function BioPagesSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
```

and render them per section while `loading` (details/files/bio-pages skeletons inside the accordion frame, `PreviewSkeleton` in the `aside`), deleting `BuilderSkeleton`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-create-flow.ts resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/digital-product-form-page.test.tsx
git commit -m "feat(products): focus first invalid field and load form sections progressively"
```

---

### Task 7: Verification pass (tokens, lint, tests, manual QA)

**Files:** none (fix-only; only commit if a fix is required).

- [ ] **Step 1: Token audit — grep touched files for raw visual values**

Run:
```bash
rg -n "#[0-9a-fA-F]{3,8}|rounded-\[|shadow-\[|bg-(blue|gray|white|black)-|dark:" resources/client/dashboard/digital-products/product-creation-context.tsx resources/client/dashboard/digital-products/product-form-field.tsx resources/client/dashboard/digital-products/product-form-section.tsx resources/client/dashboard/digital-products/product-preview.tsx resources/client/dashboard/digital-products/product-form-progress.tsx resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/product-create-flow.ts || true
```
Expected: no output, except the verbatim-moved `ProductStatus` `dark:text-amber-400` in `product-preview.tsx` (pre-existing tone, allowed as a move — do not extend it).

- [ ] **Step 2: Lint touched files**

Run: `npx oxlint resources/client/dashboard/digital-products/`
Expected: zero errors (warnings acceptable only if pre-existing on untouched lines).

- [ ] **Step 3: Run the full digital-products test directory**

Run: `npx vitest run resources/client/dashboard/digital-products/`
Expected: all suites PASS (`product-create-flow`, `product-creation-context`, `product-form-primitives`, `product-preview`, `digital-product-form-page`, plus pre-existing `billing-mode-picker`, `product-create-dialog`, `digital-products-page` suites).

- [ ] **Step 4: Manual QA checklist (report results in chat, fix issues as new commits)**

  - Wizard paid flow: type → billing=paid → price → Continue lands on `/dashboard/my-products/new/details?type=<t>&billing=paid&price_cents=<c>` with price prefilled.
  - Wizard free flow: lands with `&billing=free`, price empty.
  - Direct access to `/dashboard/my-products/new/details` (no params): form works, defaults to digital/empty price.
  - Type a title + price + cover: preview updates live (title, price, cover image).
  - Save with empty title: details section opens, title focused, inline error shown.
  - Save with no files (non-course): files section opens, uploader focused.
  - Breadcrumb renders "All products / <page title>".
  - `soft-pop` dark preset: no unreadable text, no `dark:`-dependent layout.
  - Mobile width: accordion triggers usable, preview stacks below, no horizontal overflow.

- [ ] **Step 5: Commit only if fixes were needed**

```bash
git add -A
git commit -m "fix(products): address verification findings on product form polish"
```

Skip this step entirely when the verification pass is clean.
