# My Portal Customer Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/my-portal` into a customer portal where an email OTP session unlocks courses and downloads for every paid purchase.

**Architecture:** Keep the existing OTP + cookie recovery session. Authorize guest course access by matching paid `storefront_orders.buyer_email` to the portal email (plus optional portal-keyed enrollment/progress). Rename all user-facing `my-order` routes/copy to `my-portal`. Unify the SPA hub as a purchase library with Continue / Download primary actions.

**Tech Stack:** Laravel 12, Pest, React 19, react-router, existing `OrderRecoveryService`, `EnrollmentService`, `CourseClaimService`, `@shadcn/*`.

## Global Constraints

- PHP 8.4 / Laravel 12; run Artisan via `ddev artisan`.
- Visible copy uses `<Trans message="..." />` with static strings.
- Semantic Tailwind tokens only; `@shadcn/*` then `@ui/*`.
- Product name in UI: **My Portal**; paths: `/my-portal` and `/api/v1/public/my-portal/*`.
- Portal session unlocks courses and downloads (spec option A).
- Local mail UI is Mailpit (`https://linket.ddev.site:8026`), not Mailtrap.
- Every change needs a focused Pest and/or Vitest; no unsolicited commits unless the user asks.
- Prefer Laravel helpers/facades over constructor DI in new controller code (project convention).

## File map

| Area | Files |
| --- | --- |
| Schema | new migration(s) on `course_enrollments`, `course_lesson_progress` |
| Portal auth/access | `app/Storefront/OrderRecoveryService.php`, new `app/Courses/Services/PortalCourseAccess.php` (or extend `CourseAccess`) |
| Enrollment/claim | `EnrollmentService.php`, `CourseClaimService.php` |
| Controllers/routes | `CustomerOrderPortalController.php`, course student controllers, `routes/api.php` / foundation api routes, `routes/web.php` |
| SPA | `order-lookup-page.tsx` → portal hub, `my-order-shell.tsx` → `my-portal-shell.tsx`, learn/lesson pages, app routes |
| Tests | `CustomerOrderPortalTest.php`, new `PortalCourseAccessTest.php`, Vitest hub |

---

### Task 1: Portal-keyed enrollment + progress schema

**Files:**
- Create: migration via `ddev artisan make:migration add_portal_identity_to_course_access_tables --no-interaction`
- Modify: `app/Courses/Models/Enrollment.php`, `app/Courses/Models/LessonProgress.php`
- Test: `tests/Feature/PortalCourseAccessTest.php` (create with `ddev artisan make:test --pest PortalCourseAccessTest --no-interaction`)

**Interfaces:**
- Produces: `course_enrollments.portal_email_hash` (nullable char 64), `user_id` nullable; unique `(course_id, portal_email_hash)` where hash not null; `course_lesson_progress.portal_email_hash` nullable, `user_id` nullable with matching uniqueness.

- [ ] **Step 1: Write failing Pest that creates a portal enrollment without user_id**

```php
it('stores a portal enrollment without a user', function () {
    // arrange course + paid order fixtures (copy from GuestCourseClaimTest)
    $hash = hash('sha256', 'buyer@example.test');
    $enrollment = \App\Courses\Models\Enrollment::create([
        'course_id' => $course->id,
        'user_id' => null,
        'portal_email_hash' => $hash,
        'storefront_order_id' => $order->id,
        'status' => 'active',
        'enrolled_at' => now(),
    ]);
    expect($enrollment->fresh()->portal_email_hash)->toBe($hash)
        ->and($enrollment->user_id)->toBeNull();
});
```

- [ ] **Step 2: Run test — expect fail on missing column**

Run: `ddev artisan test --compact --filter=stores.a.portal.enrollment`

- [ ] **Step 3: Migration + model fillable/casts**

