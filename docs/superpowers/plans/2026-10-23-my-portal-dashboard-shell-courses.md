# My Portal Dashboard Shell + Courses List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/my-portal` library chrome on floating `DashboardLayout` + portal-owned `Sidebar` (isolated from `/account-settings`), then restyle courses as horizontal rows.

**Architecture:** Dedicated `DashboardLayout.Root` (`linket-my-portal`) wraps library sessions only. Portal sidebar and section layout are new modules that copy Account Settings *patterns*, never its modules or routes. `?section=` and Overview content stay; `PortalCourseCard` becomes a horizontal list row using existing course fields.

**Tech Stack:** React 19, `DashboardLayout` / `Sidebar` from `@common/ui/dashboard`, `@shadcn/*`, lucide, `<Trans />`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-my-portal-dashboard-shell-courses-design.md`

## Global Constraints

- Same primitives as settings; **zero** imports from `resources/client/account-settings/*` or account-settings sidebar config
- Do not nest portal under `/account-settings`; Account settings nav is link-out only
- Semantic tokens; static `<Trans message="..." />`
- No new portal APIs; estimate lessons-done from percent
- Keep recovery OTP on `MyPortalShell` (narrow); library uses `PortalLibraryLayout`
- Commit only when user asks

## File map

| File | Role |
| --- | --- |
| `portal-library-layout.tsx` | `DashboardLayout.Root` + Content for library |
| `portal-section-layout.tsx` | MainSection + SectionHeader + scroll body |
| `my-portal-sidebar.tsx` | Rewrite Card → floating `Sidebar` + identity |
| `order-lookup-page.tsx` | Wire library into `PortalLibraryLayout` |
| `my-portal-library-ui.tsx` | Horizontal course rows + lessonsDone helper |
| `portal-library-layout.test.tsx` / `my-portal-library-ui` tests | Shell isolation + row helpers |
| `order-lookup-page.test.tsx` | Expect DashboardLayout / no account-settings imports |

---

### Task 1: Lessons-done helper + course row (TDD)

**Files:**
- Modify: `resources/client/digital-products/public/my-portal-library-ui.tsx`
- Test: extend or add `my-portal-library-ui` / portal course tests

**Produces:** `estimateLessonsDone(percent, total): number`; horizontal `PortalCourseCard`; stack `PortalCourseGrid`

- [x] Failing tests for estimate clamp + CTA labels
- [x] Implement helper + row UI
- [x] Tests pass

### Task 2: PortalSectionLayout + PortalLibraryLayout

**Files:**
- Create: `portal-section-layout.tsx`
- Create: `portal-library-layout.tsx`
- Test: source/assert layout name `linket-my-portal`; no account-settings imports

- [x] Section layout mirrors AccountSettingsPageLayout API (`title`, `children`)
- [x] Library layout: Root + Content; children = sidebar + section
- [x] Tests pass

### Task 3: Rewrite PortalSidebar

**Files:**
- Modify: `my-portal-sidebar.tsx` — replace Card/`Item` nav with `Sidebar.*`
- Keep `PortalAccountLayout` API or fold into library layout (prefer: `PortalSidebar` props + `PortalSectionLayout` in page)

- [x] Identity header + library + account groups
- [x] Guest vs auth footers unchanged in behavior
- [x] Mobile Logo in header when compact (via layout context)

### Task 4: Wire MyPortalLibrary

**Files:**
- Modify: `order-lookup-page.tsx` — drop `MyPortalShell wide` for library; use `PortalLibraryLayout` + sidebar + `PortalSectionLayout` per section
- Modify: `order-lookup-page.test.tsx`

- [x] Recovery still uses `MyPortalShell`
- [x] Sections render inside section layout titles
- [x] Tests pass; no account-settings imports in portal files

### Task 5: Verify

- [x] Portal-related Vitest
- [x] `npm run build`
- [x] Browser when DDEV available

---

**Commit policy:** Commit only when the user asks. Do not push.
