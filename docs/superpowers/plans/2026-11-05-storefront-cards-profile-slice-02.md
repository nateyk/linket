# Storefront Cards and Profile — Slice 02 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify public digital-product and service-card anatomy using Linket's existing `ProductCard`, and improve the public creator profile's responsive readability and touch actions.

**Architecture:** Refactor `ServiceCard` to compose the already-used `ProductCard` from the shared digital-products layer. Add a narrowly optional `classNames.description` override to preserve creator Appearance colors without changing default dashboard cards. Improve existing `CreatorCard` content styles in place; do not alter tabs, routing, fetching or payment/business logic.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, Vitest, React Testing Library.

**Spec:** [Storefront UX Hub](https://app.notion.com/p/40ebae7367ac81fdbb97cf797bd2482a), [SF-02 tokens](https://app.notion.com/p/40ebae7367ac81dfa771d0a3d63082d6), [SF-06 creator profile](https://app.notion.com/p/40ebae7367ac81ba9ec3d735a6ad6890), [SF-07 product/service cards](https://app.notion.com/p/40ebae7367ac812fb828ef7ad27d9eb0).

## Global Constraints
- Preserve `DESIGN.md` creator counter rhythm, surfaces, radius and `--biolink-*` buyer theme; no new component system or arbitrary styling.
- Keep existing data loading, product/service prices, links, listing limits, navigation, publishing, payments, Verify.et and entitlements unchanged.
- Use existing `Trans`/`message` for displayed copy and existing `Button`/`Badge`/contact links.
- Apply 44px touch targets on coarse pointers; preserve native accessible names, focus and long Amharic/English text.
- All changes on a draft PR; **no merge/deployment** until CI and browser/accessibility review.

## Review Focus
1. A service without a cover must display a native fallback, not a broken image.
2. A service without a priced package must say `Request a quote`, never imply `0.00 Br`.
3. A long unbroken Latin/Amharic creator or product name should wrap/clamp without pushing a price/action out of view.
4. The preview's live `--biolink-muted-text` must paint the service description, not dashboard muted colors.
5. Exactly one View link per public item; no duplicate click targets or phantom purchases.

---

### Task 1: Test shared service card contract

**Files**
- Test: `resources/client/services/public/service-card.dom.test.tsx`
- Test: `resources/client/digital-products/shared/product-card.test.tsx`

- [ ] Add RED regression tests for card reuse, one View link, existing category/title/summary/price/package count, missing cover, theme description and long-title wrapping.
- [ ] Verify red on old code using focused Vitest where a runner is available.
- [ ] Record current DOM contract for service detail URL and price.
- [ ] Commit tests.

### Task 2: Reuse ProductCard for services

**Files**
- Modify: `resources/client/services/public/service-card.tsx`
- Modify: `resources/client/digital-products/shared/product-card.tsx`

- [ ] Replace duplicated service card layout with `ProductCard` props: `quiet`, `mediaOverlay`, `imageFallback`, `description`, `meta`, `price`, one Appearance-styled action, same 16:9 root shape.
- [ ] Add optional `description` className in shared ProductCard and a long-token wrap for shared title; leave dashboard defaults intact.
- [ ] Run existing service card and ProductCard regressions (or report blocked verification).
- [ ] Commit change.

### Task 3: Creator profile mobile readability

**Files**
- Modify: `resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx`
- Test: `resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.dom.test.tsx`

- [ ] Add RED mobile DOM test for long creator names, readable bio, full-width Message link and coarse-pointer social actions.
- [ ] Use token-based responsive classes in the existing CreatorCard, keeping desktop profile rail intact.
- [ ] Run creator-profile DOM tests and verify unchanged Products/Services/About navigation.
- [ ] Commit change.

### Task 4: Gate and record evidence

- [ ] Open a **draft PR** against `main` independently of PR #105.
- [ ] Run focused Vitest, TypeScript, build, mobile and desktop smoke checks; attach actual CI evidence (do not claim green before verified).
- [ ] Review 360 / 375 / 768 / 1024 / 1440, 200% zoom, keyboard and mixed English/Amharic.
- [ ] Update SF-02/SF-06/SF-07 Notion tasks with commit, PR, failures and blockers.

**Release gate:** HOLD pending verified tests, visual QA and explicit merge approval. Do not change server configuration or production.