```php
// migration up():
Schema::table('course_enrollments', function (Blueprint $table) {
    $table->unsignedInteger('user_id')->nullable()->change();
    $table->char('portal_email_hash', 64)->nullable()->after('user_id');
    $table->unique(['course_id', 'portal_email_hash']);
});
Schema::table('course_lesson_progress', function (Blueprint $table) {
    $table->unsignedInteger('user_id')->nullable()->change();
    $table->char('portal_email_hash', 64)->nullable()->after('user_id');
});
```

Drop or replace `course_enrollments_user_id_course_id_unique` so nullable `user_id` does not collide; keep unique `(user_id, course_id)` via a partial approach MySQL lacks — use application idempotency + unique `(course_id, portal_email_hash)` and keep `(user_id, course_id)` unique (MySQL allows multiple NULL user_id only if unique allows — in MySQL multiple NULLs are allowed in unique indexes).

- [ ] **Step 4: Migrate and re-run test — pass**

Run: `ddev artisan migrate --no-interaction` then the same filter.

---

### Task 2: Grant portal enrollment from paid order

**Files:**
- Modify: `app/Courses/Services/EnrollmentService.php`
- Modify: `app/Storefront/StorefrontWebhookHandler.php` (after fulfill, call portal grant when no user)
- Test: `tests/Feature/PortalCourseAccessTest.php`

**Interfaces:**
- Produces: `EnrollmentService::grantFromPortalOrder(StorefrontOrder $order): ?Enrollment` — requires paid course order + buyer_email; sets `portal_email_hash` from normalized email; idempotent.

- [ ] **Step 1: Failing test — fulfill/paid course guest creates portal enrollment**

```php
it('grants portal enrollment for paid guest course order', function () {
    // create paid course order with buyer_email, no buyer_user_id
    $enrollment = app(\App\Courses\Services\EnrollmentService::class)->grantFromPortalOrder($order);
    expect($enrollment)->not->toBeNull()
        ->and($enrollment->user_id)->toBeNull()
        ->and($enrollment->portal_email_hash)->toBe(hash('sha256', 'buyer@example.test'));
});
```

- [ ] **Step 2: Run — fail**

- [ ] **Step 3: Implement `grantFromPortalOrder` + call from `grantFromOrder` when user missing**

```php
public function grantFromOrder(StorefrontOrder $order): ?Enrollment
{
    // existing user path…
    if (!$userId) {
        return $this->grantFromPortalOrder($order);
    }
    // …
}

public function grantFromPortalOrder(StorefrontOrder $order): ?Enrollment
{
    $product = $order->product()->with('course')->first();
    if (!$product?->isCourse() || !$product->course || $order->status !== 'paid') {
        return null;
    }
    $email = strtolower(trim((string) $order->buyer_email));
    if ($email === '') {
        return null;
    }
    $hash = hash('sha256', $email);
    // firstOrCreate on course_id + portal_email_hash, status active
}
```

Also ensure `ChapaPaymentFulfillment` / webhook fulfill path still calls `grantFromOrder` (already does).

- [ ] **Step 4: Re-run tests — pass. Manually re-fulfill order 2 in local DB via tinker/script if needed for QA.**

---

### Task 3: Portal course access helper + library API

**Files:**
- Create: `app/Courses/Services/PortalCourseAccess.php` via `ddev artisan make:class Courses/Services/PortalCourseAccess --no-interaction`
- Modify: `CustomerOrderPortalController.php` — add `library()`, portal course endpoints or delegate
- Modify: API route registration (search `my-order` in `common/foundation/routes` / `routes`)
- Test: `PortalCourseAccessTest.php`, extend `CustomerOrderPortalTest.php`

**Interfaces:**
- Produces: `PortalCourseAccess::canAccessCourse(recovery, Course): bool`, `ensureEnrollment(recovery, Course): Enrollment`
- Produces: `GET /api/v1/public/my-portal/library` → `{ courses: [...], orders: [...] }`
- Alias old `my-order` routes to same actions for one cycle OR redirect; prefer register both URIs to same controller methods.

- [ ] **Step 1: Failing feature test for library returning course_id for guest portal**

