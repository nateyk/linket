# SF-05 — Public Storefront Appearance Parity

> Approved by the creator on November 5, 2026. Implementation must preserve Linket's current “Creator's Counter” visual system; no replacement UI kit or new Appearance settings.

**Goal:** Ensure background, readable foreground, font, card/control radius, button styling and surface shadows are computed consistently on the public `/username` storefront, public product/course and service details, and portaled buyer/inquiry dialogs. Clarify Appearance settings' global scope in the builder.

**Architecture:** Reuse `Background` and `resolveBiolinkThemeVariables`/`resolveBiolinkButtonAppearance`. Add one typed public-style composer and reuse it where each page establishes its appearance context; preserve each existing page's layout and checkout/quote logic. The creator profile, product and service screens use the **same original data contract**, not a new theme format.

**Out of scope:** Adding new customization controls, changing prices, payment flows, Verify.et, download/access rights, storefront visibility, backend/database, publishing, service inquiry API or site-wide admin theme.

## Evidence and UI consistency checklist

Public page family (3/3 app surface candidates, one page family across `resources/client`; read November 5, 2026). Reference: `BiolinkLayout` (public profile), `PublicServicePage` (already shared Background) and `PublicProductShell`. Descendant dialogs count separately (2/2).

- [ ] Public holder uses current semantic `--biolink-*` token resolver, **3 of 3 pages** (the shared piece).
- [ ] Public holder carries creator `fontConfig.family`, **3 of 3 pages** (same mechanism, currently two inline implementations).
- [ ] Public surface shadow uses the current button-shadow option; currently **2 of 3 page roots**, absent on profile root (shared composer will cover all three).
- [ ] Background uses existing `<Background>` rendering of color, gradient, image, tint, effects and noise, currently **2 of 3 roots**; product page has copied `ProductBackground` markup (the divergence being fixed).
- [ ] Product/course and service content panels retain `biolinkSurfaceCard` and `biolinkSurfaceEdgeClassName` (shared surface boundary).
- [ ] Public creator profile and product/service actions keep `resolveBiolinkButtonAppearance`, not dashboard-primary classes (shared piece).
- [ ] Product and service dialogs (2 of 2) carry public theme/radius/font/shadow tokens because they portal out of their page tree (their current role; centralize without changing modal behavior).
- [ ] Brand lockups select the foreground-relative light/dark mark from the *effective* contrast-corrected text on gradient/solid backgrounds, not from an outdated raw text color; fallback retains site theme for unpainted pages.
- [ ] Core spacing/typography use `DESIGN.md`: 4px grid, 16px body, 14px controls, consistent radius tokens; do not introduce literals or visual design drift.
- [ ] Editor scope remains dashboard neutral; Appearance helper text clarifies it covers the entire published storefront.
- [ ] Existing customer actions, payment verification, modal focus, social links, localization and responsive behavior remain unchanged.

## Task A — Red regression evidence

**Files:** `resources/client/short-links/renderers/biolink-renderer/biolink-appearance.test.ts`, `resources/client/digital-products/public/digital-product-public-pages.test.tsx`, new cross-surface test if needed.

- [ ] Write tests for identical style variables across root/portaled surfaces under default, gradient, strong shadow, non-default font and radius.
- [ ] Test logo fallback for light gradient with stale white foreground and dark gradient with no explicit foreground.
- [ ] Test product background uses shared `Background`; no duplicate effect/tint renderer.
- [ ] Run targeted Vitest and confirm RED before implementation where feasible.

## Task B — Shared Appearance context

**Files:** `resources/client/short-links/renderers/biolink-renderer/biolink-appearance.ts`, `biolink-layout.tsx`, `resources/client/digital-products/public/digital-product-public-pages.tsx`, `resources/client/services/public/public-service-page.tsx`, `resources/client/services/public/service-inquiry-dialog.tsx`.

- [ ] Introduce `resolveBiolinkPublicAppearanceStyle` returning `resolveBiolinkThemeVariables(appearance)` + font family + foreground + resolved surface shadow.
- [ ] Use composer in profile/product/service roots and the portaled buyer/service inquiry surfaces.
- [ ] Replace product-only `ProductBackground` implementation with shared `Background`, preserving its existing negative-z background paint and viewport coverage.
- [ ] Use contrast-corrected foreground for light/dark logo selection.
- [ ] Keep all existing product/service form, access, checkout and route code unmodified.

## Task C — Builder scope clarity

**Files:** `resources/client/dashboard/stores/store-editor/appearance/biolink-appearance-tab.tsx`.

- [ ] Replace profile-only Appearance description with translated public storefront scope.
- [ ] Explain Buttons/Text settings cover public product and service pages, not editor chrome.

## Task D — Release evidence

- [ ] Validate focused Vitest, full TypeScript `tsc --noEmit`, scoped lint and relevant build check.
- [ ] Manual viewport / Appearance check at 360/375/430/768/1024/1440 and 200% zoom; when unavailable, mark pending explicitly.
- [ ] Draft PR against `main` independent of unmerged #105/#108; do **not** merge or deploy.
- [ ] Update [SF-05 Notion task](https://app.notion.com/p/40ebae7367ac819085c7faed94ef2f06) with actual commits, test links, blockers and progress.

**Gate:** HOLD until verified green CI + visual/contrast/keyboard QA and explicit human merge approval.
