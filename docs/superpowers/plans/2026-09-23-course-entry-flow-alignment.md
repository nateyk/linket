# Phase A: Course Entry Flow Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the course creation entry flow (`/my-products/new` → `/my-products/new/course`) with the digital-product patterns: billing-aware prefill, Breadcrumb header, `ProductFormField` validation, full static-string i18n, wizard-state hygiene.

**Architecture:** URL query params remain the wizard→page transport (same as the digital flow). `buildCreateUrl` gains `billing` on course URLs; `create-course-page` reads both params via the existing `parseWizardPrefill`; page shell keeps its `Card` (a 2-field form — Accordion would be overkill) with inner fields rebuilt on `ProductFormField`.

**Tech Stack:** React 19, Tailwind v4, Base UI, shadcn `base-luma`, react-router, vitest, oxlint.

**Spec:** `docs/superpowers/specs/2026-09-23-course-entry-flow-alignment-design.md`

## Global Constraints

- Semantic tokens only: no hex, no `rgb()`/`oklch()` inline, no Tailwind color literals, no arbitrary radius/shadow. Radius via `rounded-card*` / `rounded-input` / `rounded-button` only.
- Spacing via `gap-*`; never `space-x-*` / `space-y-*`. Equal sizes via `size-*`.
- Reuse `@shadcn/*` and digital-products primitives; lucide icons with `data-icon="inline-start|inline-end"` inside buttons.
- Static UI strings via `<Trans message="..." />`. Runtime validation messages stay string literals rendered through `Field.Error` / `Alert.Description` — identical to `digital-product-form-page.tsx` (server and client validation strings are data, not static copy).
- No `dark:` overrides on new UI. No API changes. No new dependencies.
- `npm test` = `vitest run`. Lint new/changed lines with `npx oxlint <paths>`.

---

