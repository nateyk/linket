# SF-09 / SF-10 — Public product, course and service detail refinement

**Approved continuation:** Storefront UX project, November 5, 2026. Independent draft branch from `main` (do not merge or deploy). Keep [DESIGN.md](https://github.com/nateyk/linket/blob/main/DESIGN.md) "Creator's Counter" rhythm and existing `--biolink-*` Appearance tokens, Base UI/shadcn components, and multilingual `<Trans>`.

**Evidence:** [SF-09 Notion](https://app.notion.com/p/40ebae7367ac81a3b69bf69fe4b6d28c) and [SF-10 Notion](https://app.notion.com/p/40ebae7367ac81a0b3c1c5246f9c419c), screenshots and current source.

## Current UX problems confirmed from source

1. The free-product buyer details dialog and paid-product rail say checkout is unavailable or describe a one-time payment even when `payment_mode === 'free'`. Visible copy contradicts the declared payment mode. Do not change backend checkout.
2. Service details repeat an inquiry CTA in the package rail and seller card, and a viewport-specific mobile action. The seller card should be identity plus **secondary direct channels**, not another primary inquiry.
3. Chapter, lesson, product, service and package titles are truncated / lack long-token wrapping. Real English/Amharic names should remain readable without horizontal overflow.
4. Multi-package tabs with long translated titles can exceed mobile width. The rail should scroll horizontally, preserve keyboard focus, and keep indicator shadows unobscured.
5. Course stats currently nest framed cards inside the main product card. Prefer a simple, semantically grouped compact metric band.
6. Supporting product/service/FAQ text must wrap rather than be clipped, preserving creator words.

## Page-family conventions checklist (scoped)
Two public **detail** page families (product/course shared layout and service). Reference: `ProductSummary` + `ProductPricingCard` and `ServicePackagePanel`, using the public `biolinkSurfaceCard`/Appearance resolver.

- [ ] Heading: one semantic `h1` in each detail hero; inherited large type and `--biolink-text`; break long multilingual tokens without shortening the title.
- [ ] Intro: hero summary uses body text `--biolink-muted-text`; preserve 70ch measure.
- [ ] Gallery: keep existing cover and thumbnails; preserve image alt and aspect ratio.
- [ ] Course metrics: read in semantic definition list near title; no unnecessary additional card chrome.
- [ ] Tabs and course syllabus: keep existing Base UI Tabs/Accordion (keyboard, focus, labels); let titles wrap, horizontal scroll for many packages.
- [ ] Product rail: single buy/free primary action; identical label in mobile fallback. No fake payment claim for explicitly free products.
- [ ] Product checkout modal: no changes to verification, API or field validation; free mode text reflects no payment needed, paid mode keeps direct-payment instructions; unavailable remains disabled.
- [ ] Service package rail: one contextual request action per selected package; quote-only is never `0.00`; mobile sticky action is a viewport fallback, not a second simultaneous visible action.
- [ ] Seller card: profile identity and distinct direct links only, no second Send inquiry CTA.
- [ ] Service FAQ/description: preserve the tab, original content, and readable wrapping across narrow widths; meet 44px touch targets where applicable.
- [ ] No new fixed colors, fonts, shadows, radius or spacing tokens. Keep code small; don't touch payment, authorization, backend, editor or published creator data.

## Task 1 — RED tests
- [ ] Extend service page DOM tests for exactly one contextual quote path, deduped contact channels, long name and long-answer wrapping, mobile fallback action; add package tab scrollability test.
- [ ] Add DOM test for ProductPricingCard free/paid/unavailable statuses and one onBuy call; add source-contract tests for free checkout modal copy, mobile CTA label, curriculum and title wrapping.
- [ ] Record failing assertions before modifying production source.

## Task 2 — SF-09 details
- [ ] ProductSummary: wrap long names and deck, reduce nested course stat chrome without losing semantic `dl`.
- [ ] ProductOverview / ProductFaq: wrap long descriptions/outcomes/FAQ content.
- [ ] Course chapter and lesson titles: wrap long names; preserve accordion keyboard semantics and lesson duration placement.
- [ ] ProductPricingCard + mobile buy CTA + dialog: labels for `payment_mode === 'free'` should not claim payment is required/unavailable. Preserve payment-mode `unavailable` blocking, onBuy and direct-checkout flow.
- [ ] Confirm no change to paid order/download behavior.

## Task 3 — SF-10 details
- [ ] Remove redundant seller-card inquiry CTA, keep seller trust info and direct contact channels, dedupe identical generated destinations.
- [ ] Ensure packages tab controls scroll/retain width on mobile, long tier names and prices wrap, focused request still passes selected package id.
- [ ] Long service title, descriptions and FAQ can wrap; maintain responsive sticky quote fallback and direct contact link targets.

## Task 4 — QA and traceability
- [ ] Isolated-worktree targeted Vitest, TypeScript, scoped lint and production Vite build.
- [ ] Manual screenshots: 360/375/430/768/1024/1440, 200% zoom; no unhandled overflow, dark/light/Appearance gradients, keyboard/focus, Amharic and long Latin names, pricing and quote-only/free/disabled flows.
- [ ] Draft PR against `main`, no auto-merge; Notion SF-09/SF-10 status and evidence.
- [ ] NO-GO for production until CI, independently checked visual QA and explicit merge approval.

**Dependencies:** prior SF-05 PR #110 (draft) updates common Appearance context on other files; keep this slice independent and resolve merge conflicts when integration is approved. Other storefront drafts #105/#108 remain separate.
