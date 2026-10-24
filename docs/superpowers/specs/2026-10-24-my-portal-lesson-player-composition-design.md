# My Portal — Lesson Player Composition — Design

Date: 2026-10-24  
Status: approved in chat (Approach 1 — restructure composition)  
Mode: **Operate** (buyer learning)  
Builds on: `2026-10-23-my-portal-lesson-player-chrome-design.md`  
Primary surface: `resources/client/dashboard/my-learning/lesson-player-page.tsx`  
Shared list: `resources/client/dashboard/my-learning/course-curriculum-list.tsx`

## 1. Intent

The lesson player still reads as a generated template: wrong title hierarchy when course title is missing, progress shown twice, redundant “Course curriculum” labels, double-bordered video stage, and a hollow Overview empty state. Restructure the page so a buyer always knows **which course**, **which lesson**, and **where they are in the syllabus**, without inventing badges or actions.

## 2. Scope

**In**

- Page-level information architecture on `/my-portal/courses/:courseId/lessons/:lessonId`
- Curriculum rail / mobile sheet presentation (same panel content)
- Overview empty state and video stage chrome
- Small shared polish in `CourseCurriculumList` that both hub and player inherit (redundant chapter chrome, denser rows)

**Out**

- Fake metadata badges (Advanced, Live Class, etc.)
- Save for Later / Continue Learning CTAs that are not backed by current player flows
- Notes tab, quiz behavior changes, API/schema changes
- Seller dashboard or storefront course UI
- Full redesign of `course-learn-page.tsx` layout (only inherited list polish)
- Invented lesson durations when `duration_seconds` is absent

## 3. Approach

Refactor presentational structure in `lesson-player-page.tsx`; tighten `CourseCurriculumList` for single-chapter / duplicate-title noise. Keep `LessonVideo`, mark-complete, prev/next, tabs, quiz, resource downloads, and portal fetch helpers unchanged in behavior.

## 4. Information architecture

| Region | Current problem | Target |
| --- | --- | --- |
| Top meta | Eyebrow “Course”; H1 uses `course.title` (often unset) and falls back to **lesson** title; progress duplicated with rail | Back link → page H1 = **`course.product.title`** (same source as course hub). If that is missing, translated “Course” — **never** `lesson.title`. No top-of-page progress bar. Progress lives **only** in the curriculum rail (and the same panel inside the mobile sheet). |
| Under video | Second title block repeats lesson; chapter eyebrow often equals “Course curriculum” | **Lesson title** as H2; meta line “Lesson N of M” from flat syllabus order; show chapter name only when it adds information (not empty, not identical to “Course curriculum”, not identical to the course title). |
| Controls | Prev / Mark complete / Next | Same actions; keep completed vs incomplete button states; compact cluster aligned with lesson title row. |
| Overview | Bordered empty card: “No summary added yet.” | Soft empty: muted prose, no heavy card void; if resources exist, one-line cue that files are under Resources. Video lessons with summary (or readable content) unchanged. |
| Curriculum rail | Progress + percent already in header and again in card; chapter band repeats card title | Card header: title + `completed/total` + single progress bar. List: hide chapter section header when there is only one chapter **or** chapter title equals a redundant label (“Course curriculum” / course title). Active / complete / locked row affordances stay. |
| Video stage | Wrapper + inner stage both bordered/rounded | Single stage surface (one border / radius stack). |
| Mobile | Sheet wraps full card including duplicate sheet title + card title | Sheet title remains; avoid stacking an identical second title inside the panel when opened from the sheet (prefer list + progress without repeating the sheet heading as Card.Title, or use a compact panel variant). |

## 5. Components / data

- **Sources of truth:** existing `fetchPortalLesson` + `fetchPortalCourseLearn` payloads (`course.product.title`, `progress`, `chapters`, lesson `summary` / `content` / `resources`).
- **Course title fallback order:** `course.product?.title` → translated “Course”. Never `lesson.title` for the page H1. Align with `course-learn-page.tsx`, which already headings off `course.product.title`.
- **Lesson index:** `N of M` from flattened published syllabus order already used for prev/next.
- **Shared list:** Prefer extracting a small `hideChapterHeaders` (or equivalent) prop / heuristic inside `CourseCurriculumList` rather than duplicating row markup.
- **i18n:** All new visible strings via `<Trans message="..." />` with static `message` props.
- **Tokens:** semantic Tailwind tokens only; no raw palette colors.

## 6. Testing

- Component/source tests: page H1 uses course title (or non-lesson fallback), not lesson title when both exist; progress not rendered in the top meta region; Overview empty state copy; no Notes tab regression; back link still `?section=courses`.
- Curriculum list: single-chapter / redundant chapter title does not render the muted chapter band.
- Keep existing lesson/video/completion tests green where applicable.
- Run focused frontend tests for touched files; no new backend tests unless API touched (it should not be).

## 7. Non-goals / non-regressions

- Do not paste v0 `components/ui/*` or invent portal library Continue/Save controls on this page.
- Do not nest the player under account-settings or force full `PortalLibraryLayout` sidebar.
- Access, sequential unlock, and quiz-gating behavior unchanged.
