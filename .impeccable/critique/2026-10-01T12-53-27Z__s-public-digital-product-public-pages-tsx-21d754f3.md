---
target: storefront product details page
total_score: 18
max_score: 32
na_heuristics: 7,10
p0_count: 2
p1_count: 3
target_identity: "file:/home/nate/projects/linket/resources/client/digital-products/public/digital-product-public-pages.tsx"
target_fingerprint: "sha256:1d3733752060023bf1a12895a838e153e35cf730b739aae465291d73412d6539"
target_path: /home/nate/projects/linket/resources/client/digital-products/public/digital-product-public-pages.tsx
timestamp: 2026-10-01T12-53-27Z
slug: s-public-digital-product-public-pages-tsx-21d754f3
closed: true
---
Method: dual-agent (A: ses_f0894ea8effeHAXU56KO36RmzR · B: ses_f0894ea8dffebTsRBMPaZTUJzn)

Browser inspection unavailable this session: both assessments hit `[browser.disconnected] No desktop browser is connected to this session`, and `impeccable detect <url>` found no Chromium (`IMPECCABLE_BROWSER` unset). No screenshots, no overlay; findings are source-based, supplemented by curl evidence against the live site.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Rating/meta row pops in after paint via `onSummary` fetch, no skeleton; `reviews_enabled=false` shows zero social proof unexplained |
| 2 | Match System / Real World | 3/4 | Type-specific facts buyers think in ("24 tracks", "184 pages", "1.2 GB") don't exist in the data path; app vocabulary leaks ("My Orders", "Only shared with Chapa") |
| 3 | User Control and Freedom | 2/4 | `window.location.assign(checkoutUrl)` with no advance notice of the off-site redirect and no abort; dialog has `showCloseButton={false}` |
| 4 | Consistency and Standards | 2/4 | Two rating-color systems (`text-amber-500` in shared card vs `text-warning` on detail page); `max-w-5xl` wrapping `max-w-6xl`; back label changes wording between routes |
| 5 | Error Prevention | 3/4 | Good submit-time validation and mid-submit dialog guard; weak: errors never clear as you type, no price/total confirmation before redirect |
| 6 | Recognition Rather Than Recall | 2/4 | No deck paragraph under the H1 — the value proposition is absent from the first screen; description lives in a tab below the price card |
| 7 | Flexibility and Efficiency | n/a | Persuade surface — deliberately excluded |
| 8 | Aesthetic and Minimalist Design | 2/4 | Invented glass recipe (`backdrop-blur-xl` on every panel), resting `shadow-xs`, radial-gradient placeholder, the same fact stated three times |
| 9 | Error Recovery | 2/4 | Curriculum tab registered but returns `null` on failure → blank panel; reviews failure = one muted line, no retry, raw untranslated string |
| 10 | Help and Documentation | n/a | Persuade surface — deliberately excluded |
| | **Total** | **18 / 32 (56%)** | **Acceptable** (50%+ band; 70%+ = Good) |

## Design Specificity Verdict

