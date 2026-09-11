# Product creation wizard — design spec

- Date: 2026-09-11
- Status: approved (design), pending implementation plan
- Scope: frontend only. No PHP/backend changes.

## 1. Goal

Turn product creation into a smooth guided flow: pick a **type**,
then **Free or Paid**, then (paid only) enter a **price** — inside the
existing "Create a new product" dialog and its full-page twin. The
early pricing choice pre-fills the downstream forms instead of leaving
price buried as a raw number field with "0 = free" helper text.

## 2. Non-goals

- No backend changes (validation, limits, checkout, currency stay as-is).
- No currency choice: paid products are ETB-only, enforced by the API.
- No plan-limit precheck in the wizard; backend 422 messages already
  explain free/paid/course limits at save time.
- No changes to edit flows, submit-for-review gates, or checkout.
- No 21st.dev `nested-dialog` install (Radix-based; repo standardized
  on Base-UI) and no stacked multi-dialog flow.

## 3. Current state (verified)

- `resources/client/dashboard/digital-products/create-product-dialog.tsx`
  (81 lines): single-step dialog. Icon header, `ProductTypePicker`
  body, Cancel + Continue footer. Continue navigates to
  `/dashboard/my-products/new/course` (course) or
  `/dashboard/my-products/new/details?type=X` (rest). Closes + resets
  selection on dismiss.
- `product-type-selection-page.tsx` (59 lines): full-page twin. Back
  link to `/dashboard/my-products`, same picker, same navigation.
- `product-type-picker.tsx` (102 lines): vertical single-select
  `ToggleGroup` with rich rows (icon, title, description, check),
  `data-pressed` styling. Shared by dialog and page.
- Type travels as URL `?type=` only. Price is entered later in
  `digital-product-form-page` (ETB input, `price_cents = Math.round`,
  `0` = free) and in the course mini-form (defaults `'0'`).
- Backend (`DigitalProductsController::validated`, min `price_cents`
  0; `DigitalProductMutationService::create`) needs nothing new:
  free = `price_cents: 0`, paid = `price_cents > 0`, currency `etb`.
  `ebook`/`audio` are labels only; only `course` branches behavior.

## 4. Architecture

New/changed client files under
`resources/client/dashboard/digital-products/`:

| File | Change |
|---|---|
| `option-row.tsx` | NEW. Shared option row (icon tile, title, description, check indicator) with the existing `data-pressed` / `group-data-pressed/type` styling. Props: `icon`, `title`, `description`. |
| `product-type-picker.tsx` | TRIM. Keeps its `value`/`onValueChange` API and `PRODUCT_TYPES` data; rows render via `OptionRow`. No caller changes. |
| `billing-mode-picker.tsx` | NEW. Free/Paid single-select `ToggleGroup` reusing `OptionRow`. Free: "Anyone can access it for free." Paid: "Charge a one-time price in ETB." Same row visuals as the type step. |
| `product-create-wizard.tsx` | NEW. `useProductCreateWizard()` hook (step state machine, see §5) + `ProductCreateSteps` presentational component (header swap, step dots, step bodies, price field). Used by both shells below. |
| `create-product-dialog.tsx` | SHELL. Renders `Dialog` chrome + `ProductCreateSteps`; on finish, closes and navigates (existing routes + `&price_cents=`). Keeps reset-on-dismiss. |
| `product-type-selection-page.tsx` | SHELL. Renders layout + back link + `ProductCreateSteps`; on finish, navigates like the dialog. |
| `digital-product-form-page.tsx` | PREFILL. Initial price state falls back to `?price_cents=` when present (default `0` unchanged). Price stays editable. |
| `courses/create-course-page.tsx` | PREFILL. Same `?price_cents=` initial value (default `'0'` unchanged). |

## 5. State machine & data flow

Steps: `type → billing → price? → finish`.

- `type`: `ProductType | null`. Continue disabled until picked.
- `billing`: `'free' | 'paid' | null`. Continue disabled until picked.
  Free skips the price step.
- `price` (paid only): ETB decimal string. Continue enabled only when
  parsed cents `> 0`; inline hint otherwise.
- Back: footer shows Cancel on step 1, Back on later steps. Dismiss
  resets all wizard state (existing behavior preserved).
- Finish URLs (existing routes, one added param):
  - non-course: `/dashboard/my-products/new/details?type=X&price_cents=Y`
    (`Y = 0` for free),
  - course: `/dashboard/my-products/new/course?price_cents=Y`.
- Prefill is a head start, not a lock: both forms keep price editable
  and submit through the unchanged `POST /api/v1/digital-products`
  (or course create) path with `currency: 'etb'`.

## 6. Validation & error handling

- Client: paid requires parseable amount `> 0`; negatives, `NaN`, and
  empty block Continue with an inline hint. Parse with `Math.round`
  (same cents math as the details form).
- Server (unchanged): `price_cents: required|integer|min:0`;
  free/paid/course plan buckets in `enforceProductLimitForType`;
  file requirements per type. Wizard surfaces no new error paths;
  existing save-time 422s keep working.

## 7. UI per step

- Header swaps per step (icon tile + title + description):
  - Type: PackagePlus, "Create a new product", "Choose the best
    format for what you want to sell."
  - Billing: WalletIcon, "Free or paid?", "How will people access
    this product?"
  - Price: TagIcon, "Set your price", "One-time price in ETB.
    You can change it later."
- Step dots under the header (`Step 2 of 3`-style indicator,
  screen-reader announced).
- Price field reuses the details form InputGroup pattern: ETB
  adornment, numeric input, `min=0 step=0.01`.
- Step content swaps with a key-based enter animation (existing
  `animate-in` utilities). Single focus trap (one dialog, no
  stacking). Responsive: dialog keeps `sm:max-w-xl`; rows already
  wrap (`whitespace-normal`, `min-w-0`).
- Accessibility: `ToggleGroup` keeps `aria-label`s; price input gets
  a real label; step changes announced via the dots indicator;
  existing `Dialog.Title/Description` per-step content.
- i18n: every user-facing string via `Trans` (repo pattern).

## 8. Testing

- Unit (vitest, written first per TDD): step machine transitions
  (skip price on free, gating per step, reset), ETB→cents parsing
  edge cases (`''`, `-5`, `abc`, `19.99` → `1999`), finish-URL
  builder per type/billing.
- Manual pass: dialog + page × free/paid × course/non-course, Back
  navigation, dismiss reset, prefill visible in both forms, mobile
  width, dark mode.
- Checks: `oxlint`, `tsc --noEmit`, `vite build` (repo standard).

## 9. Rollout & compatibility

- `ProductTypePicker` public API unchanged → zero impact on other
  callers. New files are additive except the two thin shells and the
  two one-line prefills.
- If the wizard must be reverted, restoring the two shells suffices;
  backend never knew it existed.
