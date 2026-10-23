# My Portal Download + Audio Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/my-portal/downloads/:orderId` and `/my-portal/audio/:orderId` detail pages with Open links from pack cards.

**Architecture:** Detail pages load the purchase from `/api/v1/public/my-portal/library` (plus demo orders for empty guests), reuse the same signed-URL download + resend-receipt POSTs as the list view, and share lesson-player chrome (`MyPortalShell wide` + `lg:grid-cols-[minmax(0,1fr)_340px]`). Audio plays streamable signed URLs in `<audio>`; otherwise Play falls back to download.

**Tech Stack:** React 19, react-router, `@shadcn/*`, lucide, `<Trans />`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-my-portal-download-audio-detail-design.md`

## Global Constraints

- No `@app/account-settings` imports
- No new portal APIs; no fake license / changelog / BPM / format toggles
- Semantic tokens; static `<Trans message="..." />`
- Demo orders toast without real download/receipt
- Commit only when user asks

## File map

| File | Role |
| --- | --- |
| `portal-pack-order.ts` | Types + find order in library/demo + streamable helper |
| `portal-pack-actions.ts` | CSRF + download URL + resend receipt helpers |
| `portal-download-detail-page.tsx` | Download center |
| `portal-audio-player-page.tsx` | Audio pack player |
| `portal-entitlement-packs.tsx` | Open link to detail |
| `app-router.tsx` | Register routes |
| `my-portal-pack-detail-routes.test.tsx` | Route + isolation + Open link asserts |

---

### Task 1: Failing route/isolation tests

- [x] Assert router paths + Open href pattern + no account-settings

### Task 2: Shared pack helpers + download detail page

- [x] Implement helpers + download page; wire route
- [x] Tests pass for download route

### Task 3: Audio player page + Open links

- [x] Audio page with prev/play/next + streamable `<audio>`
- [x] Pack cards link Open → detail
- [x] Tests pass

### Task 4: Verify

- [x] Vitest for portal pack detail
- [x] `npm run build`

---

**Commit policy:** Commit only when the user asks. Do not push.
