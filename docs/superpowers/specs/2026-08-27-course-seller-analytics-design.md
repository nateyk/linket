# Seller Course Analytics — Design

**Date:** 2026-08-27
**Status:** Approved (design); pending spec review → implementation plan

## Goal

Give course creators a clear view of how each of their courses is performing
— at the learner, lesson, and chapter level. This is a **seller-facing**
feature only (no buyer-facing analytics). The layout is the reference pasted in
chat: a 4-card overview plus a "Detailed performance" accordion per chapter
with a per-lesson table. No revenue. Scope is **Core lesson/chapter metrics**
on a **dedicated page**, reachable from the seller's product card (and, for
convenience, from the course builder header).

## Scope

In scope (reference HTML is the target wireframe):
- A backend aggregate endpoint returning per-course lesson/chapter performance
  metrics (active learners, avg lesson/chapter completion, per-lesson/chapter
  completion + drop-off).
- A dedicated frontend analytics page that mirrors the reference: 4-card
  overview (Active learners, Avg. lesson completion, Lesson completions,
  Avg. chapter completion) + a "Detailed performance" accordion (one item per
  chapter) with a per-lesson table (Completed learners, Completion rate with
  progress bar, Drop-off rate with progress bar, Edit button).
- An entry point on the seller's digital-product card when `type === 'course'`.
- Loading (`Skeleton`), empty (`Empty`), and error (`Alert`) states consistent
  with the recent builder polish.
- Backend + frontend tests.

Out of scope:
- Revenue, time-series / trend charts, buyer-facing analytics.

## Architecture

### Backend

- **Route** (in `app/Providers/AppServiceProvider.php`, existing `api/v1` group
  with `api`, `optionalAuth:sanctum`, `verified`, `verifyApiAccess` middleware):
  `GET courses/{course}/analytics`.
- **Controller**: add `analytics()` to `App\Courses\Controllers\CoursesController`
  (creator-management controller, consistent with `show`/`update`/`publish`).
  - Resolves `{course}` via route model binding.
  - Enforces ownership via `CoursePolicy` (same policy used by other creator
    endpoints — returns 403 for non-owners).
- **Service**: new `App\Courses\Services\CourseAnalyticsService` (thin, mirrors
  `EnrollmentService` / `ProgressService` style) containing the queries so the
  controller stays lean.
- **Resource**: return a plain array (or a small `CourseAnalyticsResource`) with
  the fields below. No new Eloquent model needed.

### Data model (existing)

- `courses` — `digital_product_id`, `require_sequential_completion`,
  `instructor_user_id`, `published_at`.
- `course_enrollments` — `course_id`, `user_id`, `storefront_order_id`,
  `status` (`active`|`revoked`), `enrolled_at`, `completed_at`.
- `course_lesson_progress` — `user_id`, `course_id`, `lesson_id`,
  `completed_at`.
- `storefront_orders` — present via `enrollment.storefront_order_id` but not
directly surfaced (not a revenue view).

### Metrics (formulas) — matches the reference

Revoked `course_enrollments` are excluded from every count.

**Overall cards**

- `activeLearners` — count of `course_enrollments` where `status = 'active'`.
- `totalLessons` / `totalChapters` — counts of lessons / chapters for the
  course (used as card subtitles, e.g. "4 lessons").
- `lessonCompletions` — count of completed `course_lesson_progress` rows for
  the course.
- `avgLessonCompletion` — `lessonCompletions / max(activeLearners * totalLessons, 1) * 100`.
- `avgChapterCompletion` — a chapter is complete for a learner when **all**
  its lessons have `course_lesson_progress` entries. Then
  `chapterCompletions / max(activeLearners * totalChapters, 1) * 100`.

**Per chapter**

- `completedLearners` — learners who have completed every lesson in that
  chapter.
- `completionRate` — `completedLearners / max(activeLearners, 1) * 100`.

**Per lesson**

- `completedLearners` — count of `course_lesson_progress` rows for that
  `lesson_id` (completed).
- `completionRate` — `completedLearners / max(activeLearners, 1) * 100`.
- `dropOffRate` — for the first lesson in course order:
  `(activeLearners - completedLearners) / max(activeLearners, 1) * 100`;
  for later lessons:
  `(completedPrevLesson - completedCurrentLesson) / max(completedPrevLesson, 1) * 100`
  (0 when the denominator is 0). This mirrors a funnel-style drop between
  consecutive lessons. If a simpler definition is preferred, the fallback is
  `100 - completionRate`; adjust the service's one-liner.

