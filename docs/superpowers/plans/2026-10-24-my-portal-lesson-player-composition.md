# My Portal Lesson Player Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `/my-portal/courses/:courseId/lessons/:lessonId` with the v0 CoursePlayer composition and stop full-page flashes when switching lessons.

**Architecture:** Presentational refactor of `lesson-player-page.tsx` (DetailHeader-style meta, split aside cards) plus shared `CourseCurriculumList` row polish. Keep portal fetch helpers; change only the load effect so course/lesson state is retained across `lessonId` navigations.

**Tech Stack:** React 19, react-router, `@shadcn/*`, lucide, existing portal APIs.

## Global Constraints

- Visible copy via `<Trans message="..." />` with static messages
- Semantic tokens only; `@shadcn/*` then `@ui/*`
- No Notes tab, fake scrubber, or invented access badges
- No `space-y-*`; use `gap-*`

## File map

| File | Responsibility |
| --- | --- |
| `lesson-player-page.tsx` | Page composition, load stability, aside split |
| `course-curriculum-list.tsx` | Row / chapter band polish |
| `lesson-player-page.test.ts` (new or extend) | Source assertions for IA + load effect |
| `course-curriculum-list.test.ts` (new) | Redundant chapter header heuristic |

---

### Task 1: Failing source tests for IA + stable load

**Files:**
- Create: `resources/client/dashboard/my-learning/lesson-player-composition.test.ts`
- Create: `resources/client/dashboard/my-learning/course-curriculum-list.test.ts`

- [ ] Write tests asserting lesson-player source contains `product.title` for H1 path, `Your progress`, does not `setLesson(null)` and `setCourse(null)` together on every load effect start, and has no Notes tab string as a Tabs.Tab
- [ ] Write curriculum list test for hiding chapter band when single chapter titled “Course curriculum”
- [ ] Run tests — expect fail
- [ ] Commit

### Task 2: Curriculum list polish

**Files:**
- Modify: `course-curriculum-list.tsx`

- [ ] Completed icon → primary filled circle + Check (match CoursePlayer)
- [ ] Duration right-aligned on the row when present
- [ ] Hide chapter header when only one chapter or title is redundant (`Course curriculum` / equals courseTitle prop)
- [ ] Optional `courseTitle?: string` prop
- [ ] Pass tests
- [ ] Commit

### Task 3: Lesson player composition + stable switch

**Files:**
- Modify: `lesson-player-page.tsx`

- [ ] Header: product title H1; instructor eyebrow; remove top progress
- [ ] Aside: progress Card + curriculum Card; mobile Sheet same stack
- [ ] Soft Overview empty; single stage border
- [ ] Load: keep previous lesson/course while refetching; full Spinner only when no lesson yet on first paint
- [ ] Soft-refresh course after lesson fetch without clearing
- [ ] Pass tests
- [ ] Commit

### Task 4: Verify

- [ ] `npm run test -- lesson-player-composition course-curriculum-list lesson-video` (or project equivalent)
- [ ] Manual: switch lessons — curriculum stays, no full blank flash
