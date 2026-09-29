---
target: linket client trees (landing, auth, dashboard)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:/home/nate/projects/linket/common/foundation/resources/client"
timestamp: 2026-09-26T08-23-44Z
slug: common-foundation-resources-client
---
# Design Critique — linket client trees

Method: dual-agent (A: `ses_f236454e4ffeNnh2tmsBKtaCFI` · B: `ses_f2807e243ffe6yv0x0gvlXNzTL`)

Run notes: both assessments ran as isolated sub-agents (not a degraded single-context run), but invariant ordering was broken by the environment — Assessment A hit repeated rate-limit/restart failures, so B's detector output reached the synthesis context before A finished. A itself never saw detector output. No `.impeccable/critique/ignore.md` exists, so no prior findings were dropped.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Real loading/empty/invalid states; but current-page is never marked, and the "Features" focus indicator is color-change only |
| 2 | Match System / Real World | 2 | Two product names on one page (BeLink / Linket); "Clone the repo, install dependencies" on `/login`; "(100)%" labels |
| 3 | User Control and Freedom | 2 | Public header vanishes on `/pricing` and `/contact` — only "Register \| Login" remains |
| 4 | Consistency and Standards | 2 | `radius-sm` makes inputs and buttons both 6px; `max-w-7xl` vs `max-w-6xl` gutters; physical `ml-` in shared components |
| 5 | Error Prevention | 3 | `aria-invalid` + messages aligned to fields, disabled `Save changes`; no destructive-action confirmation observed |
| 6 | Recognition Rather Than Recall | 3 | Anchors, mega menu, labeled bottom nav, descriptive empty states; but mobile hero shows no brand name at all |
| 7 | Flexibility and Efficiency | 3 | Clean 30-step tab order, no traps, visible rings on nearly all elements; no shortcuts or bulk paths |
| 8 | Aesthetic and Minimalist Design | 3 | Flat-by-default holds app-side; undercut by a 700x900 primary slab of decorative copy and a 72px hero |
| 9 | Error Recovery | 2 | Field errors are clear, but analytics shows broken output (unlabeled row, "(100)%") instead of the empty state |
| 10 | Help and Documentation | 2 | The only help is "check the docs or open an issue on GitHub" — addressed to a developer, not a creator |
| **Total** | | **25/40** | **Acceptable (62.5%)** |

Applicable maximum: 40 (all ten heuristics scored; no `n/a`).

## Design Specificity Verdict

**LLM assessment:** The structure is authentically Linket's — a bio page that is also a storefront, a stats band, a product builder, Free/Pro entitlements, and zero fabricated testimonials/logo walls/press quotes. The skin is still template boilerplate: a BELINK wordmark, four "BeLink" body sentences, a "Linket" footer, and developer promo copy on `/login` that anyone could ship on an unrelated product. Verdict: authored information architecture under category-interchangeable surface voice.

**Deterministic scan:** `impeccable detect --json` returned 0 findings on both `resources/client` and `common/foundation/resources/client` (exit 0, verified meaningful via a deliberate bad-file smoke test). Supplementary `--no-config` runs surfaced 13 suppressed findings: 12 `bounce-easing` in vendored `animate.min.css` (correctly ignored) and 1 `layout-transition` at `toast.tsx:64`. Line 64's only transition is `transform`+`opacity` — no height transition exists, so the suppression is correct, though its stored reason text reads stale. The detector caught nothing the design review missed; every P0/P1 below is invisible to it.

**Visual overlays:** not attempted — measurement probes were used instead. No user-visible overlay exists for this run.

## Overall Impression

The foundation is disciplined: a real token system, honest empty states, a tight 12/14/16/20/24 type scale in the dashboard, dark mode as a token remap rather than a filter, and flat resting surfaces across the app. The layer on top fails — the marketing skin carries a different company's name, a commission number contradicting the product's own source of truth, and accessibility defects on the brand color touching every CTA. Cognitive load is mostly well managed (3 nav items, 2 pricing choices); the failure is a memory bridge created when `/pricing` loses the header, plus extraneous load from developer instructions on the login promo.

