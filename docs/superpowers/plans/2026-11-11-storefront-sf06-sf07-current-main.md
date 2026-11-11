# SF-06 / SF-07 storefront profile and catalog-card integration — 2026-11-11

**Baseline:** protected `main` commit `1e879e5bdf4ea5b9cc8e0d226092b524e45a0875`. Independent of draft SF-04 PR #157; no shared changed files.

## Current-main reconciliation

- Existing main already has the contemporary `ProductCard` typography, focus-visible title link, 16:9 cover, a single appearance-styled View action and shared appearance tokens. Preserve those later changes from merged PR #141.
- Old draft PR #108 contained still-unmerged SF-06 profile refinements and SF-07 service-card composition. Port only that missing functionality; do not merge the aged branch.
- `ServiceCard` previously duplicated its product-like media/heading/summary/meta/price/footer. Compose `ProductCard` for a single anatomically consistent catalog grid, maintaining the existing service URL and quote/price behavior.
- Add optional `ProductCardClassNames.description` so public creator Appearance tokens style supporting text; dashboard defaults remain unchanged. Add overflow wrapping without replacing the latest main typography.
- Improve creator display-name wrapping, body-size biography, full-width compact Message action and 44px touch-target utility classes for coarse-pointer social links.

## Validation

- Focused regression tests cover: shared card construction, zero and missing prices, no cover, exactly one accessible View link, long mixed-script service titles, theme supporting text, long creator name and actual mobile social touch targets.
- [ ] Exact-HEAD CI: TypeScript, frontend Vitest/Storybook, Oxlint advisory, Vite build, Verify.
- [ ] Manual mobile/desktop 360/375/430/768/1024/1440 px, browser-toolbar 200% zoom and mixed Amharic/English.
- [ ] Keyboard + NVDA/VoiceOver, contrast and saved creator Appearance parity.
- [ ] Human review and explicit authorization before merge. Separate production deployment authorization.

**No payment, Verify.et, Laravel, creator publish/approval, authorization or entitlement behavior changed.**

**Release decision: draft / HOLD.**
