# Product creation wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn product creation into a stepped wizard (type → free/paid → price-if-paid) shared by the dialog and the full page, with price prefilled downstream.

**Architecture:** Pure flow logic lives in a framework-free module (`product-create-flow.ts`) so it is truly unit-testable; a thin hook + presentational steps (`product-create-wizard.tsx`) drive two thin shells (dialog, page); option rows are shared visuals (`option-row.tsx`); two one-line prefills wire price into the details form and course form. No backend changes.

**Tech Stack:** React 19 + TypeScript, Base-UI ToggleGroup/Toggle/Collapsible/Dialog via repo shadcn wrappers, Tailwind v4 tokens, vitest (node env, colocated `*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-09-11-product-create-wizard-design.md`

## Global Constraints

- Frontend only. No PHP, migrations, validation, or checkout changes.
- Every user-facing string via `Trans` (`import {Trans} from '@ui/i18n/trans'`).
- Flex + `gap-*` for stacks. Never `space-x-*` / `space-y-*`.
- Conditional classes via `cn()` (`import {cn} from '@ui/utils/cn'`).
- Semantic color tokens only (`bg-card`, `text-muted-foreground`, `border-border`, …). No raw colors.
- `ProductTypePicker` keeps its `value`/`onValueChange` API.
- ETB-only. Free is `price_cents: 0`. Paid requires cents `> 0`.
- Run per-task tests with `npx vitest run <test-file>`; full suite with `npm test`.
- After the last task also run `npm run lint`, `npx tsc --noEmit`, `npm run build`.

---

### Task 1: Pure flow module + unit tests

**Files:**
- Create: `resources/client/dashboard/digital-products/product-create-flow.ts`
- Create: `resources/client/dashboard/digital-products/product-create-flow.test.ts`

**Interfaces:**
- Consumes: `ProductType` from `./product-type-picker` (already exported there, line 13).
- Produces (used by Tasks 3–5 verbatim — do not rename): `BillingMode`, `WizardStep`, `WizardState`, `INITIAL_WIZARD_STATE`, `parseEtbToCents`, `initialPriceFromParam`, `visibleSteps`, `nextStep`, `prevStep`, `hasNextStep`, `canContinue`, `buildCreateUrl`.

- [ ] **Step 1: Write the failing test**

```ts
import {describe, expect, test} from 'vitest';
import {
  buildCreateUrl,
  canContinue,
  hasNextStep,
  initialPriceFromParam,
  nextStep,
  parseEtbToCents,
  prevStep,
  visibleSteps,
} from './product-create-flow';

describe('parseEtbToCents', () => {
  test('converts decimals to integer cents', () => {
    expect(parseEtbToCents('19.99')).toBe(1999);
  });
  test('trims whitespace', () => {
    expect(parseEtbToCents('  10 ')).toBe(1000);
  });
  test('rejects empty, negative, and non-numeric input', () => {
    expect(parseEtbToCents('')).toBeNull();
    expect(parseEtbToCents('   ')).toBeNull();
    expect(parseEtbToCents('-5')).toBeNull();
    expect(parseEtbToCents('abc')).toBeNull();
  });
  test('accepts zero (free)', () => {
    expect(parseEtbToCents('0')).toBe(0);
  });
});

describe('wizard steps', () => {
  test('free skips the price step', () => {
    expect(nextStep('type', null)).toBe('billing');
    expect(nextStep('billing', 'free')).toBeNull();
    expect(nextStep('billing', 'paid')).toBe('price');
    expect(nextStep('price', 'paid')).toBeNull();
    expect(prevStep('billing')).toBe('type');
    expect(prevStep('price')).toBe('billing');
    expect(prevStep('type')).toBeNull();
  });
  test('price dot only appears for paid', () => {
    expect(visibleSteps(null)).toEqual(['type', 'billing']);
    expect(visibleSteps('free')).toEqual(['type', 'billing']);
    expect(visibleSteps('paid')).toEqual(['type', 'billing', 'price']);
  });
  test('gates each step', () => {
    expect(
      canContinue('type', {type: null, billing: null, price: ''}),
    ).toBe(false);
    expect(
      canContinue('type', {type: 'ebook', billing: null, price: ''}),
    ).toBe(true);
    expect(
      canContinue('billing', {type: 'ebook', billing: null, price: ''}),
    ).toBe(false);
    expect(
      canContinue('billing', {type: 'ebook', billing: 'free', price: ''}),
    ).toBe(true);
    expect(
      canContinue('price', {type: 'ebook', billing: 'paid', price: ''}),
    ).toBe(false);
    expect(
      canContinue('price', {type: 'ebook', billing: 'paid', price: '0'}),
    ).toBe(false);
    expect(
      canContinue('price', {type: 'ebook', billing: 'paid', price: '19.99'}),
    ).toBe(true);
  });
});

describe('hasNextStep', () => {
  test('knows when a next step exists', () => {
    expect(hasNextStep('type', null)).toBe(true);
    expect(hasNextStep('billing', 'free')).toBe(false);
    expect(hasNextStep('billing', 'paid')).toBe(true);
    expect(hasNextStep('price', 'paid')).toBe(false);
  });
});

describe('initialPriceFromParam', () => {
  test('passes valid cents through as ETB text, ignores the rest', () => {
    expect(initialPriceFromParam('1999')).toBe('19.99');
    expect(initialPriceFromParam(null)).toBeNull();
    expect(initialPriceFromParam('')).toBeNull();
    expect(initialPriceFromParam('0')).toBeNull();
    expect(initialPriceFromParam('-5')).toBeNull();
    expect(initialPriceFromParam('abc')).toBeNull();
  });
});

describe('buildCreateUrl', () => {
  test('routes courses to the course page with price only when paid', () => {
    expect(
      buildCreateUrl({type: 'course', billing: 'paid', price: '19.99'}),
    ).toBe('/dashboard/my-products/new/course?price_cents=1999');
    expect(
      buildCreateUrl({type: 'course', billing: 'free', price: ''}),
    ).toBe('/dashboard/my-products/new/course');
  });
  test('routes other types to details with type and paid price', () => {
    expect(
      buildCreateUrl({type: 'ebook', billing: 'paid', price: '10'}),
    ).toBe('/dashboard/my-products/new/details?type=ebook&price_cents=1000');
    expect(
      buildCreateUrl({type: 'audio', billing: 'free', price: ''}),
    ).toBe('/dashboard/my-products/new/details?type=audio');
  });
  test('returns null while incomplete', () => {
    expect(buildCreateUrl({type: null, billing: null, price: ''})).toBeNull();
    expect(
      buildCreateUrl({type: 'digital', billing: 'paid', price: ''}),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-flow.test.ts`
Expected: FAIL with "Failed to resolve import './product-create-flow'".

- [ ] **Step 3: Write minimal implementation**

```ts
import type {ProductType} from './product-type-picker';

export type BillingMode = 'free' | 'paid';
export type WizardStep = 'type' | 'billing' | 'price';

export interface WizardState {
  type: ProductType | null;
  billing: BillingMode | null;
  price: string;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  type: null,
  billing: null,
  price: '',
};

export function parseEtbToCents(value: string): number | null {
  if (!value.trim()) return null;
  const cents = Math.round(Number(value) * 100);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export function initialPriceFromParam(param: string | null): string | null {
  if (param === null || param === '') return null;
  const cents = Number(param);
  if (!Number.isInteger(cents) || cents <= 0) return null;
  return String(cents / 100);
}

export function visibleSteps(billing: BillingMode | null): WizardStep[] {
  return billing === 'paid' ? ['type', 'billing', 'price'] : ['type', 'billing'];
}

export function nextStep(
  step: WizardStep,
  billing: BillingMode | null,
): WizardStep | null {
  if (step === 'type') return 'billing';
  if (step === 'billing') return billing === 'paid' ? 'price' : null;
  return null;
}

export function prevStep(step: WizardStep): WizardStep | null {
  if (step === 'billing') return 'type';
  if (step === 'price') return 'billing';
  return null;
}

export function hasNextStep(
  step: WizardStep,
  billing: BillingMode | null,
): boolean {
  return nextStep(step, billing) !== null;
}

export function canContinue(step: WizardStep, state: WizardState): boolean {
  if (step === 'type') return state.type !== null;
  if (step === 'billing') return state.billing !== null;
  const cents = parseEtbToCents(state.price);
  return cents !== null && cents > 0;
}

export function buildCreateUrl(state: WizardState): string | null {
  if (state.type === null || state.billing === null) return null;
  const cents =
    state.billing === 'paid' ? parseEtbToCents(state.price) : 0;
  if (cents === null || cents < 0) return null;
  if (state.billing === 'paid' && cents === 0) return null;
  if (state.type === 'course') {
    return `/dashboard/my-products/new/course${
      state.billing === 'paid' ? `?price_cents=${cents}` : ''
    }`;
  }
  return `/dashboard/my-products/new/details?type=${state.type}${
    state.billing === 'paid' ? `&price_cents=${cents}` : ''
  }`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-flow.test.ts`
Expected: PASS (all suites green).

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-create-flow.ts resources/client/dashboard/digital-products/product-create-flow.test.ts
git commit -m "feat(wizard): pure product-create flow module with unit tests"
```

---

### Task 2: Shared option row + billing picker

**Files:**
- Create: `resources/client/dashboard/digital-products/option-row.tsx`
- Create: `resources/client/dashboard/digital-products/billing-mode-picker.tsx`
- Create: `resources/client/dashboard/digital-products/billing-mode-picker.test.ts`
- Modify: `resources/client/dashboard/digital-products/product-type-picker.tsx` (rows render via `OptionRowContent`; drop moved imports; keep `ProductType`, `PRODUCT_TYPES`, props API byte-identical)

**Interfaces:**
- Consumes: `Toggle` from `@shadcn/toggle`; `ToggleGroup` from `@shadcn/toggle-group/toggle-group`; `Trans` from `@ui/i18n/trans`; icons from `lucide-react`; `BillingMode` type from `./product-create-flow` (Task 1).
- Produces (used by Task 3 verbatim): `OptionRowContent({icon, title, description})`; `BillingModePicker({value, onValueChange})` with the same single-select contract as `ProductTypePicker` (`value: BillingMode | null`, `onValueChange: (value: BillingMode | null) => void`).

- [ ] **Step 1: Write the failing test**

```ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const dir = 'resources/client/dashboard/digital-products';

function read(name: string): string {
  return fs.readFileSync(path.resolve(dir, name), 'utf8');
}

describe('billing mode picker', () => {
  test('offers Free and Paid as single-select toggle rows', () => {
    const source = read('billing-mode-picker.tsx');
    expect(source).toContain("aria-label=\"Billing mode\"");
    expect(source).toContain('onValueChange');
    expect(source).toContain("'free'");
    expect(source).toContain("'paid'");
    expect(source).toContain('OptionRowContent');
  });
  test('type picker rows render through the shared row component', () => {
    expect(read('product-type-picker.tsx')).toContain('OptionRowContent');
    expect(read('product-type-picker.tsx')).toContain(
      'onValueChange: (value: ProductType | null) => void',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/billing-mode-picker.test.ts`
Expected: FAIL (file does not exist; note the self-read guard keeps the failure message about the missing module, which is fine — the point is red before green).

- [ ] **Step 3: Write minimal implementation**

`option-row.tsx` (move these exact blocks out of the picker — icon tile, texts, check):

```tsx
import {Trans} from '@ui/i18n/trans';
import {CheckIcon, type LucideIcon} from 'lucide-react';

interface OptionRowContentProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function OptionRowContent({
  icon: Icon,
  title,
  description,
}: OptionRowContentProps) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-muted text-muted-foreground ring-1 ring-foreground/5 group-data-pressed/type:bg-primary/10 group-data-pressed/type:text-primary group-data-pressed/type:ring-primary/15">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-foreground">
          <Trans message={title} />
        </span>
        <span className="text-xs leading-relaxed font-normal text-muted-foreground">
          <Trans message={description} />
        </span>
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors group-data-pressed/type:border-primary group-data-pressed/type:bg-primary group-data-pressed/type:text-primary-foreground">
        <CheckIcon className="size-3 opacity-0 transition-opacity group-data-pressed/type:opacity-100" />
      </span>
    </>
  );
}
```

`billing-mode-picker.tsx` (mirror the type picker's ToggleGroup contract):

```tsx
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {GiftIcon, TagIcon, type LucideIcon} from 'lucide-react';
import type {BillingMode} from './product-create-flow';
import {OptionRowContent} from './option-row';

type BillingModeOption = {
  id: BillingMode;
  icon: LucideIcon;
  title: string;
  description: string;
};

const BILLING_MODES: BillingModeOption[] = [
  {
    id: 'free',
    icon: GiftIcon,
    title: 'Free',
    description: 'Anyone can access it for free.',
  },
  {
    id: 'paid',
    icon: TagIcon,
    title: 'Paid',
    description: 'Charge a one-time price in ETB.',
  },
];

interface BillingModePickerProps {
  value: BillingMode | null;
  onValueChange: (value: BillingMode | null) => void;
}

export function BillingModePicker({
  value,
  onValueChange,
}: BillingModePickerProps) {
  return (
    <ToggleGroup
      orientation="vertical"
      variant="default"
      buttonVariant="outline"
      value={value ? [value] : []}
      onValueChange={values =>
        onValueChange((values[0] as BillingMode | undefined) ?? null)
      }
      aria-label="Billing mode"
      className="flex w-full min-w-0 flex-col gap-2 [&>[data-slot]]:rounded-card-sm! [&>[data-slot]~[data-slot]]:rounded-t-card-sm! [&>[data-slot]~[data-slot]]:border-t!"
    >
      {BILLING_MODES.map(option => (
        <Toggle
          key={option.id}
          value={option.id}
          aria-label={option.title}
          className="group/type h-auto min-h-[76px] w-full shrink-0 justify-start gap-3 border-border bg-card px-3.5 py-3 text-start whitespace-normal shadow-xs ring-1 ring-transparent hover:border-foreground/15 hover:bg-muted/30 data-pressed:border-primary/60 data-pressed:bg-primary/5 data-pressed:ring-primary/15"
        >
          <OptionRowContent
            icon={option.icon}
            title={option.title}
            description={option.description}
          />
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
```

`product-type-picker.tsx` changes (surgical, keep everything else byte-identical):
- Replace the `ProductTypeOptionRow` body with `<Toggle …same props…><OptionRowContent icon={option.icon} title={option.title} description={option.description} /></Toggle>`.
- Import fix: add `import {OptionRowContent} from './option-row';`, remove `CheckIcon` from the `lucide-react` import (it moves to `option-row.tsx`), and delete the `Trans` import (nothing references it after edit 1).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/billing-mode-picker.test.ts resources/client/dashboard/digital-products/product-create-flow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/option-row.tsx resources/client/dashboard/digital-products/billing-mode-picker.tsx resources/client/dashboard/digital-products/billing-mode-picker.test.ts resources/client/dashboard/digital-products/product-type-picker.tsx
git commit -m "feat(wizard): shared option row plus free/paid picker"
```

---

### Task 3: Wizard hook, steps UI, dialog shell

**Files:**
- Create: `resources/client/dashboard/digital-products/product-create-wizard.tsx`
- Modify: `resources/client/dashboard/digital-products/create-product-dialog.tsx` (rewrite body as thin shell; keep `open`/`onOpenChange` props, reset-on-dismiss, Dialog chrome classes, Trans strings)
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.test.tsx` (update the two course-bypass source assertions — the inline ternary moves into `buildCreateUrl`; assert the new wiring instead, see Step 3)

**Interfaces:**
- Consumes: Task 1 (`WizardState`, `WizardStep`, `nextStep`, `prevStep`, `canContinue`, `buildCreateUrl`, `parseEtbToCents`, `visibleSteps`, `INITIAL_WIZARD_STATE` — import only what is used); Task 2 (`ProductTypePicker`, `BillingModePicker`); `Dialog.*`, `Button`, `Field.*`, `InputGroup*` (same import paths the course page uses: `@shadcn/forms/field`, `@shadcn/forms/input-group/input-group`); `PackagePlusIcon`, `WalletIcon`, `TagIcon`, `ArrowLeftIcon`, `ArrowRightIcon` from `lucide-react`.
- Produces (used by Task 4 verbatim): `useProductCreateWizard()` returning `{step, steps, type, billing, price, setType, setBilling, setPrice, canContinue, goNext, goBack, reset, finishUrl}`; `STEP_META: Record<WizardStep, {icon: LucideIcon; title: string; description: string}>`; `WizardStepDots({wizard})`; `WizardStepBody({wizard})`. Exported type `ProductCreateWizard = ReturnType<typeof useProductCreateWizard>`.

- [ ] **Step 1: Write the failing test**

Append to a new file `resources/client/dashboard/digital-products/product-create-dialog.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const dir = 'resources/client/dashboard/digital-products';

function read(name: string): string {
  return fs.readFileSync(path.resolve(dir, name), 'utf8');
}

describe('create product dialog wizard', () => {
  test('renders the shared wizard steps and finishes via buildCreateUrl', () => {
    const source = read('create-product-dialog.tsx');
    expect(source).toContain('useProductCreateWizard');
    expect(source).toContain('WizardStepBody');
    expect(source).toContain('WizardStepDots');
    expect(source).toContain('buildCreateUrl');
  });
  test('resets wizard state when dismissed', () => {
    const source = read('create-product-dialog.tsx');
    expect(source).toMatch(/wizard\.reset\(\)|reset\(\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: FAIL (file does not exist).

- [ ] **Step 3: Write minimal implementation**

`product-create-wizard.tsx`:

```tsx
import {Field} from '@shadcn/forms/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  PackagePlusIcon,
  TagIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import {useState} from 'react';
import {BillingModePicker} from './billing-mode-picker';
import {
  buildCreateUrl,
  canContinue as canContinueStep,
  hasNextStep,
  INITIAL_WIZARD_STATE,
  nextStep,
  parseEtbToCents,
  prevStep,
  visibleSteps,
  type BillingMode,
  type ProductType,
  type WizardState,
  type WizardStep,
} from './product-create-flow';
import {ProductTypePicker} from './product-type-picker';

export const STEP_META: Record<
  WizardStep,
  {icon: LucideIcon; title: string; description: string}
> = {
  type: {
    icon: PackagePlusIcon,
    title: 'Create a new product',
    description: 'Choose the best format for what you want to sell.',
  },
  billing: {
    icon: WalletIcon,
    title: 'Free or paid?',
    description: 'How will people access this product?',
  },
  price: {
    icon: TagIcon,
    title: 'Set your price',
    description: 'One-time price in ETB. You can change it later.',
  },
};

export function useProductCreateWizard() {
  const [step, setStep] = useState<WizardStep>('type');
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const steps = visibleSteps(state.billing);

  const setType = (type: ProductType | null) =>
    setState(current => ({...current, type}));
  const setBilling = (billing: BillingMode | null) =>
    setState(current => {
      if (billing === 'free' && step === 'price') setStep('billing');
      return {...current, billing};
    });
  const setPrice = (price: string) =>
    setState(current => ({...current, price}));
  const goNext = () => {
    const next = nextStep(step, state.billing);
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = prevStep(step);
    if (prev) setStep(prev);
  };
  const reset = () => {
    setStep('type');
    setState(INITIAL_WIZARD_STATE);
  };

  return {
    step,
    steps,
    type: state.type,
    billing: state.billing,
    price: state.price,
    setType,
    setBilling,
    setPrice,
    canContinue: canContinueStep(step, state),
    goNext,
    goBack,
    reset,
    finishUrl: buildCreateUrl(state),
  };
}

export type ProductCreateWizard = ReturnType<typeof useProductCreateWizard>;

export function WizardStepDots({wizard}: {wizard: ProductCreateWizard}) {
  const current = wizard.steps.indexOf(wizard.step);
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {wizard.steps.map(step => (
        <span
          key={step}
          className={cn(
            'size-1.5 rounded-full',
            step === wizard.step ? 'bg-primary' : 'bg-border',
          )}
        />
      ))}
      <span className="sr-only">
        <Trans
          message="Step :current of :total"
          values={{current: current + 1, total: wizard.steps.length}}
        />
      </span>
    </span>
  );
}

export function WizardStepBody({wizard}: {wizard: ProductCreateWizard}) {
  if (wizard.step === 'billing') {
    return (
      <BillingModePicker value={wizard.billing} onValueChange={wizard.setBilling} />
    );
  }
  if (wizard.step === 'price') {
    const showHint =
      wizard.price.trim() !== '' &&
      (parseEtbToCents(wizard.price) === null ||
        (parseEtbToCents(wizard.price) ?? 0) <= 0);
    return (
      <Field.Root>
        <Field.Label htmlFor="wizard-price">
          <Trans message="Price" />
        </Field.Label>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>ETB</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="wizard-price"
            type="number"
            min="0"
            step="0.01"
            value={wizard.price}
            onChange={event => wizard.setPrice(event.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </InputGroup>
        {showHint && (
          <p className="text-sm text-destructive">
            <Trans message="Enter an amount greater than ETB 0." />
          </p>
        )}
      </Field.Root>
    );
  }
  return (
    <ProductTypePicker value={wizard.type} onValueChange={wizard.setType} />
  );
}
```

`create-product-dialog.tsx` rewrite (keep props, chrome classes, reset-on-dismiss; header/body/footer driven by wizard):

```tsx
import {Dialog} from '@shadcn/dialog/dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useNavigate} from 'react-router';
import {ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {
  STEP_META,
  useProductCreateWizard,
  WizardStepBody,
  WizardStepDots,
} from './product-create-wizard';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({
  open,
  onOpenChange,
}: CreateProductDialogProps) {
  const navigate = useNavigate();
  const wizard = useProductCreateWizard();
  const meta = STEP_META[wizard.step];
  const MetaIcon = meta.icon;

  const handleFinish = () => {
    if (wizard.finishUrl) {
      onOpenChange(false);
      navigate(wizard.finishUrl);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      wizard.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-xl">
          <Dialog.Header className="border-b px-6 py-5 pe-14">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/8 text-primary ring-1 ring-primary/15">
                <MetaIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-lg leading-tight font-semibold">
                  <Trans message={meta.title} />
                </Dialog.Title>
                <Dialog.Description className="mt-1 max-w-md leading-relaxed">
                  <Trans message={meta.description} />
                </Dialog.Description>
                <div className="mt-3">
                  <WizardStepDots wizard={wizard} />
                </div>
              </div>
            </div>
          </Dialog.Header>
          <Dialog.Body className="mx-0 px-6 py-5">
            <div key={wizard.step} className="animate-in fade-in duration-200">
              <WizardStepBody wizard={wizard} />
            </div>
          </Dialog.Body>
          <Dialog.Footer
            variant="muted"
            className="mx-0 mb-0 px-6 py-4 sm:items-center"
          >
            {wizard.step === 'type' ? (
              <Dialog.CloseButton render={<Button variant="outline" />}>
                <Trans message="Cancel" />
              </Dialog.CloseButton>
            ) : (
              <Button variant="outline" onClick={wizard.goBack}>
                <ArrowLeftIcon data-icon="inline-start" />
                <Trans message="Back" />
              </Button>
            )}
            <Button
              disabled={!wizard.canContinue}
              onClick={() =>
                hasNextStep(wizard.step, wizard.billing)
                  ? wizard.goNext()
                  : handleFinish()
              }
            >
              <Trans message="Continue" />
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

The Continue handler above uses `hasNextStep` from Task 1 (defined and tested there) to decide between advancing and finishing.

Update `digital-product-form-page.test.tsx` course-bypass test (it asserts the inline ternary that this rewrite removes). Replace those two assertions with wiring assertions that preserve intent (course still bypasses the details form, now via `buildCreateUrl`):

```ts
test('course selectors bypass the generic product details form', () => {
  const selectionPage = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/product-type-selection-page.tsx',
    ),
    'utf8',
  );
  const dialog = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/create-product-dialog.tsx',
    ),
    'utf8',
  );

  expect(selectionPage).toContain('useProductCreateWizard');
  expect(dialog).toContain('useProductCreateWizard');
  expect(selectionPage).toContain('buildCreateUrl');
  expect(dialog).toContain('buildCreateUrl');
});
```

(Course-routing itself is covered by `buildCreateUrl` unit tests from Task 1.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-flow.test.ts resources/client/dashboard/digital-products/billing-mode-picker.test.ts resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: PASS. Then: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.ts`
Expected: PASS (updated assertions match the rewrite).

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-create-flow.ts resources/client/dashboard/digital-products/product-create-flow.test.ts resources/client/dashboard/digital-products/product-create-wizard.tsx resources/client/dashboard/digital-products/create-product-dialog.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts resources/client/dashboard/digital-products/digital-product-form-page.test.tsx
git commit -m "feat(wizard): stepped type, billing, price dialog with shared steps UI"
```

---

### Task 4: Full-page shell reuses the wizard

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-type-selection-page.tsx` (replace inline picker state/nav with the wizard; keep `DashboardLayout` chrome, back link, Trans strings)

**Interfaces:**
- Consumes: Task 3 (`useProductCreateWizard`, `STEP_META`, `WizardStepBody`, `WizardStepDots`, `ProductCreateWizard` type). `Button`, `ArrowLeftIcon` (already imported in the page today).
- Produces: page navigates with `buildCreateUrl` output — no new exports.

- [ ] **Step 1: Write the failing test**

Append a new describe block to `resources/client/dashboard/digital-products/product-create-dialog.test.ts` (keep the filename):

```ts
describe('product type selection page wizard', () => {
  test('reuses the shared wizard and finishes via buildCreateUrl', () => {
    const source = read('product-type-selection-page.tsx');
    expect(source).toContain('useProductCreateWizard');
    expect(source).toContain('WizardStepBody');
    expect(source).toContain('buildCreateUrl');
    expect(source).not.toContain('selectedType');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: FAIL on the new describe block (`selectedType` still present, wizard absent).

- [ ] **Step 3: Write minimal implementation**

```tsx
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {Link, useNavigate} from 'react-router';
import {
  STEP_META,
  useProductCreateWizard,
  WizardStepBody,
  WizardStepDots,
} from './product-create-wizard';

export function Component() {
  const navigate = useNavigate();
  const wizard = useProductCreateWizard();
  const meta = STEP_META[wizard.step];
  const MetaIcon = meta.icon;

  const handleFinish = () => {
    if (wizard.finishUrl) {
      navigate(wizard.finishUrl);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Create a new product" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-4">
          <div className="flex items-center justify-between">
            {wizard.step === 'type' ? (
              <Button variant="ghost" render={<Link to="/dashboard/my-products" />}>
                <ArrowLeftIcon />
                <Trans message="All products" />
              </Button>
            ) : (
              <Button variant="ghost" onClick={wizard.goBack}>
                <ArrowLeftIcon />
                <Trans message="Back" />
              </Button>
            )}
            <Button disabled={!wizard.canContinue} onClick={handleFinish}>
              <Trans message="Continue" />
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/8 text-primary ring-1 ring-primary/15">
              <MetaIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg leading-tight font-semibold">
                <Trans message={meta.title} />
              </h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                <Trans message={meta.description} />
              </p>
              <div className="mt-3">
                <WizardStepDots wizard={wizard} />
              </div>
            </div>
          </div>

          <div key={wizard.step} className="animate-in fade-in duration-200">
            <WizardStepBody wizard={wizard} />
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
```

Note: the top-right Continue finishes only on the last step — but here it calls `handleFinish` unconditionally, which no-ops mid-wizard via the `finishUrl` null guard while staying disabled... NO — `canContinue` is true mid-wizard (e.g. type picked on step 1), so Continue would be enabled and do nothing on click. Fix honestly: right button advances mid-wizard and finishes at the end. Import `hasNextStep` (Task 3) and mirror the dialog footer exactly:

```tsx
import {hasNextStep} from './product-create-flow';
…
<Button
  disabled={!wizard.canContinue}
  onClick={() =>
    hasNextStep(wizard.step, wizard.billing)
      ? wizard.goNext()
      : handleFinish()
  }
>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-type-selection-page.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts
git commit -m "feat(wizard): full-page selection reuses the stepped wizard"
```

---

### Task 5: Prefill price downstream

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx` (price `useState` initializer only — line ~137)
- Modify: `resources/client/dashboard/courses/create-course-page.tsx` (add `useSearchParams`, price `useState` initializer only — line ~30)
- Modify: `resources/client/dashboard/digital-products/product-create-dialog.test.ts` (append prefill wiring assertions)

**Interfaces:**
- Consumes: Task 1 (`initialPriceFromParam`).

- [ ] **Step 1: Write the failing test**

```ts
describe('wizard price prefill', () => {
  test('details form seeds price from price_cents param on create', () => {
    const source = read('digital-product-form-page.tsx');
    expect(source).toContain("searchParams.get('price_cents')");
    expect(source).toContain('initialPriceFromParam');
  });
  test('course form seeds price from price_cents param', () => {
    const course = fs.readFileSync(
      path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
      'utf8',
    );
    expect(course).toContain("searchParams.get('price_cents')");
    expect(course).toContain('initialPriceFromParam');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: FAIL (neither form reads the param today).

- [ ] **Step 3: Write minimal implementation**

Details form — replace line 137 (`const [price, setPrice] = useState('');`) with a create-mode-only initializer. `productId` (line 129) and `searchParams` (line 130) already exist above it, and the edit loader (lines 174–177) overwrites price afterwards, so edits are unaffected:

```tsx
const [price, setPrice] = useState<string>(() =>
  productId
    ? ''
    : (initialPriceFromParam(searchParams.get('price_cents')) ?? ''),
);
```

Add the import alongside the other relative imports of that file:

```ts
import {initialPriceFromParam} from './product-create-flow';
```

Course form — extend the `react-router` import (line 23) and seed state (line 30):

```tsx
import {Link, useNavigate, useSearchParams} from 'react-router';
```

```tsx
const [searchParams] = useSearchParams();
const [price, setPrice] = useState<string>(
  () => initialPriceFromParam(searchParams.get('price_cents')) ?? '0',
);
```

Add the import (path from `courses/` into `digital-products/`):

```ts
import {initialPriceFromParam} from '../digital-products/product-create-flow';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-dialog.test.ts resources/client/dashboard/digital-products/digital-product-form-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts
git commit -m "feat(wizard): prefill downstream price from wizard param"
```

---

### Task 6: Full verification + manual pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full client test suite**

Run: `npm test`
Expected: all suites PASS, including the pre-existing `digital-product-form-page.test.ts`, `dashboard-routes.test.ts`, and course suites.

- [ ] **Step 2: Run lint, typecheck, build**

Run: `npm run lint`
Expected: 0 errors.

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: `✓ built in …` (chunk-size warnings are pre-existing and acceptable).

- [ ] **Step 3: Manual pass** (dev server, desktop + mobile width, light + dark)

Checklist — dialog: pick each of the 4 types; free skips price; paid blocks Continue until amount > 0; Back returns with selections kept; dismiss resets; finish lands on details/course with price prefilled. Page: same matrix via `/dashboard/my-products/new`. Confirm price stays editable downstream and save/submit still works.

- [ ] **Step 4: Commit and push** (only if Steps 1–3 are green)

```bash
git status --short
git push origin main
```

Note: Tasks 1–5 already committed their code; this step pushes the branch after verification. If `git status` shows only `public/build/` churn, leave build output uncommitted only if the repo convention says so — otherwise include it as previous feature commits did.
