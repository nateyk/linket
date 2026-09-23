# Phase A — Course Entry Flow Alignment: Design Spec

**Date:** 2026-09-23
**Branch:** `feat/course-entry-flow-alignment` (off `main`)
**Scope:** `/my-products/new` (course branch) → `/my-products/new/course` (create-course-page)
**Parent research:** course UI/UX workstream kickoff (4-agent review, 2026-09-23)
**Constraints:** shadcn reusable primitives only; core UI rhythm + theme tokens; zero inline custom styling; no API changes.

---

## 1. Problem Statement

The course creation entry flow diverges from the digital-product flow established in the prior polish work:

1. Wizard collects type/billing/price, but the course URL carries only `price_cents` — billing is dropped and the price is asked a second time with no context.
2. `create-course-page.tsx` uses local state, a single `Card`, hardcoded English strings, and raw `Alert` errors — none of the shared primitives (`ProductCreationContext` read path, `ProductFormField`, `Breadcrumb`, `Field.Error`).
3. Wizard `localStorage` state survives finish-navigation (back-nav shows stale selections).
4. The `/new/details?type=course` → `/new/course` redirect drops query params.

## 2. Design

### S1 — Prefill transport (billing + price)
- `buildCreateUrl` course branch appends `&billing=<free|paid>` alongside `price_cents` (mirrors the details-branch pattern).
- `create-course-page` validates both params (reuse `parseEtbToCents` + billing literal check, same as `parseWizardPrefill`).
- Free billing renders a "Free" badge instead of an editable price field; paid pre-fills the price input.
- Direct visits with no params: unchanged behavior (empty form, editable price).

### S2 — Header + Breadcrumb
- Add `Breadcrumb` (`All products` → `Create course`) above the title row, same component and placement as `digital-product-form-page.tsx`.
- Remove the ghost back-button (duplicates breadcrumb; two competing back affordances).

### S3 — Fields via primitives + full i18n
- Title + price move into `ProductFormField` (label, description, error, `htmlFor`, `required`), with `id` + `aria-invalid` on inputs.
- Validation errors render through `Field.Error`; network errors keep `Alert` but with `Trans` strings.
- Every user string wrapped in `<Trans>` (title, price, Free badge, validation + network errors, button labels, placeholders stay raw per repo precedent).
- Price input becomes `InputGroup` with ETB prefix, matching the digital form.

### S4 — Wizard/route hygiene
- On wizard finish-navigate (type-selection page), call the existing `wizard.reset()` after computing `finishUrl` (clears step + state + `localStorage`), before navigating.
- The `/new/details?type=course` → `/new/course` loader redirect forwards `price_cents` and `billing` instead of dropping them.

### S5 — Tests
- Update `create-course-page.test.tsx`, `product-create-flow.test.ts`, `product-create-dialog.test.ts` to the new structure (repo's source-assertion style; no new infra).
- New assertions: billing in course URLs, prefill parsing, Breadcrumb/primitive usage, Trans coverage of error strings.

## 3. File Mapping

| File | Change |
|---|---|
| `resources/client/dashboard/digital-products/product-create-flow.ts` | course branch of `buildCreateUrl` appends billing |
| `resources/client/dashboard/digital-products/product-type-selection-page.tsx` | call existing `wizard.reset()` after computing `finishUrl`, before navigate |
| `resources/client/dashboard/dashboard-routes.tsx` | course redirect forwards params |
| `resources/client/dashboard/courses/create-course-page.tsx` | rewrite on primitives + Breadcrumb + i18n |
| `resources/client/dashboard/courses/create-course-page.test.tsx` | updated assertions |
| `product-create-flow.test.ts`, `product-create-dialog.test.ts` | updated URL expectations |

## 4. Risk Mitigation

- No API changes — purely client-side; backend contract untouched.
- Direct-URL access preserved (empty-form fallback).
- `ProductFormField`/`Breadcrumb` are already installed and used — no new dependencies.
- Wizard state shape unchanged — only lifecycle (clear on finish).

## 5. Acceptance Criteria

- [ ] Paid wizard → course page shows pre-filled price; free wizard → Free badge, no price field
- [ ] Breadcrumb renders, ghost back-button gone
- [ ] All user strings via `Trans`; errors via `Field.Error`/Alert+Trans
- [ ] Back-nav after finish shows fresh wizard, not stale selections
- [ ] Redirect preserves `price_cents`/`billing`
- [ ] `vitest` suite green, `tsc` + `oxlint` clean, semantic tokens only