## What's Working

- Empty states are real and honest: "No orders yet — your latest digital product orders will appear here.", "No payment method set", "No matching data for the selected filters".
- Dark mode is a genuine token remap (`oklch(0.205 0 0)` cards, `oklch(0.708 0 0)` secondary) that persists landing → pricing → login → dashboard.
- State coverage is complete and token-correct: `oklch(0.623 0.214 259.815) solid 2px` focus ring, hover fill at `oklab(… / 0.8)`, `aria-invalid` with x-aligned messages. Zero console errors on any route, desktop or mobile.

## Priority Issues

**[P0] Two product names ship on the same page**
Why it matters: header/hero/product mock read `BELINK`, four body sentences say "BeLink", footer says "Copyright © 2026 Linket". PRODUCT.md describes one product.
Fix: replace `resources/defaults/default-settings.php:65,194,204,242` with "Linket"; swap `public/images/logo-dark.svg`, `logo-light.svg`, `mobile-logo-*.svg` for the Linket wordmark.
Suggested command: `/impeccable clarify`

**[P0] The Free plan's commission contradicts PRODUCT.md, on both the number and the source of truth**
Why it matters: PRODUCT.md:33 "commission rates are product facts — Free 10%, Pro 5"; :57 "Plan entitlements and commission rates are facts, not copy to be softened or rounded." The database seeds `commission_bps: 500` and `platform_fee_percent: 5`, rendering "5% Linket transaction fee" (`ProductResource.php:121`, migration line 50). Understates what the platform takes from a Free creator on every sale. Only the Free row exists in the dump, which is why no Pro card renders.
Fix: set Free to 10% (`commission_bps: 1000`, `platform_fee_percent: 10`) or correct PRODUCT.md if 5% is intended — note `ProductResource` derives the displayed string only from `platform_fee_percent` while checkout reads `commission_bps`; changing one alone recreates the divergence.
Suggested command: not an impeccable command (seed/data correction); re-verify with `/impeccable audit`.

**[P1] The brand primary fails WCAG AA everywhere it is used as text or as a button**
Why it matters: measured — `#2b7fff` on white 3.76:1, on `#eaf2ff` 3.34:1, on `#fbfbfb` 3.63:1 (floor 4.5:1 at 14–16px); button label `#fcfcfc` on `#2b7fff` 3.67:1; `/login` promo `#d2e3fd` on `#2b7fff` 2.89:1 (fails even 3:1 large text); dashboard badges `#fcfcfc` on `#00a263` 3.22:1 and on `#b27b00` 3.57:1. Muted and body text pass — this is specifically the accent.
Fix: darken the primary for text use (~`oklch(0.55 …)` reaches ~4.6:1 on white), or use a near-black foreground on primary buttons and reserve the light label for >=18.66px bold. Screenshots: `/tmp/opencode/shots/b/contrast-*.png`.
Suggested command: `/impeccable harden`

**[P1] The `radius-sm` theme collapses DESIGN.md's Three-Radius Rule**
Why it matters: `common-tailwind.css:172-178` maps button and input both to `--radius-md` (6px), cards to 8px, applied via `framework.blade.php:14`. Measured button 6px, input 6px, card 8px, badge 8px. DESIGN.md: controls are pills at 24px, fields softly squared at 12px "so an input never reads as a button"; only 24/16/12 exist. The signature pill is gone.
Fix: set the theme radius to `default` — the fallback at `common-tailwind.css:59-63` already resolves to 12/24/24/16.
Suggested command: `/impeccable shape`

**[P1] The public header disappears on `/pricing` and `/contact`**
Why it matters: those pages render only "Register | Login" while `/` shows Features / Pricing / Contact / Dashboard / Sign In / Get Started (`pricing-page.tsx:36-44`, DOM probe `navs: []`). A visitor loses every exit on the page where the decision is made, and CTA vocabulary changes mid-flow.
Fix: render the landing `Navbar.Menu` and the same auth content on `/pricing` and `/contact`.
Suggested command: `/impeccable layout`

