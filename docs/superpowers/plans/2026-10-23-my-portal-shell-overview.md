# My Portal Shell + Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/my-portal` as a sectioned shell with Overview home (`?section=`), matching the approved Slice 1 spec.

**Architecture:** Keep `order-lookup-page.tsx` as the data/auth entry. Extract section shell + overview UI into focused modules. Sidebar drives `?section=`; Overview consumes courses/orders already loaded by the library.

**Tech Stack:** React 19, react-router, `@shadcn/*`, lucide, `<Trans />`, existing portal APIs.

**Spec:** `docs/superpowers/specs/2026-10-23-my-portal-shell-overview-design.md`

## Global Constraints

- Semantic tokens only; `@shadcn/*` then `@ui/*`; Base UI not Radix
- Static `<Trans message="..." />` for visible copy
- No new portal APIs in Slice 1
- Audio section = empty state; Settings = link out / guest CTAs
- Do not paste v0 Next `components/ui/*`

## File map

| File | Role |
| --- | --- |
| `resources/client/digital-products/public/portal-section.ts` | Section id type + parse/normalize helpers |
| `resources/client/digital-products/public/portal-shell.tsx` | Section state + sidebar + active panel |
| `resources/client/digital-products/public/portal-overview.tsx` | Overview UI |
| `resources/client/digital-products/public/my-portal-sidebar.tsx` | Expand nav to overview/courses/downloads/audio/orders + counts |
| `resources/client/digital-products/public/order-lookup-page.tsx` | Wire shell; stop hash-scroll IA |
| `resources/client/digital-products/public/portal-shell.test.ts` | Section parse + overview empty continue |
| `resources/client/digital-products/public/order-lookup-page.test.tsx` | Update expectations for `?section=` |

---

### Task 1: Section helpers (TDD)

**Files:**
- Create: `portal-section.ts`
- Create: `portal-section.test.ts`

**Produces:** `PortalSection`, `PORTAL_SECTIONS`, `parsePortalSection(raw: string | null): PortalSection`

- [x] Write failing tests for default `overview`, valid ids, invalid → `overview`
- [x] Implement helpers
- [x] Tests pass

### Task 2: PortalOverview (TDD + UI)

**Files:**
- Create: `portal-overview.tsx`
- Create: `portal-overview.test.tsx`

**Consumes:** `PortalCourse`, `continueCourses`, order list shape from library
**Produces:** `<PortalOverview courses orders onNavigate name memberSince? />`

- [x] Test: no continue card when no in-progress course
- [x] Test: jump cards call `onNavigate` with section ids
- [x] Implement Overview with Card / Progress / Button / Table or order rows
- [x] Tests pass

### Task 3: Sidebar + PortalShell

**Files:**
- Modify: `my-portal-sidebar.tsx` — `PortalNavSection` → full section set; counts; remove hash scroll observer
- Create: `portal-shell.tsx` — sync `useSearchParams`, render sidebar + children by section

**Produces:** `<PortalShell mode email active onNavigate counts>{panels}</PortalShell>`

- [x] Sidebar lists Overview, My courses, Downloads, Audio library, Orders + settings/logout
- [x] Shell reads/writes `?section=`
- [x] Mobile sheet still works

### Task 4: Wire library page

**Files:**
- Modify: `order-lookup-page.tsx` — wrap content in `PortalShell`; Overview panel; embed existing courses/downloads/orders panels; audio empty; settings link behavior
- Modify: `order-lookup-page.test.tsx` — assert `?section=` / Overview wiring

- [x] Loading / guest error paths unchanged
- [x] Demo library still works for empty guests
- [x] Existing download/receipt/review actions still work in downloads/orders sections

### Task 5: Verify

- [x] `npm run test --` portal-related files
- [x] `npm run build`
- [x] Browser: `/my-portal` as admin → Overview; switch sections; 360px menu

---

**Commit policy:** Commit only when the user asks. Do not push.
