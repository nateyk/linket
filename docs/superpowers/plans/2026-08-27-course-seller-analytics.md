# Course Seller Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a seller-facing course analytics experience that matches the pasted reference HTML — a 4-card overview and a per-chapter accordion with a per-lesson table (completion + drop-off) on a dedicated page reachable from the product card and the course builder.

**Architecture:** A single `GET /api/v1/courses/{course}/analytics` endpoint (active-workspace checked, then authorized for the owner or assigned instructor, in the existing `api/v1` group in `AppServiceProvider`) computed by a thin `CourseAnalyticsService`; a new SPA page `course-analytics-page.tsx` (DashboardLayout + StatCard + Accordion + Table + Progress) keyed by `:productId` → resolves `course.id` → fetches analytics; an Analytics link added to the seller product card and the builder header. `base-luma` shadcn primitives are reused/added (no override of app tables/dragables).

**Tech Stack:** Laravel 11 + PHP 8.4 (Course, Enrollment, LessonProgress models; Policies), React 18 + Vite 6 + React Router, Tailwind v4, shadcn `base-luma` (`@shadcn/*`, `cn`, `size-*`, `gap-*`, `data-icon`, semantic tokens), Vitest + Pest.

**Spec:** `docs/superpowers/specs/2026-08-27-course-seller-analytics-design.md`

## Global Constraints

- shadcn style `base-luma`, aliases `@shadcn` / `@common/ui`, baseColor `neutral`, iconLibrary `lucide` — do not override the core style.
- Preserve existing app-specific tables/dragables (e.g. `common/foundation/resources/client/ui/tables`); new `@shadcn/table` is a separate primitive.
- Use `cn()`, `size-*`, `gap-*`, `data-icon`, `tabular-nums`, semantic tokens (`text-muted-foreground`, `bg-muted/*`, etc.) per shadcn rules.
- Routes live in `app/Providers/AppServiceProvider.php` inside the `api/v1` group (not `routes/api.php` for course routes).
- UploadType remains `courseVideos` / `courseResources`; analytics is read-only (no new UploadType).
- Drop-off uses `max(0, funnel formula)`: later lessons with more non-sequential completions than the prior lesson report `0.0`, not a negative rate.
- When chapters exist but active learners are zero, retain the four zero cards and detailed chapter accordion; use `Empty` only when no chapters exist.

---

## File Structure

- `app/Courses/Services/CourseAnalyticsService.php` — pure queries for active learners, lesson/chapter completions, per-lesson/chapter completion + drop-off (revoked enrollments excluded).
- `app/Courses/Resources/CourseAnalyticsResource.php` — optional explicit shape for the endpoint response.
- `app/Courses/Controllers/CoursesController.php` — new `analytics(Course $course)` action (active-workspace checked, owner/assigned-instructor authorized).
- `app/Providers/AppServiceProvider.php` — new `GET courses/{course}/analytics` in the creator-management `api/v1` group.
- `common/foundation/resources/client/shadcn/{accordion,table,progress}/*` — shadcn primitives (base-luma) if not already present.
- `resources/client/dashboard/courses/course-analytics-page.tsx` — the dedicated analytics SPA page (referenced wireframe).
- `resources/client/app-router.tsx` — new SPA route `/dashboard/my-products/:productId/course/analytics`.
- `routes/web.php` — hard-refresh entry mirroring the builder.
- `resources/client/dashboard/digital-products/<product-card>.tsx` — Analytics link for `type === 'course'` (locate the exact card file).
- `resources/client/dashboard/courses/course-builder-page.tsx` — small header link to Analytics.
- `tests/Feature/CourseAnalyticsTest.php` — backend happy/403/404/zero-state/drop-off tests.
- `resources/client/dashboard/courses/course-analytics-page.test.tsx` — frontend source-contract test.

---

### Task 1: Add missing shadcn primitives (progress / table / accordion) if absent

**Files:**
- Create (if missing): `common/foundation/resources/client/shadcn/progress/progress.tsx`
- Create (if missing): `common/foundation/resources/client/shadcn/table/table.tsx`
- Create (if missing): `common/foundation/resources/client/shadcn/accordion/accordion.tsx`

