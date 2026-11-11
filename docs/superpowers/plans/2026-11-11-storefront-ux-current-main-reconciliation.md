# Storefront UX draft PR reconciliation — 2026-11-11

**Baseline:** `main` at `1e879e5bdf4ea5b9cc8e0d226092b524e45a0875`.

**Scope:** Reconcile the previously approved storefront UX draft PRs against current `main` before transplanting fixes. This branch implements **SF-04 expanded desktop preview only**. All other draft changes require independent current-main review. No payment, authorization, publishing or deployment changes are included.

| Original draft | Current-main evidence | Disposition |
| --- | --- | --- |
| [#105](https://github.com/nateyk/linket/pull/105) (SF-04, SF-08) | The inline product-load Retry already exists in `shop-widget-renderer.tsx` after merged [#141](https://github.com/nateyk/linket/pull/141), while `live-preview.tsx` still had only a fixed desktop rail and mobile sheet. | **Port only missing SF-04**, retaining the live preview's newer translated iframe title and muted desktop rail. Do not reapply the old retry patch. |
| [#108](https://github.com/nateyk/linket/pull/108) (SF-06, SF-07) | Main already has 16:9 media, two-line titles, appearance-styled View links, and [#141](https://github.com/nateyk/linket/pull/141) revised shared ProductCard typography. The current `ServiceCard` remains an independent component rather than composing `ProductCard`; long-name/profile and touch-target refinements need further comparison. | **Partially covered; defer** to a separate, conflict-aware SF-06/07 slice. |
| [#110](https://github.com/nateyk/linket/pull/110) (SF-05) | Current `biolink-appearance.ts` has shared semantic `--biolink-*` tokens and contrast helpers, but the draft's `resolveBiolinkPublicAppearanceStyle` is not on main. | **Incomplete; defer** cross-surface Appearance and portal parity to its own integration slice. |
| [#114](https://github.com/nateyk/linket/pull/114) (SF-09/10) | Current service page still includes a separate seller `Send inquiry` action. The draft also adds detail hierarchy and zero-price portal recovery; those changes touch buyer flows. | **Incomplete; defer** with independent checkout/entitlement regression checks. |
| [#116](https://github.com/nateyk/linket/pull/116) (integrates SF-05, SF-09, SF-10) | Draft integration passed historical CI/Chromium checks but diverged heavily from main; its shared public-page files overlap with later work. | **Use for reference only**; no merge/cherry-pick without fresh main-based conflict resolution and tests. |

## SF-04 implementation

- Add the existing Base UI `Dialog` around a second, lazily mounted `PreviewDevice` on desktop.
- The large dialog uses the same public-route iframe and existing draft/active-section `postMessage` protocol as the inline preview. It **does not persist drafts** or change the public store.
- Keep the mobile preview `Sheet`, existing editor navigation, live-preview rail and translated iframe name.
- Provide visible Expand and Close actions, accessible title, focus-trapped modal behavior, Escape dismissal and focus return. Switching to Insights dismisses the dialog.
- Extend the existing jsdom suite with checks for modal mounting/sizing, dismissal/focus, close action, draft data/section sync, and Insights navigation.

## Acceptance gates

- [ ] GitHub CI at this branch's final HEAD: TypeScript, frontend tests, build, and mandatory project checks.
- [ ] Authenticated visual check at 360/375/430/768/1024/1440 CSS pixels, including desktop preview fitting and intact mobile sheet.
- [ ] Native 200% zoom, keyboard focus and screen-reader acceptance, and saved-preview-versus-public parity.
- [ ] Independent human code/design/security review and explicit owner approval to merge.
- [ ] Any deployment requires separate owner authorization.

**Release decision:** DRAFT / HOLD. Creating a PR is not permission to merge or deploy.
