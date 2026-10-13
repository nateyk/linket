---
target: storefront product details page
total_score: 24
max_score: 36
na_heuristics: 7
p0_count: 1
p1_count: 3
target_identity: "file:/home/nate/projects/linket/resources/client/digital-products/public/digital-product-public-pages.tsx"
target_fingerprint: "sha256:123ad51303b92fd07b8694b2b4fa9d8cf4e47bbc5e4b31750f48274e140c5843"
target_path: /home/nate/projects/linket/resources/client/digital-products/public/digital-product-public-pages.tsx
timestamp: 2026-10-02T09-09-39Z
slug: s-public-digital-product-public-pages-tsx-21d754f3
closed: true
---
Method: dual-agent (A: ses_f049316aaffeJ2s4XxZePJSL4x · B: ses_f049316a7ffemvs9k4AXzujyrT)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Rich states everywhere, but validation `role="alert"` never moves focus (measured `anyFocusMovedToField:false`) |
| 2 | Match System / Real World | 3/4 | Plain commerce language, Birr pricing — yet dialog says only "your payment provider's secure checkout", never a name |
| 3 | User Control and Freedom | 2/4 | Escape/Cancel/click-outside work, but focus escapes the open modal both directions; `aria-modal:null`, background never inert |
| 4 | Consistency and Standards | 2/4 | Two tab languages in one journey (store blue underline vs product `#000` indicator); store H1→H3 with duplicate H1; six links named "View" |
| 5 | Error Prevention | 3/4 | Pre-POST validation, disabled-in-flight, dialog refuses to close while submitting — no inline format hints though |
| 6 | Recognition Rather Than Recall | 3/4 | Dialog restates product + Total, sticky bar restates price, FAQ restates delivery — merchant identity named never shown |
| 7 | Flexibility and Efficiency | n/a | Persuade surface, one valid path — accelerators out of scope for a single-item purchase |
| 8 | Aesthetic and Minimalist Design | 2/4 | 309/538 elements at 14px, verbatim duplicated lead sentence, rating shown twice above the fold, 25 targets on the storefront's first screen |
| 9 | Error Recovery | 3/4 | Every failure has copy + a way forward — except mobile cancelled, where the recovery CTA lands below the fold |
| 10 | Help and Documentation | 3/4 | Always-rendered system FAQ genuinely serves pre-purchase help; its refusal to answer refunds is never signposted |
| | **Total** | **24 / 36 (67%)** | **Acceptable** (50%+ band; 70%+ = Good) |

## Design Specificity Verdict

**LLM assessment: authored-for-Linket.** The creator-painted surface system is real, not decorative — every panel resolves through `--biolink-*` (measured live on `/noval/products/11413`: `--biolink-surface: color-mix(in srgb,#fff 96%,transparent)`, `font-family:Oswald`), and the checkout dialog inherits the store's paint (`digital-product-public-pages.tsx:504-508`). Type-specific modules with real logic: course-only Curriculum tab, accordion defaults chapter 1 open and stays single-open (measured `before:1 → after:1`), duration totals only when every lesson is timed, stat tiles only for courses, type badge on the gallery (measured 72×20 "Course"), type-aware includes, system FAQ carrying the server-published format hint. The pricing rail + IntersectionObserver mobile buy bar is a considered device (measured appearing at `y=779` exactly when `railInView:false`). Interchangeable: gallery-left / rail-right / tabs-below is the category default; the empty-cover fallback is a blank box. A competitor's PDP would look different only after the paint loads.

**Deterministic scan:** assigned scope (`digital-products/public` + `product-card.tsx` + `shop-widget`) → `[]`, exit 0; `--quiet` empty; `--no-config` `[]`. Engine verified live: synthetic `bad.css` → exit 2 (bounce-easing); combined scope+synthetic → exit 2 with only the synthetic finding. Suppression audit clean: no `impeccable-disable*` comments, `ignoreRules: []`, ignoreValues (`animate.min.css`, `qr-code-renderer`, `toast.tsx`) none in scope. Parent re-run on biolink renderer + shadcn foundations: 10 advisories — 9 inside `biolink-appearance.test.ts` (source-pinned token assertions; false positives for a design review), 1 `design-system-radius` at `creator-profile-layout.tsx:268` reproduced by the HEAD copy (pre-existing `containerRadius` calc).

Where detector and LLM diverge: detector found zero findings while the review found the Ring Rule silently broken — deterministic rules don't check component-merge semantics.

**Visual overlays:** injection succeeded (mutation preflight + bundle extracted from the native binary, boundary-verified, injected in-page; WASM core started, `impeccable-ready → scan → results count:0`, no page errors). Detector ran in the page and returned 0 findings, so no overlay nodes were created; headless run with no user-presented tab means no user-visible overlay is available. Fallback signal: console/postMessage output. First browser pass hit a transient Vite manifest race mid-build; re-run 100% clean (0 console errors, 0 failed requests across all 9 page×width runs).