**Example zero-state** (as in the reference): active 0 ⇒ every rate 0.0% and
every count 0, matching the pasted HTML.

### Frontend

- **Route** (SPA): `/dashboard/my-products/:productId/course/analytics` added in
  `app-router.tsx`; mirror the course builder's bootstrap (fetch product →
  `product.course.id` → fetch analytics). Add a hard-refresh entry in
  `routes/web.php` if required (same pattern as the builder).
- **Page**: `course-analytics-page.tsx` using `DashboardLayout`, with:
  - A header titled "Course Analytics" (reusing builder header styling).
  - A 4-up `StatCard` grid matching the reference exactly:
    "Active learners", "Avg. lesson completion" (+ "\u00d7 lessons" subtitle),
    "Lesson completions", "Avg. chapter completion" (+ "\u00d7 chapters").
  - A "Detailed performance" `Accordion` (one item per chapter) whose trigger
    shows `Chapter \u00b7 Lessons: N` plus "Completed learners: \u00d7" and
    "Completion rate: \u00d7%" on the right. Its content is a `Table` per
    chapter with columns Lesson | Completed learners | Completion rate
    (with a small `Progress` bar) | Drop-off rate (with `Progress`) | Edit.
    The Edit button navigates to the builder's lesson editor. Uses `Empty`
    when no chapters/enrollments and `Skeleton` while loading.
- **Entry point**: on the seller's digital-product card
  (`resources/client/dashboard/digital-products/...`), when `type === 'course'`,
  add an **Analytics** `Button`/`Link` navigating to the analytics page.
  Additionally, add an "Analytics" link in the course builder header for
  convenience.
- **API call**: `apiClient.get('/api/v1/courses/' + courseId + '/analytics')`,
  typed via a local interface; consistent loading/error handling.

### Error handling

- Backend: 403 (non-owner via policy), 404 (missing course), standard auth
  errors from the group middleware.
- Frontend: `Alert` on load error (same pattern as the builder), `Skeleton`
  while loading, `Empty` for zero enrollments.

## Testing

- **Backend** `tests/Feature/CourseAnalyticsTest.php`:
  - Owner can fetch metrics; other creator gets 403; missing course 404.
  - Revoked enrollments excluded from every count.
  - Zero-state (no enrollments) returns 0 for every metric, matching reference.
  - Lesson/chapter aggregates and per-lesson drop-off computed correctly
    (seeded progress fixtures).
- **Frontend** `course-analytics-page.test.tsx`:
  - Source-contract style (like `course-builder-page.test.tsx`): asserts the
  analytics endpoint path is requested and key labels ("Active learners",
  "Detailed performance", "Completion rate") render.
  - The table + accordion + progress subcomponents are exercised via the page
  test; `StatCard` already has its own unit test.

## Notes on primitives

The reference uses `Card`/`Accordion`/`Table`/`Progress`/`Button`. `Card`,
`Button`, `Skeleton`, `Empty`, `Alert` already exist at `@shadcn/*`. Missing
ones (`accordion`, `table`, `progress`) are added via the shadcn registry in
`base-luma` style (new — no override of the existing tables/dragables the user
asked to preserve, which are app-specific).

## Files touched (summary)

- `app/Providers/AppServiceProvider.php` (route)
- `app/Courses/Controllers/CoursesController.php` (analytics action)
- `app/Courses/Services/CourseAnalyticsService.php` (new)
- `app/Courses/Policies/CoursePolicy.php` (reuse; verify owner check)
- `app/Courses/Resources/CourseAnalyticsResource.php` (new, optional)
- `resources/client/dashboard/courses/course-analytics-page.tsx` (new)
- `resources/client/dashboard/courses/course-analytics-page.test.tsx` (new)
- `resources/client/app-router.tsx` (route)
- `routes/web.php` (hard-refresh entry, if needed)
- `resources/client/dashboard/digital-products/<product-card>.tsx` (Analytics link)
- `resources/client/dashboard/courses/course-builder-page.tsx` (header Analytics link)