```php
it('lists paid courses in my-portal library for portal session', function () {
    // verify-code cookie then:
    $this->getJson('/api/v1/public/my-portal/library')
        ->assertOk()
        ->assertJsonPath('courses.0.course_id', $course->id)
        ->assertJsonPath('orders.0.product_type', 'course');
});
```

- [ ] **Step 2: Run — fail (404)**

- [ ] **Step 3: Implement routes + `library()` assembling portal enrollments / paid course orders + download orders**

- [ ] **Step 4: Pass tests; keep `purchases` endpoint working as subset or proxy to library orders**

---

### Task 4: Guest lesson read + progress via portal

**Files:**
- Modify: student course/lesson controllers used by SPA (locate via `my-courses` routes)
- Modify: `ProgressService` to accept portal hash OR user id
- Modify: `CourseAccess` or use `PortalCourseAccess` in controllers
- Test: `PortalCourseAccessTest.php`

**Interfaces:**
- Produces: portal-authenticated `GET/POST` under `/api/v1/public/my-portal/courses/{course}/…` mirroring logged-in learn payloads enough for `course-learn-page` / `lesson-player-page`.

- [ ] **Step 1: Failing test — portal cookie can fetch course learn payload and complete a lesson**

- [ ] **Step 2: Implement minimal controller methods; reuse resources where possible**

- [ ] **Step 3: Progress writes set `portal_email_hash` when no user**

- [ ] **Step 4: Tests green**

---

### Task 5: Claim merges portal enrollment + progress onto user

**Files:**
- Modify: `CourseClaimService.php`
- Test: `tests/Feature/GuestCourseClaimTest.php` (extend)

**Interfaces:**
- On claim: set `user_id` on portal enrollment, null out `portal_email_hash` (or keep hash for audit — prefer move to user_id and clear hash to satisfy unique), reassign progress rows.

- [ ] **Step 1: Failing test — portal progress becomes user progress after verify**

- [ ] **Step 2: Implement merge in `claimForUser`**

- [ ] **Step 3: Pass `GuestCourseClaimTest` + new cases**

---

### Task 6: Rename SPA routes and hub UI to My Portal

**Files:**
- Modify: `routes/web.php` SPA fallbacks
- Modify: app router definitions referencing `my-order`
- Rename: `my-order-shell.tsx` → `my-portal-shell.tsx` (update imports)
- Modify: `order-lookup-page.tsx` — library-first hub, remove “Downloads unavailable” for courses, Continue opens portal course routes
- Modify: `course-learn-page.tsx`, `lesson-player-page.tsx`, `course-curriculum-list.tsx` links
- Test: existing Vitest hub tests; update paths/strings

**Interfaces:**
- Produces: user-facing `/my-portal`, `/my-portal/courses/:id`, `/my-portal/courses/:id/lessons/:lessonId`
- Soft redirect: `web.php` `my-order/{any?}` → `my-portal/$1` if easy; else duplicate render routes.

- [ ] **Step 1: Update web + client routes; copy “My Portal”**

- [ ] **Step 2: Hub loads `/api/v1/public/my-portal/library` (portal) or merges `/api/v1/my-courses` when logged in**

- [ ] **Step 3: Guest with portal session: course card shows Open/Continue, not downloads warning**

- [ ] **Step 4: `npm run test` filtered + `npm run build`**

---

### Task 7: Backfill local paid course order + verification

**Files:**
- None committed; local script OK under `storage/` if needed then delete

- [ ] **Step 1: For order uuid `261708ef-…`, run `grantFromPortalOrder` so Mailpit buyer can open course**

- [ ] **Step 2: Manual QA checklist**
  - Mailpit: https://linket.ddev.site:8026
  - Request code → verify → `/my-portal` shows course Continue
  - Open lesson, complete, refresh
  - File product still downloads
  - Register/verify same email → progress retained

- [ ] **Step 3: Run focused Pest suite**

```bash
ddev artisan test --compact --filter='PortalCourseAccess|CustomerOrderPortal|GuestCourseClaim'
```

---

## Execution note

Do not commit unless the user asks. After Task 6–7, ask whether to commit.