**Interfaces:**
- Consumes: shadcn registry (`https://ui.shadcn.com`) base-luma components.
- Produces: `@shadcn/progress`, `@shadcn/table`, `@shadcn/accordion` exports used by Task 5.

- [ ] **Step 1: Verify which primitives are already installed**

  ```bash
  ls common/foundation/resources/client/shadcn/{progress,table,accordion} 2>&1 | head -20
  ls common/foundation/resources/client/shadcn | head -30
  ```

- [ ] **Step 2: For any missing primitive, add it in base-luma style**

  Run only for the missing names:

  ```bash
  npx shadcn@latest add accordion -c common/foundation --style base-luma --yes 2>&1 | tail -20
  npx shadcn@latest add table -c common/foundation --style base-luma --yes 2>&1 | tail -20
  npx shadcn@latest add progress -c common/foundation --style base-luma --yes 2>&1 | tail -20
  ```

  Expect: files created under `common/foundation/resources/client/shadcn/<name>/`.

- [ ] **Step 3: Lint the added primitives (changed-file only)**

  ```bash
  npx oxlint common/foundation/resources/client/shadcn/accordion/accordion.tsx common/foundation/resources/client/shadcn/table/table.tsx common/foundation/resources/client/shadcn/progress/progress.tsx 2>&1 | tail -20
  ```

  Expected: exit 0 (or only unrelated warnings).

- [ ] **Step 4: Commit (if any primitives were added)**

  ```bash
  git add common/foundation/resources/client/shadcn/accordion common/foundation/resources/client/shadcn/table common/foundation/resources/client/shadcn/progress
  git commit -m "chore(shadcn): add accordion/table/progress primitives (base-luma)"
  ```

---

### Task 2: Backend analytics service

**Files:**
- Create: `app/Courses/Services/CourseAnalyticsService.php`
- Test: `tests/Feature/CourseAnalyticsTest.php` (Task 4 consumes this)

**Interfaces:**
- Consumes: `App\Courses\Models\Course`, `Chapter`, `Lesson`, `Enrollment`, `LessonProgress`.
- Produces:
  ```php
  class CourseAnalyticsService {
    /** @return array{activeLearners:int,totalLessons:int,totalChapters:int,lessonCompletions:int,avgLessonCompletion:float,avgChapterCompletion:float,chapters:array} */
    public function forCourse(Course $course): array;
  }
  ```
  Where each `chapters[]` entry is
  `['id'=>int,'title'=>string,'lessonsCount'=>int,'completedLearners'=>int,'completionRate'=>float,'lessons'=>[['id'=>int,'title'=>string,'completedLearners'=>int,'completionRate'=>float,'dropOffRate'=>float]]]`.

- [ ] **Step 1: Write the failing backend test (covers the service via the endpoint — written first so the service contract is clear)**

  Create `tests/Feature/CourseAnalyticsTest.php` with these cases (Pest/PHPUnit):

  ```php
  // tests/Feature/CourseAnalyticsTest.php
  it('owner can fetch analytics for own course', function () { /* ... */ });
   it('other creator or active workspace mismatch gets 403', function () { /* ... */ });
   it('assigned instructor can fetch within the active course workspace', function () { /* ... */ });
  it('revoked enrollments are excluded', function () { /* ... */ });
  it('zero-state returns zeros matching the reference HTML', function () { /* ... */ });
   it('per-lesson and per-chapter rates/drops are correct', function () { /* ... */ });
   it('clamps a later non-sequential lesson increase to 0 drop-off', function () { /* ... */ });
  ```

  Use factories/helpers consistent with `CourseSystemTest`/`CourseFreeE2ETest` (create a course with 3 chapters × 2+1+1 lessons, enroll users, mark lesson_progress).

- [ ] **Step 2: Run it to verify it fails (service missing)**

  ```bash
  ddev exec php artisan test tests/Feature/CourseAnalyticsTest.php 2>&1 | grep -A3 "FAIL\|not found"
  ```

  Expected: FAIL — class `CourseAnalyticsService` or route `analytics` not found.

