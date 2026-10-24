# My Portal — Lesson Player Composition — Design

Date: 2026-10-24  
Status: approved in chat; refined against v0 `CoursePlayer` + screenshot  
Mode: **Operate** (buyer learning)  
Builds on: `2026-10-23-my-portal-lesson-player-chrome-design.md`  
Visual reference: `digital-product-page-design` `CoursePlayer` / `DetailHeader`  
Primary surface: `resources/client/dashboard/my-learning/lesson-player-page.tsx`  
Shared list: `resources/client/dashboard/my-learning/course-curriculum-list.tsx`

## 1. Intent

Match the inspiration course-detail composition so lesson switching feels continuous and the page no longer reads as a sparse template. Real video, mark-complete, prev/next, quiz, and downloads stay; fake player chrome and Notes stay out.

## 2. Scope

**In**

- Detail header: back → `?section=courses`; eyebrow `Course` + optional ` · {instructor}`; H1 = `course.product.title` (never lesson title)
- Main column: single-border video/readable stage; under-stage lesson meta (chapter when informative) + lesson H2 + prev / Mark complete / next; Tabs Overview / Resources / Quiz when present
- Aside (desktop sticky): **separate** “Your progress” card (`completed/total` + Progress) + curriculum card (scrollable list only — no progress inside the list card)
- Mobile: Curriculum sheet embeds the same aside stack
- `CourseCurriculumList`: denser rows (duration right-aligned when present); completed = primary filled check circle; active = play icon; quieter chapter bands; hide redundant single-chapter / “Course curriculum” bands
- Soft Overview empty (muted prose / Empty), not a hollow void card
- Lesson-switch UX: do **not** null course/lesson and flash a full-page Spinner on every `lessonId` change; keep shell + curriculum mounted; swap stage content; soft-refresh course progress in background

**Out**

- Notes tab, local notes UI
- Fake play/pause overlay, elapsed scrubber, mock duration meter on the video stage (YouTube/file player stays as today)
- Access-expires badge without learn-payload fields
- Download certificate CTA
- Save for Later / Advanced / Live Class badges
- API/schema changes
- Seller dashboard

## 3. Approach

Refactor `lesson-player-page.tsx` layout to the CoursePlayer grid; split progress vs curriculum in the aside; tighten `CourseCurriculumList`; fix load effect so only the first visit (or hard error) uses the centered Spinner.

## 4. Layout

| Region | Content |
| --- | --- |
| Header | Back “My courses”; eyebrow; course product title H1; no page-level progress |
| Left | Stage → lesson title row + controls → tabs |
| Right | Progress card, then curriculum list card; sticky `top-6` |
| Mobile | Curriculum trigger → Sheet with progress + list |

## 5. Testing

- Source tests: H1 uses `product.title`; no top-of-page progress; “Your progress” present; no Notes tab; back href `section=courses`; load effect does not `setLesson(null)` / `setCourse(null)` on every lesson change when shell already has data
- Curriculum list heuristic for redundant chapter headers
- Existing lesson/video tests stay green

## 6. Non-goals

No paste of v0 `@/components/ui/*`. No Superdesign-generated HTML commit (CLI unauthenticated this session; inspiration used as visual truth).