## Overall Impression

The surface crossed from "template with a theme veneer" into something authored: every prior P0/P1 closed, state coverage is strong, payment reassurance measures three layers deep. What holds the score at Acceptable is a layer deeper than styling — interaction semantics and trust copy at the exact moment money moves. Cognitive load: 3 of 8 checklist items fail (single focus, visual hierarchy, minimal choices — one decision point with 25 visible options on the storefront). Emotional journey: no designed peak (price 36px/600 and cover art both compete at anchor strength, then flat); payment reassurance is the strongest section; the end is weaker than the peak (no merchant name, no provider name, no refund stance before money moves); the valley is mobile `?checkout=cancelled` — a full screen of "still available when you are ready" with no visible way to act.

## What's Working

1. State coverage disproportionate to the surface's size: cancelled, checkout-failed, curriculum loading/error/empty, zero-review, no-cover, submitting, order-polling, refresh-failure — each with copy and a next action (`product-pricing-card.tsx:84-113`, `digital-product-public-pages.tsx:998-1043, 814-857`).
2. The painted surface system is disciplined and honest: one variable set, CSS fallbacks, flat-by-default honored (measured `box-shadow:none` at rest), 150ms transitions, `MotionConfig reducedMotion="user"`; B confirmed the reduced-motion path is real, not a `0.01ms` kill.
3. Risk-reversal placed at the decision point with the mobile bar keeping it reachable: five value lines + secure block between price and last-scroll content; bar appears precisely when the rail leaves (`pb-24`, measured `overlapping: []`).

## Priority Issues

**[P0] The payment dialog is not modal to assistive tech or the keyboard.** `aria-modal:null`, background never inert (`mainInert:false`), focus leaves both directions while open (Tab: `Continue → SPAN → BODY → A "Back to bio" → BUTTON "Buy now"`; Shift+Tab from close → `My Orders → "About this product"`). A keyboard/SR buyer can operate the page behind a live checkout, including the very Buy button the dialog sits on. WCAG 2.4.3 / 4.1.2. Fix: mount `Dialog.Root` as a true modal — `aria-modal="true"`, `inert`/`aria-hidden` siblings, repair the focus guard (sentinel resolves to a focusable SPAN then BODY). Evidence: `digital-product-public-pages.tsx:491-676`, close `:510-522`, footer `:644-671`. Command: `/impeccable harden`

**[P1] Mobile cancelled-checkout hides the only CTA.** `?checkout=cancelled` @390×844 → alert `y=776-844`, `Buy now` `y=864-904` (below the 844 fold), sticky bar suppressed (rail still intersects). The moment of explicit intent-but-hesitation removes the action. Fix: render the alert below the CTA in the rail, or force the sticky bar visible whenever `checkout=cancelled`/`checkoutFailed`; add "Try again" inside the alert. Evidence: flag `:146-147` → rail `:286-295`; alert above CTA `product-pricing-card.tsx:84-113`, CTA `:115-125`; observer `:155-164`. Command: `/impeccable layout`

**[P1] The payment moment has no counterparty.** Dialog says only "your payment provider's secure checkout" while the repo ships Stripe, PayPal and Chapa; no store name/logo/URL; no refund stance anywhere (deliberate: `product-faq.tsx:17-20`). Silence on refunds reads as risk, not restraint. Fix: name the provider (server knows it), stamp store identity (avatar/name already in `data.biolink`), state "No refunds — digital delivery is instant" or add a FAQ entry linking the creator's policy. Evidence: copy `:550-552`, recap `:528-549`, guarantees `:626-641`, `PublicCreator` `:80-105`. Command: `/impeccable clarify`

**[P1] The store page's first keyboard stop has no visible focus indicator.** B measured: @390/@768 first Tab lands on `<div role="tabpanel" tabindex="0">` with `outline-style:none` — `tabs.tsx:113` hardcodes `outline-none`, `creator-profile-layout.tsx:180-216` passes no override; product pages pass because `product-tabs.tsx:51` does override. WCAG 2.4.7. Fix: add `focus-visible:outline-2 focus-visible:outline-offset-2` to the biolink tab panels, or stop hardcoding `outline-none` in the shared component. Evidence: `common/foundation/resources/client/shadcn/tabs/tabs.tsx:113`, `creator-profile-layout.tsx:180,198`, reference `product-tabs.tsx:51`. Command: `/impeccable adapt`

