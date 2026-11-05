# Linket Storefront UI — Slice 01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the approved Linket storefront experience without changing business logic: recover failed public product loads in place and give desktop creators a larger live preview.

**Architecture:** Keep the existing store editor, phone-preview document and `--biolink-*` appearance boundary. Extend two existing components in place; retain the existing mobile sheet and creator-side live `postMessage` draft flow. Use existing shadcn/Base UI `Button`, `Empty`, and `Dialog`; no new component library or API.

**Tech Stack:** React 19, TypeScript, Tailwind 4, shadcn/Base UI, Vitest and React Testing Library.

**Spec:** [Storefront UX Project](https://app.notion.com/p/40ebae7367ac81fdbb97cf797bd2482a), [SF-04 preview](https://app.notion.com/p/40ebae7367ac81af93abe2244f4036c0), [SF-08 retry](https://app.notion.com/p/40ebae7367ac81be856dc5f863b5b4af), [DESIGN.md](../../DESIGN.md)

## Global Constraints
- Preserve dashboard chrome and "Creator's Counter" visual identity.
- Translate all user-facing text with Linket's existing `Trans`, `message` and `useTrans`.
- Public appearance uses existing `resolveBiolinkButtonAppearance` and `--biolink-*` tokens; no hard-coded theme colors.
- Keep public product selection, URLs and pricing unchanged.
- Do not touch Laravel, payments, Verify.et, creator receiving accounts, billing, approval, file access or publishing.
- Do not merge or deploy without CI and human review.

## UI consistency checklist
- Storefront failure panel: current `Empty.Root/Header/Media/Title/Description`; add `Empty.Content` and a contextual `Button`, matching existing `View` appearance and touch-size recipe.
- Storefront loading: current skeleton cards and `aria-busy`; use same loading path after Retry.
- Storefront successful load: preserve product ID filtering, `ProductCard` and appearance-driven `View`.
- Storefront cancellation: ignore responses from superseded retries or unmounted requests.
- Editor desktop preview: keep `LivePreview` panel, `PhonePreview` and current draft `postMessage` protocol.
- Editor expanded preview: use existing `Dialog`, accessible title/focus, responsive containment and native dialog dismissal.
- Editor mobile preview: preserve existing `Sheet`, focus return, `Esc`, and lazy mounting; no overlay over the form.

## Review focus
1. Repeated failures should permit another retry without reloading the whole public page.
2. An in-flight request resolving after route/store changes must not replace newer data.
3. An empty successful product list is not a fetch error and should not show Retry.
4. Expanded preview should reflect draft edits and current editor section without modifying saved state.
5. Compact editor view must retain the original mobile bottom sheet, reachable via keyboard and screen readers.

---

### Task 1: Public storefront inline recovery

**Files:**
- Modify: `resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx`
- Test: `resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.test.tsx`
- Test: `resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.dom.test.tsx` (new)

**Interfaces:**
- Consumes: `apiClient.get('/api/v1/public/stores/${storeId}/digital-products')`, `Empty`, `Button`, appearance resolver.
- Produces: retry click reuses the existing GET, renders loading skeleton, then data or a recoverable error.

- [ ] Write failing DOM regression: first GET rejects; Retry triggers same GET; second GET resolves; products render without a full reload.
- [ ] Run the focused test (red).
- [ ] Implement a retry trigger in the existing effect dependency with cancellation intact; add translated, appearance-styled Retry action in `Empty.Content`.
- [ ] Run focused test and existing static contract tests; confirm empty/success paths.
- [ ] Commit the self-contained change.

### Task 2: Expand desktop live preview

**Files:**
- Modify: `resources/client/dashboard/stores/store-editor/live-preview.tsx`
- Test: `resources/client/dashboard/stores/store-editor/live-preview.dom.test.tsx`

**Interfaces:**
- Consumes: `PreviewDevice`, `Dialog`, `PhonePreview`, and existing draft/section `postMessage`.
- Produces: desktop `Expand preview` action opening an accessible modal with a larger live iframe preview.

- [ ] Add DOM regression for expanded dialog: accessible trigger/title, lazy second iframe, `Esc` and focus return.
- [ ] Run focused test (red).
- [ ] Add modal to existing desktop panel using current `Dialog` primitives and fitted `PreviewDevice`, without changing the mobile sheet.
- [ ] Run existing preview synchronization and mobile-sheet tests; check current `postMessage` behavior.
- [ ] Commit self-contained change.

### Task 3: Review and evidence

**Files:** This plan, Notion tasks SF-04 / SF-08, PR metadata.

- [ ] Run `npm test -- --run resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.test.tsx resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.dom.test.tsx resources/client/dashboard/stores/store-editor/live-preview.dom.test.tsx` and TypeScript/build checks in CI.
- [ ] Review desktop and mobile screenshots at 360, 375, 768, 1024, and 1440 widths with 200% zoom. If unavailable, mark pending.
- [ ] Open draft PR against `main`, never auto-merge.
- [ ] Update Notion with actual links, pending tests, and approval state.

**Release decision:** HOLD until green CI, manual visual/a11y review and explicit merge approval.