### Task 1: Course URLs carry billing mode

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-create-flow.ts:95-99`
- Test: `resources/client/dashboard/digital-products/product-create-flow.test.ts:92-100,128-132`

**Interfaces:**
- Consumes: `WizardState`, `parseEtbToCents` (unchanged).
- Produces: `buildCreateUrl` course branch (unchanged signature) now emitting `?billing=<mode>[&price_cents=<cents>]`, billing-first to match details-URL param order.

- [ ] **Step 1: Update the failing expectations**

In `product-create-flow.test.ts`, change the two course URL expectations:
```ts
expect(
  buildCreateUrl({type: 'course', billing: 'paid', price: '19.99'}),
).toBe('/dashboard/my-products/new/course?billing=paid&price_cents=1999');
expect(
  buildCreateUrl({type: 'course', billing: 'free', price: ''}),
).toBe('/dashboard/my-products/new/course?billing=free');
```
And in the `wizard prefill transport` block, replace the `course urls are unchanged` test with:
```ts
test('course urls carry the billing mode', () => {
  expect(
    buildCreateUrl({type: 'course', billing: 'paid', price: '19.99'}),
  ).toBe('/dashboard/my-products/new/course?billing=paid&price_cents=1999');
  expect(
    buildCreateUrl({type: 'course', billing: 'free', price: ''}),
  ).toBe('/dashboard/my-products/new/course?billing=free');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-flow.test.ts`
Expected: FAIL on the three course URL assertions (actual lacks `billing`).

- [ ] **Step 3: Implement billing param on the course branch**

```ts
if (state.type === 'course') {
  return `/dashboard/my-products/new/course?billing=${state.billing}${
    state.billing === 'paid' ? `&price_cents=${cents}` : ''
  }`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-flow.test.ts`
Expected: PASS (all suites: parse, steps, prefill, urls).

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-create-flow.ts resources/client/dashboard/digital-products/product-create-flow.test.ts
git commit -m "feat(courses): carry billing mode in course creation urls"
```

---

### Task 2: Wizard resets on finish-navigate

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-type-selection-page.tsx:20-24`
- Test: `resources/client/dashboard/digital-products/product-create-dialog.test.ts` (append to `product type selection page wizard` describe)

**Interfaces:**
- Consumes: `wizard.finishUrl`, existing `wizard.reset()` (clears step + state + `localStorage`, defined in `product-create-wizard.tsx:104-108`).
- Produces: nothing new — lifecycle fix only.

- [ ] **Step 1: Write the failing test**

Append inside the `product type selection page wizard` describe:
```ts
test('clears wizard state when finishing', () => {
  const source = read('product-type-selection-page.tsx');
  expect(source).toContain('wizard.reset()');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: FAIL — `wizard.reset()` absent from the selection page.

- [ ] **Step 3: Reset before navigating**

```tsx
const handleFinish = () => {
  const destination = wizard.finishUrl;
  if (destination) {
    wizard.reset();
    navigate(destination);
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-type-selection-page.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts
git commit -m "fix(courses): reset wizard state on finish navigate"
```

---

### Task 3: Course redirect forwards wizard params (real loader test)

**Files:**
- Modify: `resources/client/dashboard/dashboard-routes.tsx:414-421`
- Test: `resources/client/dashboard/dashboard-routes.test.tsx` (append to `course product creation` describe)

**Interfaces:**
- Consumes: `redirect` from `react-router` (already imported in the routes file).
- Produces: loader returning `redirect('/dashboard/my-products/new/course[?price_cents=&billing=]')` for `type=course`, else `null`.

- [ ] **Step 1: Write the failing test**

Append inside the `course product creation` describe:
```tsx
test('course redirect forwards wizard params', async () => {
  const details = dashboardRoutes[0].children!.find(
    (r: any) => r.path === 'my-products/new/details',
  ) as any;
  const redirected = await details.loader({
    request: {
      url: 'http://localhost/dashboard/my-products/new/details?type=course&price_cents=1999&billing=paid',
    },
  });
  expect(redirected.headers.get('Location')).toBe(
    '/dashboard/my-products/new/course?price_cents=1999&billing=paid',
  );
  const passthrough = await details.loader({
    request: {
      url: 'http://localhost/dashboard/my-products/new/details?type=ebook',
    },
  });
  expect(passthrough).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/dashboard-routes.test.tsx`
Expected: FAIL — Location is `/dashboard/my-products/new/course` with no params.

- [ ] **Step 3: Forward price_cents and billing**

```tsx
{
  path: 'my-products/new/details',
  loader: ({request}) => {
    const url = new URL(request.url);
    if (url.searchParams.get('type') !== 'course') return null;
    const forward = new URLSearchParams();
    for (const key of ['price_cents', 'billing'] as const) {
      const value = url.searchParams.get(key);
      if (value !== null && value !== '') forward.set(key, value);
    }
    const suffix = [...forward].length ? `?${forward}` : '';
    return redirect(`/dashboard/my-products/new/course${suffix}`);
  },
  lazy: () =>
    import('@app/dashboard/digital-products/digital-product-form-page'),
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/dashboard-routes.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/dashboard-routes.tsx resources/client/dashboard/dashboard-routes.test.tsx
git commit -m "fix(courses): forward wizard params on course redirect"
```

---

### Task 4: Rebuild create-course-page on shared primitives

**Files:**
- Modify: `resources/client/dashboard/courses/create-course-page.tsx` (full rewrite per below)
- Test: `resources/client/dashboard/courses/create-course-page.test.tsx` (rewrite assertions)
- Test: `resources/client/dashboard/digital-products/product-create-dialog.test.ts:42-51` (update prefill test)

**Interfaces:**
- Consumes: `parseWizardPrefill` from `../digital-products/product-create-flow`; `ProductFormField` from `../digital-products/product-form-field`; `Breadcrumb` from `@shadcn/breadcrumb/breadcrumb`; `Badge` from `@shadcn/badge/badge`; `apiClient`, `DashboardLayout`, `Alert`, `Button`, `Card`, `InputGroup*`, `Input`, `Spinner`, `Trans`, `isAxiosError` (all already imported except `ProductFormField`, `Breadcrumb`, `Badge`, `parseWizardPrefill`).
- Produces: unchanged route `Component`, unchanged POST body and redirect targets.

- [ ] **Step 1: Write the failing tests**

Replace `create-course-page.test.tsx` content with:
```tsx
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
  'utf8',
);

describe('course creation page', () => {
  test('reads billing and price through the shared prefill parser', () => {
    expect(source).toContain('parseWizardPrefill');
    expect(source).not.toContain("searchParams.get('price_cents')");
  });

  test('renders breadcrumb and shared form primitives', () => {
    expect(source).toContain("from '@shadcn/breadcrumb/breadcrumb'");
    expect(source).toContain('<Breadcrumb');
    expect(source).toContain('All products');
    expect(source).toContain('<ProductFormField');
    expect(source).toContain('aria-invalid');
  });

  test('shows a Free badge instead of a price field for free billing', () => {
    expect(source).toContain('<Badge');
    expect(source).toContain("billing === 'free'");
  });

  test('keeps spinner submit state and uncertain-creation recovery', () => {
    expect(source).toContain('<Spinner');
    expect(source).toContain('creationUncertain');
    expect(source).toContain('Check My Products');
  });

  test('labels static copy through Trans', () => {
    expect(source).toContain('<Trans message="Create course" />');
    expect(source).toContain('<Trans message="Course title" />');
    expect(source).toContain('<Trans message="Price" />');
    expect(source).not.toContain("setError('Add a course title");
  });
});
```
And in `product-create-dialog.test.ts`, replace the `course form seeds price from price_cents param` test with:
```ts
test('course form reads billing and price through the shared prefill parser', () => {
  const course = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/courses/create-course-page.tsx',
    ),
    'utf8',
  );
  expect(course).toContain('parseWizardPrefill');
  expect(course).toContain("billing === 'free'");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/courses/create-course-page.test.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: FAIL — no `parseWizardPrefill`, `Breadcrumb`, `Badge`, or `<ProductFormField` in the course page.

- [ ] **Step 3: Rewrite the page**

Replace the full contents of `create-course-page.tsx` with:
```tsx
import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {isAxiosError} from 'axios';
import {GraduationCapIcon, TriangleAlertIcon} from 'lucide-react';
import {FormEvent, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {parseWizardPrefill} from '../digital-products/product-create-flow';
import {ProductFormField} from '../digital-products/product-form-field';

type CreatedProduct = {id: number};

type CourseFieldErrors = {title?: string; price?: string};

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefill = parseWizardPrefill(searchParams);
  const isFree = prefill.billing === 'free';
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>(() => prefill.price ?? '0');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  const [creationUncertain, setCreationUncertain] = useState(false);

  const validate = (nextTitle: string, nextPrice: string) => {
    const errors: CourseFieldErrors = {};
    if (!nextTitle.trim()) errors.title = 'Add a course title.';
    if (!isFree) {
      const cents = Math.round(Number(nextPrice) * 100);
      if (!Number.isFinite(cents) || cents < 0) {
        errors.price = 'Add a valid price of ETB 0 or more.';
      }
    }
    return errors;
  };

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate(title, price);
    setFieldErrors(validation);
    if (Object.keys(validation).length) {
      document
        .getElementById(validation.title ? 'course-title' : 'course-price')
        ?.focus();
      return;
    }
    const priceCents = isFree ? 0 : Math.round(Number(price) * 100);

    setCreating(true);
    setError(undefined);

    try {
      const response = await apiClient.post('/api/v1/digital-products', {
        title: title.trim(),
        description: null,
        price_cents: priceCents,
        currency: 'etb',
        type: 'course',
      });
      const product = response.data.data as CreatedProduct;
      navigate(`/dashboard/my-products/${product.id}/course`, {replace: true});
    } catch (reason) {
      const requestMayHaveSucceeded = isAxiosError(reason) && !reason.response;
      const message = isAxiosError<{message?: string}>(reason)
        ? reason.response?.data?.message
        : undefined;
      setCreationUncertain(requestMayHaveSucceeded);
      setError(
        requestMayHaveSucceeded
          ? 'We could not confirm whether the course was created. Check My Products before trying again.'
          : message || 'Unable to create the course. Please try again.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Breadcrumb>
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/dashboard/my-products">
              <Trans message="All products" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="Create course" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb>
        <DashboardLayout.SectionTitle>
          <Trans message="Create course" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-4 sm:py-5">
          {isFree && (
            <div>
              <Badge variant="secondary">
                <Trans message="Free" />
              </Badge>
            </div>
          )}
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Start your course" />
              </Card.Title>
              <Card.Description>
                <Trans message="Name your course and set its price. You will add chapters, lessons, video, and resources in the course builder." />
              </Card.Description>
            </Card.Header>
            <form onSubmit={createCourse}>
              <Card.Content>
                <div className="flex flex-col gap-4">
                  <ProductFormField
                    label="Course title"
                    description="Choose a clear title learners can easily understand."
                    error={fieldErrors.title}
                    htmlFor="course-title"
                    required
                  >
                    <Input
                      id="course-title"
                      aria-invalid={!!fieldErrors.title}
                      value={title}
                      maxLength={160}
                      onChange={event => {
                        setTitle(event.target.value);
                        if (fieldErrors.title) {
                          setFieldErrors(current => ({...current, title: undefined}));
                        }
                      }}
                      placeholder="Complete course title"
                      autoFocus
                    />
                  </ProductFormField>

                  {!isFree && (
                    <ProductFormField
                      label="Price"
                      description="Set ETB 0 to offer this course for free."
                      error={fieldErrors.price}
                      htmlFor="course-price"
                      required
                    >
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <InputGroupText>ETB</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="course-price"
                          aria-invalid={!!fieldErrors.price}
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={event => {
                            setPrice(event.target.value);
                            if (fieldErrors.price) {
                              setFieldErrors(current => ({
                                ...current,
                                price: undefined,
                              }));
                            }
                          }}
                          placeholder="0.00"
                        />
                      </InputGroup>
                    </ProductFormField>
                  )}

                  {error && (
                    <Alert.Root variant="destructive" fillStyle="subtleFill">
                      <TriangleAlertIcon />
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Root>
                  )}
                </div>
              </Card.Content>
              <Card.Footer className="justify-end">
                {creationUncertain && (
                  <Button
                    variant="outline"
                    render={<Link to="/dashboard/my-products" />}
                  >
                    <Trans message="Check My Products" />
                  </Button>
                )}
                <Button type="submit" disabled={creating || creationUncertain}>
                  {creating ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <GraduationCapIcon data-icon="inline-start" />
                  )}
                  <Trans
                    message={
                      creating ? 'Creating course...' : 'Create course'
                    }
                  />
                </Button>
              </Card.Footer>
            </form>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
```
Notes for the implementer (do not skip): `Field.Group` is removed in favor of the `div flex flex-col gap-4` (matches the digital form's field rhythm; `Field` import goes away). The ghost back-button, `ArrowLeftIcon`, and `Link to="/dashboard/my-products/new"` are deleted (breadcrumb owns back-nav; `Link` import stays for the uncertain-recovery button). `initialPriceFromParam` import is replaced by `parseWizardPrefill`. `error` state stays a raw string for the network `Alert` (same as the digital form). `fieldErrors` clears per-field on change. Focus moves to the first invalid input on submit. `setPrice`/`setTitle` wrappers are inline (two fields — no helper indirection).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/courses/create-course-page.test.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/courses/create-course-page.test.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts
git commit -m "feat(courses): rebuild create page on shared form primitives"
```

---

### Task 5: Verification pass (tokens, lint, tests, manual QA)

**Files:** none (fix-only; commit only if a fix is required).

- [ ] **Step 1: Token audit — grep touched files for raw visual values**

Run:
```bash
grep -En "#[0-9a-fA-F]{3,8}|rounded-\[|shadow-\[|bg-(blue|gray|white|black)-|dark:" resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/digital-products/product-create-flow.ts resources/client/dashboard/digital-products/product-type-selection-page.tsx resources/client/dashboard/dashboard-routes.tsx || true
```
Expected: no output.

- [ ] **Step 2: Lint touched files**

Run: `npx oxlint resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/digital-products/product-create-flow.ts resources/client/dashboard/digital-products/product-type-selection-page.tsx resources/client/dashboard/dashboard-routes.tsx resources/client/dashboard/digital-products/product-create-dialog.test.ts resources/client/dashboard/digital-products/product-create-flow.test.ts resources/client/dashboard/courses/create-course-page.test.tsx resources/client/dashboard/dashboard-routes.test.tsx`
Expected: zero errors (warnings acceptable only if pre-existing on untouched lines).

- [ ] **Step 3: Run the full client test suite**

Run: `npx vitest run`
Expected: all suites PASS.

- [ ] **Step 4: Manual QA checklist (report results in chat, fix issues as new commits)**

  - Wizard paid flow (course): type=course → billing=paid → price → Continue lands on `/dashboard/my-products/new/course?billing=paid&price_cents=<c>` with price prefilled.
  - Wizard free flow (course): lands with `?billing=free`, Free badge visible, no price field.
  - Direct access to `/dashboard/my-products/new/course` (no params): form works, price empty-equivalent (`0`), editable.
  - Empty title submit: inline title error, title focused.
  - Invalid price submit: inline price error, price focused.
  - Breadcrumb renders "All products / Create course"; ghost back-button gone.
  - Back-nav after finish shows a fresh wizard.
  - Legacy `/new/details?type=course&price_cents=1999&billing=paid` redirects preserving params.

- [ ] **Step 5: Commit only if fixes were needed**

```bash
git add -A
git commit -m "fix(courses): address verification findings on entry flow alignment"
```

Skip this step entirely when the verification pass is clean.