**[P2] The type system is smaller than the moment.** 309/538 elements at 14px; prose (`product-overview.tsx:27`, `product-faq.tsx:91`, `product-pricing-card.tsx:129`) all 14px; only Oswald 400 loaded while computed weights are 500/600 → synthesized bold in a condensed face; deck byte-identical to the Overview's first paragraph (`product-summary.tsx:98-102` vs `product-overview.tsx:26-30`). Fix: prose → `text-base`; load 400/500/600 with the painted font; make the deck a distinct truncated excerpt or outcome line. Evidence: font wiring `digital-product-public-pages.tsx:754-767`. Command: `/impeccable typeset`

## Persona Red Flags

**Casey — distracted mobile buyer:** Products/About icon-only until you're on them (labels `opacity-0`, active-only 132×40); cancelled-checkout recovery CTA off-screen; after the rail scrolls away rating/includes/secure block vanish with no summary equivalent; cover cropped 3:1 → 16:9 slicing the label text; social targets 32×32, nav 40px.

**Riley — stress tester:** focus escapes the payment modal both ways with `aria-modal` null; empty submit announces but focus stays on the submit button; zero-review Reviews tab reports `0.0 / 0.0 out of 5` (a score of zero, not an absence — rail and summary correctly suppress it); 2 of 6 store cards have no cover → blank white block with a bag icon; three links with empty accessible names, visible "LinkedIn url" label, six links named "View" (WCAG 2.4.4).

**Jordan — first-timer:** no store identity on the product page (only `Back to bio` + "By Nathanael ይትባረክ"); dialog never says who takes the card; deck = Overview paragraph verbatim → first prose screen reads as filler; the answers Jordan needs are 14px `#1f1f1f`, 1.27:1 against primary text.

## Minor Observations

- Panels render ringless — Ring Rule silently broken: `biolinkSurfaceCard` contains `ring-1 ring-[var(--biolink-border)]` (`surface.ts:11`) and `Card.Root` contains `ring-1 ring-foreground/10` (`card.tsx:18`), but rendered class lists on rail/gallery/Overview cards have no `ring-1` (`box-shadow:none`); `ring-[var(...)]` wins the Tailwind merge as a width utility. Standalone `ring-1` usages survive. Latent: paint the bio white and the pricing rail becomes borderless white-on-white. Evidence: `surface.ts:10-11`, `card.tsx:18`, applied `digital-product-public-pages.tsx:269-295`.
- Store headings: two H1s then H3 product titles with no H2; desktop shows no item count.
- Rating twice within the first screen on the course page.
- Desktop tab strip `sticky top-0 z-20` never sticks (strip `y=782`, max scroll 530); mobile does (measured `stripY:6`).
- Tab indicator `z-index:-1`, 2px — works only because list background is transparent; fragile.
- Creator card still carries static `backdrop-blur-md` (pre-existing; not flagged by detector config).
- Confirmed good: `Buy now` hover is a real color change, focus outline 2px solid offset 2px, label contrast 5.42:1; mobile dialog fits `342×712` with 16px inputs (iOS guard; desktop inputs 14px); store-card hover shadow sanctioned (shadow-as-state); Square radius consistent but reads as a different system from the dashboard; `BackToBio` falls back to `history.back()` correctly.

## Questions to Consider

1. If a creator paints the bio white, does the pricing card exist? Measured: no ring, no border, `box-shadow:none` — is a 1%-opacity white fill all that separates "the price" from "the page"?
2. PRODUCT.md says no creator refund policy exists. Is silence the right default at the moment money moves, or is an explicit "digital delivery is instant; refunds are at the creator's discretion" the more persuasive answer?
3. Is "0.0 out of 5 · 0 reviews" a rating or an absence? Why does the Reviews tab exist at all for a zero-review product, the way Curriculum is suppressed for non-courses?
4. Which is the peak — the cover art or the price? The page never decides: both are 36px-class anchors and the cover gets cropped to 16:9. If the answer is "the promise", where is it written?

## Delta vs prior run (2026-10-01, 18/32, source-only — browser unavailable)

- Score: 18/32 (56%, n/a 7+10) → 24/36 (67%, n/a 7). Different heuristic sets; like-for-like on the old set: 18/32 → 21/32 (+3 points).
- Both prior P0s closed: theme-blind colors → B's sweep found 0 failing combos across 118 samples (cancelled alert 18.24:1 / 14.31:1); payment moment order+risk → dialog now has Total + redirect copy + guarantees (measured `hasTotal/hasRedirect/hasRisk: true`).
- All three prior P1s closed or substantially addressed: per-type modules now exist (curriculum, stat tiles, type badge, type-aware includes, FAQ); product-card drift fixed (`text-warning` star, token palette, motion-safe carousel, shadow-only hover); i18n defects fixed (`trans()` throughout, catalog at 1584 keys, aria-labels translated).
- New findings are deeper-layer and browser-only: dialog modality (P0), cancelled-CTA dead end (P1), counterparty trust copy (P1), store focus indicator (P1) — none measurable without a browser, which the prior run lacked.