**LLM assessment: category-interchangeable, with a Linket-specific theming veneer.** Strip the `--biolink-*` variables and this is the most generic commerce template there is: cover → title → meta → sticky price rail → tabbed details — possible on Gumroad or any shadcn starter. Genuinely authored parts: the biolink surface system (`product-page/surface.ts:7-13`, repainting every panel from the creator's painted background) and the "Back to bio" chip (`digital-product-public-pages.tsx:663-692`).

The substance the reference mockup (`/tmp/opencode/ref-design/`) ships is absent: no audio player/track list/duration, no file manifest with sizes, no FAQ, no store header, no deck paragraph — repo grep for `AudioPlayer|FileManifest|ProductFaq|StoreHeader` returns zero matches. Coherence gaps across the four variants: course gets stat tiles + Curriculum tab; ebook/audio/digital get an icon swap (`product-type.tsx:10-22`) and often a blank meta row, so they read as unfinished rather than minimal.

**Deterministic scan:** `impeccable detect --json` over `digital-products/public` + `shared/product-card.tsx` → `[]`, exit 0, zero findings, no suppression (no `impeccable-disable` comments; `detector.ignoreRules: []`; ignoreValues target unrelated files). But controls prove the clean result is not evidence: the detector's code-file path returns `[]` even for known-violating controls (`text-[#25D366]`, `mr-2.5`, `ml-2`, `text-gray-500`, `text-[13px]`), while HTML targets do fire. Its coverage on TSX is effectively inert, so the manual sweep in the audit is the real deterministic substitute (4 raw colors, 3 resting shadows, physical `left-1/2` all found by hand). Zero false positives — there were zero findings to verify.

**Visual overlays:** none available — injection preflight could not run without a connected browser. No user-visible overlay exists.

## Overall Impression

The transactional skeleton is genuinely sound: one primary action, a sticky price rail, an excellent post-purchase arc. But the pre-purchase page reads as one generic commerce template wearing a themed veneer — four product types share a single layout, the moment of payment shows neither the order nor any reassurance, and the theme system leaks app-level colors into store-painted panels exactly where trust matters most. The single biggest opportunity: make the first screen and the payment moment answer "what do I get, and is this safe."

## What's Working

1. **The post-purchase arc is the page's best work** (`digital-product-public-pages.tsx:322-398, 694-802`): state, confirmation, receipt destination, per-file rows with remaining counts, and honest still-waiting vs couldn't-check states ("Your payment is safe").
2. **Cancellation is a state, not an error.** `checkoutCancelled` re-offers the product (`product-pricing-card.tsx:60-70`) and the dialog refuses to close mid-submit (`:434-437`) — thoughtful transactional design most templates get wrong.
3. **Exactly one primary action, and it belongs to the creator** — the CTA inherits `--biolink-button-*`, so "Buy now" is the store's color, never competing with a second filled button.

## Priority Issues

**[P0] Theme-blind colors inside `--biolink-*` panels — checkout rescue copy unreadable on painted stores**
Where: `shadcn/alert/alert.tsx:43,55` (`*:data-[slot=alert-description]:text-foreground`) rendered from `product-pricing-card.tsx:61-80` and `digital-product-public-pages.tsx:750-759`; `product-reviews-block.tsx:199` (`text-primary`).
Why: panel text comes from store-painted `--biolink-text`, but the Alert description is forced to the app's `--color-foreground`, and Counter Blue on a black painted surface measures ≈2.8–3.4:1 — so "Your product is still available when you are ready." and "Please try again in a moment." vanish on dark-painted stores, and the blue injects a second accent (Single Accent Rule). WCAG 1.4.3 / 2.4.11.
Fix: scope Alert to `--biolink-text`/`--biolink-muted-text`/`--biolink-border` on this page; derive `--biolink-accent`/`--biolink-focus` that swap to Counter Blue Light on dark surfaces (same mechanism as `resolveMutedTextColor`, biolink-appearance.ts:442-460).
Command: `/impeccable colorize`

**[P0] The payment moment shows no order and no risk reversal**
Where: `digital-product-public-pages.tsx:400-563` (`BuyerDetailsDialog`) vs `ref-design/components/pricing-card.tsx:18-34,86-89`.
Why: Persuade's highest-stakes screen collects name/email/phone while displaying neither product, nor total, nor guarantee — the only trust cue is a lock glyph and a provider name hidden in the phone helper (`:526-528`). The reference answers the same moment with "Secure checkout — access delivered instantly after payment", "14-day money-back guarantee", "Lifetime access & free updates".
Fix: order-recap row in the dialog header (thumb + title + formatted total); move risk reversal into the price rail (refund window, instant delivery, formats); name the redirect: "Continue to Chapa secure checkout".
Command: `/impeccable clarify`

**[P1] One template for four product types — the "looks generated" core**
Where: `product-type.tsx:10-22` (icon swap is the entire type system); missing `audio-player` / `file-manifest` / `product-faq` / `store-header` (0 matches) vs `ref-design/components/audio/*`, `download/file-manifest.tsx`, `product-faq.tsx`.
Why: an audio buyer sees no runtime or track list; a download buyer no file names or sizes; an ebook buyer no page count or sample — combined with blank meta rows for non-courses (`product-summary.tsx:76-84`) they read as unfinished, while the course page reads as a different product. No deck paragraph under the H1 anywhere.
Fix: add the deck line; per-type detail blocks (track list + duration, file manifest with sizes, format/page-count/sample) as a content block; add an FAQ covering delivery, formats, refunds.
Command: `/impeccable shape`

**[P1] Shared product-card drift: raw palette colors and a touch-unusable carousel**
Where: `shared/product-card.tsx:175` (`fill-current text-amber-500`), `:141,149` (`bg-black/30 text-white`), `:189` (`bg-white` dots), `:181` (`bottom-3 left-1/2` — physical, breaks the RTL rule), `:136-154` (arrows `opacity-0` until `group-hover`), `:180-195` (6×6px dots 12px apart) — all locked in by `product-card.test.tsx:30-31,47-49`.
Why: the same product shows bright amber stars in the grid and `text-warning` on its detail page — a visible seam; white controls on `bg-black/30` over a light cover ≈2.1:1; touch users never see the arrows (no hover) and 6px dots fail WCAG 2.5.8 AA. Token-Only Rule forbids the raw classes outright.
Fix: `text-warning`, foreground/background tokens for scrims, `start-1/2` centering, controls visible on coarse pointers, ≥24px dot targets — then update the test assertions so the suite enforces the rule.
Commands: `/impeccable colorize`, `/impeccable adapt`

**[P1] i18n defects locked in by tests, plus missing extraction tooling**
Where: `product-reviews-block.tsx:67` raw `'Unable to load reviews.'` rendered at `:135-139`; 5 untranslated `aria-label`s (`digital-product-public-pages.tsx:584`, `product-tabs.tsx:24`, `product-card.tsx:140,148,191`); `Intl.DateTimeFormat(undefined, …)` in `digital-product-public-pages.tsx:914-919` and `product-reviews-block.tsx:248-252`; `package.json:7` points `extract` at `resources/scripts/extract-translations.js` which does not exist.
Why: violates PRODUCT.md principle 3 directly — untranslated visible copy is a defect — and without the script no fix can reach the catalog.
Commands: `/impeccable clarify`, `/impeccable harden`

## Persona Red Flags

**Casey (distracted mobile buyer):** the price rail is `lg:sticky` only (`digital-product-public-pages.tsx:254`), so "Buy now" scrolls out of existence on phones the moment Casey reaches Overview — only the tab strip stays pinned, and it can't purchase. The rating reflows after paint (`product-summary.tsx:96-109`). Above the fold carries six micro-statements, none of them a reason to buy.

**Riley (stress tester):** Buy now → 3-field PII dialog with no product, no total, no close button (`:442`); errors never clear while typing (`:146-149`). Keyboard focus on the CTA derives the ring from the button's own face (`biolink-appearance.ts:224,264`), which can match the panel. Curriculum tab on a failed fetch → registered tab that renders nothing (`:193-199`, `:819`).

**Jordan (first-timer):** doesn't know what arrives — no deck, no formats, no sizes, no sample; the answers live in a tab below the price card. "Access your purchase anytime from My Orders" assumes an account that doesn't exist. "Continue to payment" redirects off-site with no warning. No FAQ, no refund policy link anywhere.

**Sam (accessibility-dependent):** focus ring derived from button face can disappear; Alert descriptions resolve to app `text-foreground` on painted panels — the checkout-failure copy is most unreadable exactly when it matters; active tab color has three competing sources (`product-tabs.tsx:25,31` vs `shadcn/tabs/tabs.tsx:67`); the active tab panel's focus is removed entirely (`product-tabs.tsx:43` `outline-none` on a `tabIndex=0` panel); dialog has Escape only.

## Minor Observations

- Back label differs across routes: "Back to bio" (`:235`) vs "Return to bio" (`:326`).
- Gallery fallback copy is trust copy where product art belongs — and it's also shown when a cover *fails to load*, so a broken image claims security (`product-gallery.tsx:16-18`).
- Title `text-3xl sm:text-4xl` and price `text-4xl` are the same size — the eye alternates instead of reading title → price → action.
- Reviews empty state is the page's only dashed container, so emptiness reads as broken (`product-reviews-block.tsx:126-131`).
- `rounded-full` gallery badge vs the badge recipe `rounded-card-sm`/16px; `Tabs.Tab` `h-[calc(100%-1px)]` hairline hack fakes a line indicator inside a segmented shell — two visual languages in one 40px strip.
- 12px `text-xs` carries full sentences (trust note, reviews helper) — Two-Size Rule reserves 12px for badges/metadata; prose sits at 14px where reading size is 16px.

## Questions to Consider

1. If a creator's theme can repaint every surface, what still belongs to Linket? Should the buy CTA, focus ring and in-content links be locked to Counter Blue, or fully inherited — and if inherited, who guarantees AA when the contrast resolver has already had to patch the button twice?
2. Why does the buyer surrender name, email and phone before seeing a total? What would an email-only buy step do to completion versus the current three-field dialog that reveals the payment provider only inside the phone helper?
3. What is the first-paint promise for each type? If an audio buyer's answer is "how long, what format, can I hear it" and a download buyer's is "what files, how big" — why does the page answer both with the same icon swap instead of the per-type modules the reference design already wrote?
