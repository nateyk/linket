# SF-12 — Storefront responsive, accessibility and multilingual QA

**Date:** 2026-11-11
**Baseline:** `main` at `ae1d5dfbd44dd5aca387c7700b69589f38a55263`, including merged SF-09 product-detail readability PR #161.
**Scope:** Testable public card and page reflow evidence. No product/order/inquiry/Verify.et/auth/backend changes.

## Reconciliation

- Notion SF-12 had a prior ProductCard Storybook check recorded, but `resources/client/digital-products/shared/product-card.stories.tsx` was missing from the latest `main` at branch creation. This work restores an executable Storybook fixture, not a claim that the earlier manual screenshots still exist.
- SF-10 service UX PR #162 and SF-09 free-checkout recovery PR #163 were still open at branch creation. Do not port their runtime changes here; rerun these QA cases **after** those merges, with their exact final SHA.
- Existing SF-04 expanded preview, SF-06 profile and SF-07 shared cards have passed automated DOM/frontend CI in their own PRs. That does not certify 200% native zoom, contrast, screen-reader reading order, or authenticated saved-versus-public parity.

## Implemented on this branch

1. **Shared card fix** — ensure product/service supporting descriptions, including Amharic plus unbroken Latin words and URLs, can wrap without width pressure, preserving existing line clamping and typography.
2. **Executable component review** — `product-card.stories.tsx` contains 12 stories: 320/360/375/430/768/1024/1440 CSS-width published card cases; keyboard-operated 360/430 carousel; and 320/375/768 mixed Amharic/Latin quote/absent-cover cases. In Storybook's Chromium runner, play functions check reflow, heading and supporting-text wrapping, single semantic View action, and accessible carousel state transitions.
3. **Read-only published browser matrix** — `tests/e2e/storefront-public-responsive-a11y.spec.ts`: isolated seeded public storefront/product at 320/360/375/430/768/1024/1440 with full-page screenshot attachments, horizontal-overflow offender diagnostics, product title reflow, visible button/focus check and reduced-motion preference. An optional service route runs the same matrix once a disposable service fixture is available.
4. **Regression coverage** — add two small source contracts for wrapping and Storybook scenario/viewport existence.

## Executing the isolated acceptance suite

Requires an isolated test DB, synthetic `storage/app/e2e/buyer-fixture.json`, and a local/DDEV server. Never point at production or a buyer's real order. This suite makes **no writes**.

```bash
LINKET_ISOLATED_E2E=1 APP_ENV=testing DB_DATABASE=belink_test \
E2E_NO_SERVER=1 E2E_BASE_URL=http://127.0.0.1:8081 \
npx playwright test tests/e2e/storefront-public-responsive-a11y.spec.ts

# Optional for published service-page evidence
LINKET_E2E_PUBLIC_SERVICE_URL=http://127.0.0.1:8081/creator/services/example \
LINKET_ISOLATED_E2E=1 APP_ENV=testing DB_DATABASE=belink_test \
E2E_NO_SERVER=1 E2E_BASE_URL=http://127.0.0.1:8081 \
npx playwright test tests/e2e/storefront-public-responsive-a11y.spec.ts
```

`E2E_BASE_URL` and public fixture URL origins are checked, and tests are skipped without the explicit isolated environment.

## SF-12 acceptance matrix and limits

| Surface | 320/reflow | 360 | 375 | 430 | 768 | 1024 | 1440 | Keyboard | Amharic/English |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ProductCard Storybook (published) | story | story | story | story | story | story | story | title/View | fixture title |
| Carousel cards | — | story | — | story | — | — | — | arrows, dot state | — |
| Quote/no-cover card | story | — | story | — | story | — | — | View | long mixed script |
| Published storefront + product | Playwright scenario | scenario | scenario | scenario | scenario | scenario | scenario | Buy/Get action | manual published fixture |
| Published service details | optional scenario | optional | optional | optional | optional | optional | optional | manual package/inquiry | manual fixture |
| Expanded builder preview | existing DOM tests | manual | manual | manual | manual | manual | manual | Escape, focus return | manual |
| Public-page dialogues, portal, keyboard | — | manual | manual | manual | manual | manual | manual | NVDA/VoiceOver | manual |

`Storybook play` and `Playwright spec` describe **automated test cases**, not verified execution until run logs are attached. No screenshots or screen-reader session are claimed in this note.

## Manual review required before SF-12 Done / SF-13 GO

- [ ] **Native browser-toolbar 200% zoom** at 720px layout-equivalent and physically narrow viewports; scrolling, focus outline, sticky actions and dialogs must not obscure content. The 320px Playwright reflow proxy is not native zoom.
- [ ] **Real mobile devices** 360/375/430px, tablet 768px, desktop 1024/1440px; both light and dark Appearance and gradient backgrounds; report any clipped titles/indicators, horizontal scrollbar or unusable touch targets.
- [ ] **Keyboard** Tab/Shift+Tab, Enter/Space, arrow keys in package tabs and carousel, Escape and focus return in expanded preview, checkout and inquiry dialogs. Inspect tab order after an async result.
- [ ] **Screen reader** VoiceOver on iOS/macOS and NVDA on Windows: heading hierarchy, page landmarks, carousel names/state, creator social/contact links and dialog live announcements.
- [ ] **English + Amharic** long words on creator names, services, product/FAQ, quote tiers and actions; RTL-like layout if applicable. Verify actual localization and no untranslated placeholders.
- [ ] **Contrast** check painted background tokens (surface/strong/ink), focus indicators, disabled controls and buyer/inquiry portals using color measurements, not visual guesses.
- [ ] **Saved vs public** storefront parity after real authenticated Appearance and content changes (including expanded builder preview).
- [ ] **After #162/#163 merge** rerun both suites and safe buyer/portal regressions against the new `main` commit.
- [ ] Capture reviewer, device/browser, evidence links and **explicit human release approval** before closing SF-12 or SF-13.

**Release status: QA / HOLD. No merge or deployment without explicit user approval.**

## SF-13 pre-merge combined browser rehearsal — 2026-11-11

- Combined draft QA branch contains the separate, unmerged #162 SF-10,
  #163 free-order recovery and #167 SF-12 changes on main d16a3aed.
- The initial combined browser run identified test selection/CSSOM assertions,
  not a regression in published service layout. Seven service widths and the
  keyboard action already passed.
- After selecting the visible storefront card and accepting both valid CSS
  overflow-wrap values, [isolated Playwright run #42981494356]
  (https://github.com/nateyk/linket/actions/runs/42981494356)
  **passed all 15 tests**: seven storefront/product viewports, seven service
  viewports, and keyboard focus. Screenshot/trace [artifact #13838160553]
  (https://github.com/nateyk/linket/actions/runs/42981494356/artifacts/13838160553).
- This test is **not** an actual merged-main run, not native toolbar 200% zoom,
  not a screen-reader or physical-device test, and not an authorization to merge
  the original feature PRs or this QA-only branch.
