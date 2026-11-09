# Product Create Layout Hierarchy Implementation Plan

> **For agentic workers:** Steps use checkbox status for independent verification.

**Goal:** Widen digital/ebook/audio create shells and separate setup status from the first authoring section without touching course layout or Sentry.

**Architecture:** Keep editors (`EbookEditor`, `DigitalProductEditor`, `AudioEditor`) as section stacks. Change only the shared form-page shell: container width + status band wrapping `ProductFormProgress` and readiness hint.

**Tech Stack:** React/TypeScript, Tailwind tokens, Vitest source contracts, existing DOM editor tests.

**Spec:** `docs/superpowers/specs/2026-11-09-product-create-layout-hierarchy-design.md`

## Task 1 — Preserve Sentry and start clean branch
- [ ] Stash Sentry-related files (`sentry.php`, exception handler, Settings, `main.tsx`, `.cursor/mcp.json` sentry entry)
- [ ] Discard unrelated dirty files; check out clean `origin/main`
- [ ] Create `fix/product-create-layout-hierarchy-20261109`

## Task 2 — Failing contract test
- [ ] Extend `digital-product-form-page.test.tsx` for `max-w-5xl`, status band test id, and non-course authoring layout test id
- [ ] Run test; confirm RED

## Task 3 — Implement shell
- [ ] Update `digital-product-form-page.tsx` non-course shell and digital/ebook/audio wrappers
- [ ] Run form-page + ebook/digital/audio editor tests; confirm GREEN
- [ ] Commit and open PR
- [ ] Restore Sentry stash on `main` (uncommitted); leave repo clean of unrelated noise