## Persona Red Flags

No `## Design Context` in AGENTS.md, so predefined personas only. Interface mix selects Jordan, Sam and Casey.

**Jordan (First-Timer)**: sees `BELINK` in the header and "Linket" in the footer — two product names before signup. Opens `/pricing` and the header is gone ("Register | Login"), so there is no way back and no location cue. Reads "5% Linket transaction fee" against a stated fact of 10% — trust breaks at the decision point. Then signs in and is told to "Clone the repo, install dependencies, and your dashboard is live in minutes." Abandons at the pricing step.

**Sam (Accessibility-dependent)**: the flow is keyboard-completable (8 clean tabs on login, no traps, correct rings on inputs/submit/links). But the landing "Features" trigger computes `outline-style: none` on `:focus-visible` — state change is `#212121 → #2b7fff`, color alone, invisible under forced-colors. Section headings read 3.34–3.76:1 and button labels 3.67:1 — the brand color fails AA at every size it is used.

**Casey (Distracted mobile user)**: at 390x844, 15 of 17 tappable elements on `/` are under 44px — footer social links 16x16, pricing radios 16x16, login checkbox 16x16 (below WCAG 2.5.8's 24px floor), hamburger 32x32, footer links 20px tall. Billing "Upgrade" runs to `right: 391` in a 390 viewport, creating a 1px inner horizontal scroll. Above the fold: two identical logo marks and no product name.

## Minor Observations

- [P2] Hero 72px and pricing h2 60px exceed the 48px display ceiling (`hero/shared.tsx:18`, `landing-page-pricing.tsx:44`); the 72px/1.0 headline pushes sub-copy below the fold. Fix: `sm:text-7xl` → `sm:text-5xl`.
- [P2] Auth/promo headings match no named type role — "Login to your account" 30px/500, pricing h1 36px/500 vs the 24/600 page-title and 30–48px/600 display roles.
- [P2] Stats band: one metric stretched across ~1216px with a 2px left rule and 40px padding. DESIGN.md: borders are 1px always, card padding is 24. Fix: `p-6`, `border-s`, auto-fit grid.
- [P2] Pricing card is the only resting surface with `shadow-sm` + `border` instead of `ring-1 ring-foreground/10` (`pricing-table.tsx:83`) — violates Flat-By-Default and the Ring Rule.
- [P2] KPI chips hard-code `text-amber-600 bg-amber-500/10` instead of the `warning` token and use status color decoratively while both chips read `0.00 Br` (Token-Only Rule). Files: `dashboard-home-page.tsx:164`, `storefront-dashboard-page.tsx:280`, `product-preview.tsx:114`, `sales-payouts-page.tsx:211`.
- [P2] Analytics shows broken output instead of an empty state: unlabeled "Top locations" row (`1 · 100%`), literal "(100)%" on Insights, adjacent "1 engagements" pluralization.
- [P3] Physical directional styles in shared components — `ml-6 lg:ml-7` (`mega-menu.tsx:90`), `ml-auto` (`pricing-page.tsx:43`), `left-1/2 -translate-x-1/2` — against an RTL-ready codebase.
- [P3] Public container mismatch: landing `max-w-7xl` vs `/pricing` `max-w-6xl`, plus off-grid `mt-7.5 mb-7.5` (30px) / `md:mb-17.5` (70px) on a 4px base grid.
- [P3] Mobile hero repeats the logo mark with no brand name above the fold.
- Not a defect: transient Laravel Ignition pages during a concurrent rebuild (`Vite manifest not found`), all routes 200 afterward.

## Questions to Consider

- What would the landing say differently if it assumed the visitor already knows the product is called Linket?
- Is 5% or 10% the truth — and what else in the product is stating a number nobody has verified?
- What would a confident version of the pricing page look like: one that keeps its header and its own navigation?
- If the Three-Radius Rule were actually rendered, would anything else on the page need to change to keep up?