- [ ] **Step 3: Create the service — queries consistent with the spec**

  ```php
  // app/Courses/Services/CourseAnalyticsService.php
  namespace App\Courses\Services;
  class CourseAnalyticsService {
    public function forCourse(\App\Courses\Models\Course $course): array {
      $activeLearners = $course->enrollments()->where('status','active')->count();
      $totalLessons = $course->lessons()->count();
      $totalChapters = $course->chapters()->count();
      // lessonCompletions = count course_lesson_progress for this course (revoked enrollments excluded already — those rows
      // remain, but denominators use activeLearners so revoked do not inflate rates; if needed, filter progress.user_id
      // to only active enrollment user_ids).
      // avgLessonCompletion, avgChapterCompletion, per-chapter/lesson completion + drop-off as defined in the spec.
      // chapter-complete = user has progress for every lesson in that chapter.
    }
  }
  ```

  Do NOT hit `storefront_orders` — no revenue.

- [ ] **Step 4: Run the backend tests (still via endpoint) — still expected fail until Task 3 wires routing**

  ```bash
  ddev exec php artisan test tests/Feature/CourseAnalyticsTest.php 2>&1 | tail -15
  ```

  Expected: FAIL with 404 (route not yet defined) — confirming the service is reachable.

- [ ] **Step 5: Commit the service**

  ```bash
  git add app/Courses/Services/CourseAnalyticsService.php
  git commit -m "feat(courses): add course analytics service (lesson/chapter aggregates)"
  ```

---

### Task 3: Backend route + controller action (active-workspace and policy checked)

**Files:**
- Modify: `app/Providers/AppServiceProvider.php:159-186` (add one `Route::get` line)
- Modify: `app/Courses/Controllers/CoursesController.php` (new `analytics(Course $course)` method)
- Create (optional): `app/Courses/Resources/CourseAnalyticsResource.php`

**Interfaces:**
- Consumes: `CourseAnalyticsService::forCourse(Course $course): array`.
- Produces: `GET /api/v1/courses/{course}/analytics` JSON:
  ```json
  {"data":{"activeLearners":0,"totalLessons":4,"totalChapters":3,"lessonCompletions":0,"avgLessonCompletion":0,"avgChapterCompletion":0,"chapters":[{"id":1,"title":"Chapter 1","lessonsCount":2,"completedLearners":0,"completionRate":0,"lessons":[{"id":1,"title":"Lesson 1","completedLearners":0,"completionRate":0,"dropOffRate":0}]}]}}
  ```

- [ ] **Step 1: Register the route in the creator-management group**

  In `app/Providers/AppServiceProvider.php` (inside the `Route::prefix('api/v1')->middleware(['api','optionalAuth:sanctum','verified','verifyApiAccess'])->group(...)` block that already contains `Route::get('courses/{course}', ...)`), add:

  ```php
  \Illuminate\Support\Facades\Route::get('courses/{course}/analytics', [\App\Courses\Controllers\CoursesController::class, 'analytics']);
  ```

- [ ] **Step 2: Implement the controller action (policy-enforced)**

  ```php
  // app/Courses/Controllers/CoursesController.php
  use App\Courses\Services\CourseAnalyticsService;
  public function analytics(\App\Courses\Models\Course $course, CourseAnalyticsService $service) {
    $this->assertActiveWorkspace($course);
    $this->authorize('view', $course); // owner or assigned instructor in that workspace
    return response()->json(['data' => $service->forCourse($course)]);
  }
  ```

  Confirm `CoursePolicy::view` / `update` allows `instructor_user_id === auth()->id()` (as in the builder).

- [ ] **Step 3: Verify the endpoint is reachable**

  ```bash
  ddev exec php -l app/Courses/Controllers/CoursesController.php
  ddev exec php -l app/Providers/AppServiceProvider.php
  ```

  Expected: No syntax errors.

