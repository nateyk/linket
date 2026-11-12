# SF-10 — Service detail quote and seller actions (current main)

Date: 2026-11-11

## Reconciliation

- Baseline: `main` at `6565fe303b1847099c340e3bb9fad9472ad8b2c1` after merged SF-05 PR #160. PublicServicePage already calls `resolveBiolinkPublicAppearanceStyle(appearance)`; do not replace that code with the stale PR #114 or #116 implementations.
- Source proposals: draft PR [#114](https://github.com/nateyk/linket/pull/114) and [#116](https://github.com/nateyk/linket/pull/116). Reuse only the relevant SF-10 service-detail UX, not checkout/free-order, product, CI or backend changes.
- Independent from SF-09 draft [#161](https://github.com/nateyk/linket/pull/161). Does not modify digital-product files.

## Implemented

1. The seller panel keeps direct configured contact methods but no longer duplicates the offer rail's inquiry CTA.
2. Seller links are true `<a>` elements with `href`, visible focus affordance from the existing outline button classes, 44px minimum hit area and safe external-link attributes. Duplicate normalized destinations are rendered once. Video and live-demo links use the same native-anchor semantics.
3. Multiple-package tabs live in a horizontally scrollable padded strip, retaining storefront Appearance segmented tokens and accommodating long/translated tier names. Single/no-package surfaces keep their existing actions.
4. The currently selected package is used by both the tier's CTA and the mobile sticky quote CTA. The selected package name/ID flows into the existing inquiry dialog; inquiry endpoint and submission contract remain unchanged.
5. Long title, service description, seller name, FAQ and package names wrap within their containers rather than clipping small/mobile layouts.
6. Existing service public Appearance variables, password gating, pricing, quote-only and inquiry behavior are preserved.

## Tests

- Extended `public-service-page.dom.test.tsx`: checks single seller-path CTA, accessible/safe working links, deduplication, direct video/demo links, responsive long text and scrollable tab strip, package-specific inquiry, mobile sticky selected tier, and no/one package states.
- Existing service inquiry, packages, theme and responsive tests must still pass.

## Release gates (HOLD until verified)

- [ ] Exact-head TypeScript, Vitest/Storybook browser tests, audit, Vite build and Verify
- [ ] Authenticated real-device/browser screenshots at 360/375/430/768/1024/1440px and native 200% zoom
- [ ] Keyboard Tab/Arrow focus and NVDA/VoiceOver acceptance, including wide-scroll tabs and inquiry dialog
- [ ] Amharic/English long labels; dark/light/gradient foreground/button contrast; public-page saved Appearance parity
- [ ] Explicit owner code/design/release approval before merge
- [ ] Separate explicit authorization for deployment

No Laravel, Verify.et, payment, order, entitlement, publishing, database or API changes. CI and source-code checks alone do not satisfy manual accessibility or release gates.