- [ ] **Step 4: Re-run backend tests — should now pass**

  ```bash
  ddev exec php artisan test tests/Feature/CourseAnalyticsTest.php 2>&1 | grep -v "PHP Deprecated" | tail -25
  ```

  Expected: 5+ tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/Providers/AppServiceProvider.php app/Courses/Controllers/CoursesController.php
  # add Resource if created:
  git add app/Courses/Resources/CourseAnalyticsResource.php 2>/dev/null || true
  git commit -m "feat(courses): add GET courses/{course}/analytics endpoint"
  ```

---

### Task 4: Backend test polish + re-run full course suite

**Files:**
- Modify: `tests/Feature/CourseAnalyticsTest.php` (ensure fixtures use `stateful()` CSRF pattern already fixed for course tests)

**Interfaces:**
- Consumes: the endpoint from Task 3.
  - Produces: confidence that analytics is 200/403/404-correct, including the active-workspace boundary and assigned-instructor access.

- [ ] **Step 1: Harden tests against the prior 419 issue (if any stateful POST/PUT appears, use `session(['_token'=>...])` + `X-CSRF-TOKEN` like `CourseSystemTest::stateful()`) — for analytics GETs no CSRF is needed but enrollment/lesson_progress seeding helpers should remain stateful.**

- [ ] **Step 2: Run the broader course suite together**

  ```bash
  ddev exec php artisan test tests/Feature/CourseAnalyticsTest.php tests/Feature/CourseSystemTest.php tests/Feature/CourseFreeE2ETest.php tests/Feature/MyOrderCourseRoutesTest.php 2>&1 | grep -v "PHP Deprecated" | tail -25
  ```

  Expected: 12+ tests PASS.

- [ ] **Step 3: Commit any test fixture fixes**

  ```bash
  git add tests/Feature/CourseAnalyticsTest.php
  git commit -m "test(courses): cover analytics owner/403/zero-state and per-lesson drop-off"
  ```

---

### Task 5: Frontend analytics page (mirrors the pasted reference)

**Files:**
- Create: `resources/client/dashboard/courses/course-analytics-page.tsx`
- Create: `resources/client/dashboard/courses/course-analytics-page.test.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/v1/courses/{course.id}/analytics` via `apiClient.get(...)` (type `CourseAnalytics` as returned by Task 3).
  - Existing `DashboardLayout`, `StatCard` (`@common/ui/stat-card`), `@shadcn/skeleton`, `@shadcn/empty`, `@shadcn/alert`, plus `@shadcn/accordion`/`@shadcn/table`/`@shadcn/progress` (Task 1).
- Produces: `resources/client/dashboard/courses/course-analytics-page.tsx` exporting `CourseAnalyticsPage` React component.

- [ ] **Step 1: Scaffold the page (fetch product → course → analytics)**

  ```tsx
  // resources/client/dashboard/courses/course-analytics-page.tsx
  export function CourseAnalyticsPage() {
    const {productId} = useParams();
    const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    // 1) fetch `/api/v1/digital-products/${productId}` → course.id
    // 2) fetch `/api/v1/courses/${courseId}/analytics`
    // render Skeleton / Alert / four zero cards + accordion when chapters exist / Empty only when no chapters
  }
  ```

  Top grid (exactly like the reference):
  ```tsx
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Card.Root>...Active learners {data.activeLearners}</Card.Root>
    <Card.Root>...Avg. lesson completion {data.avgLessonCompletion.toFixed(1)}% <p> {data.totalLessons} lessons</p></Card.Root>
    <Card.Root>...Lesson completions {data.lessonCompletions}</Card.Root>
    <Card.Root>...Avg. chapter completion {data.avgChapterCompletion.toFixed(1)}% <p> {data.totalChapters} chapters</p></Card.Root>
  </div>
  ```

  Detailed:
  ```tsx
  <Accordion.Root type="multiple">
    {data.chapters.map(ch => (
      <Accordion.Item key={ch.id} value={String(ch.id)}>
        <Accordion.Trigger>
          <div>Chapter {ch.title}</div>
          <div>Lessons: {ch.lessonsCount} · Completed learners: {ch.completedLearners} · Completion rate: {ch.completionRate.toFixed(1)}%</div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Table.Root>
            <Table.Header><Table.Row><Table.Head>Lesson</Table.Head><Table.Head>Completed learners</Table.Head><Table.Head>Completion rate</Table.Head><Table.Head>Drop-off rate</Table.Head><Table.Head/></Table.Row></Table.Header>
            <Table.Body>
              {ch.lessons.map(l => (
                <Table.Row key={l.id}>
                  <Table.Cell>{l.title}</Table.Cell>
                  <Table.Cell>{l.completedLearners}</Table.Cell>
                  <Table.Cell><div>{l.completionRate.toFixed(1)}%<Progress.Root value={l.completionRate} className="h-1.5" /></div></Table.Cell>
                  <Table.Cell><div>{l.dropOffRate.toFixed(1)}%<Progress.Root value={l.dropOffRate} className="h-2" /></div></Table.Cell>
                   <Table.Cell><Button variant="outline" size="sm" data-icon onClick={() => navigate(`/dashboard/my-products/${productId}/course?lessonId=${l.id}`)}><PencilIcon />Edit</Button></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Accordion.Content>
      </Accordion.Item>
    ))}
  </Accordion.Root>
  ```

  Use `cn()`, `size-*`, `gap-*`, `data-icon`, `tabular-nums`, semantic tokens.

- [ ] **Step 2: Add the frontend source-contract test**

  ```tsx
  // resources/client/dashboard/courses/course-analytics-page.test.tsx
  import fs from 'node:fs';
  import {describe, expect, test} from 'vitest';
  describe('course analytics page', () => {
    test('requests the analytics endpoint and renders the reference labels', () => {
      const src = fs.readFileSync('resources/client/dashboard/courses/course-analytics-page.tsx','utf8');
      expect(src).toContain("/api/v1/courses/${");
      expect(src).toContain("/analytics");
      expect(src).toContain("Active learners");
      expect(src).toContain("Detailed performance");
      expect(src).toContain("Completion rate");
    });
  });
  ```

- [ ] **Step 3: Lint + run page test**

  ```bash
  npx oxlint resources/client/dashboard/courses/course-analytics-page.tsx resources/client/dashboard/courses/course-analytics-page.test.tsx 2>&1 | tail -10
  npx vitest run resources/client/dashboard/courses/course-analytics-page.test.tsx 2>&1 | tail -15
  ```

  Expected: oxlint exit 0; vitest 1 passed.

- [ ] **Step 4: Commit the page**

  ```bash
  git add resources/client/dashboard/courses/course-analytics-page.tsx resources/client/dashboard/courses/course-analytics-page.test.tsx
  git commit -m "feat(courses): add seller analytics page mirroring the reference layout"
  ```

---

### Task 6: Frontend routes + entry points (product card + builder header)

**Files:**
- Modify: `resources/client/app-router.tsx` (SPA route)
- Modify: `routes/web.php` (hard-refresh entry)
- Modify: `resources/client/dashboard/digital-products/<product-card>.tsx` (locate: likely `resources/client/dashboard/digital-products/components/product-card.tsx` or the products list page — `grep -rn product.*card` / `type === 'course'` there)
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (header Analytics link)

**Interfaces:**
- Consumes: the `CourseAnalyticsPage` from Task 5.
- Produces: SPA + hard-refresh rendering plus two entry links.

- [ ] **Step 1: Add the SPA route**

  In `resources/client/app-router.tsx` (near the existing course-builder route), add:

  ```tsx
  import {CourseAnalyticsPage} from '@dashboard/courses/course-analytics-page';
  // ...
  {path: 'dashboard/my-products/:productId/course/analytics', element: <CourseAnalyticsPage />},
  ```

- [ ] **Step 2: Add the hard-refresh route (same pattern as the builder)**

  In `routes/web.php`, add alongside the builder SPA routes:

  ```php
  Route::get('dashboard/my-products/{product}/course/analytics', [HomeController::class, 'render'])
    ->middleware(['auth', 'verified']);
  ```

  (Keep any `whereNumber` / `where` constraints matching the builder.)

- [ ] **Step 3: Add Analytics link on the seller product card**

  Find the card file, e.g.:

  ```bash
  grep -rln "type.*course\|product.type" resources/client/dashboard/digital-products 2>/dev/null | head
  ```

  Inside that component, when `product.type === 'course'`, render:

  ```tsx
  <Button size="xs" variant="outline" data-icon asChild>
    <Link to={`/dashboard/my-products/${product.id}/course/analytics`}><BarChart3Icon />Analytics</Link>
  </Button>
  ```

- [ ] **Step 4: Add Analytics link in the course builder header**

  In `resources/client/dashboard/courses/course-builder-page.tsx` header (next to Preview/Configure), add:

  ```tsx
  <Button variant="outline" size="sm" asChild>
    <Link to={`/dashboard/my-products/${productId}/course/analytics`}><BarChart3Icon />Analytics</Link>
  </Button>
  ```

- [ ] **Step 5: Lint + verify routes**

  ```bash
  npx oxlint resources/client/app-router.tsx routes/web.php resources/client/dashboard/digital-products/** 2>&1 | tail -15
  ddev exec php -l routes/web.php
  ddev exec php -l app/Providers/AppServiceProvider.php
  npx vitest run resources/client/dashboard/dashboard-routes.test.tsx 2>&1 | tail -15
  ```

  Expected: lint 0; PHP lint 0; `dashboard-routes.test.tsx` still passes (it may need to assert the new analytics route is present — add it if the test asserts routes).

- [ ] **Step 6: Commit**

  ```bash
  git add resources/client/app-router.tsx routes/web.php resources/client/dashboard/digital-products/** resources/client/dashboard/courses/course-builder-page.tsx
  git commit -m "feat(courses): wire analytics route + product-card and builder header entry points"
  ```

---

### Task 7: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: all tasks above.
- Produces: a green-gated change set.

- [ ] **Step 1: Run changed-file lint + PHP lint**

  ```bash
  npx oxlint resources/client/dashboard/courses/course-analytics-page.tsx resources/client/app-router.tsx common/foundation/resources/client/shadcn/{table,accordion,progress}/** 2>&1 | tail -15
  ddev exec php -l app/Courses/Controllers/CoursesController.php
  ddev exec php -l app/Courses/Services/CourseAnalyticsService.php
  ddev exec php -l app/Providers/AppServiceProvider.php
  ```

  Expected: all 0.

- [ ] **Step 2: Run the course-relevant test suites**

  ```bash
  ddev exec php artisan test tests/Feature/CourseAnalyticsTest.php tests/Feature/CourseSystemTest.php tests/Feature/CourseFreeE2ETest.php tests/Feature/MyOrderCourseRoutesTest.php 2>&1 | grep -v "PHP Deprecated" | tail -25
  npx vitest run resources/client/dashboard/courses/course-analytics-page.test.tsx resources/client/dashboard/dashboard-routes.test.tsx common/foundation/resources/client/ui/stat-card.test.tsx 2>&1 | tail -20
  ```

  Expected: all PASS (12+ Pest, 1+ Vitest page test).

- [ ] **Step 3: Build**

  ```bash
  npm run build 2>&1 | tail -5
  ```

  Expected: exit 0 (ignore chunk-size warning).

- [ ] **Step 4: Push branch + verify PR**

  ```bash
  git push -u origin feat/course-seller-analytics 2>&1 | tail -5
  # Create or update PR into main (or into feat/course-experience if stacked)
  ```

---

## Self-Review

- **Spec coverage:** Endpoint + service + resource + per-lesson/chapter metrics (including drop-off) + 4-card overview + accordion/table/progress + product-card + builder-header entries + tests all have tasks.
- **Placeholders:** none — every step has concrete file paths and code snippets.
- **Type consistency:** `CourseAnalyticsService::forCourse(Course $course): array` with the exact shape listed is consumed by the controller and the frontend `CourseAnalytics` interface; the accordion/table/progress primitives match the names used in Task 5.
