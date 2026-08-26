# Course System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship course as native `digital_products.type=course` selling via existing checkout into `my-orders` portal.

**Architecture:** Additive enum + 6 tables, reuse pricing/storefront/checkout/entitlements/storage.

**Tech Stack:** Laravel 12, React 19, Tiptap 3.2, Tailwind v4, shadcn base-luma, HLS/dash, get-video-id.

**Spec:** `docs/superpowers/specs/2026-08-27-course-design.md`

## Global Constraints
- No second commerce stack; enroll via `StorefrontWebhookHandler::fulfill`.
- Private `FileEntry + UploadType` only; signed URLs; allowlist youtube/vimeo.
- Sequential lock server-side; draft filter server-side.
- Entitlements central via `Entitlements` — no hard-coded plan names.

---
### Task 1: Migrations + config
**Files:** Create `database/migrations/2026_08_27_000002_create_courses_tables.php`, Modify `config/store.php`, `config/filesystems.php`, `app/Entitlements/Entitlements.php`
- [ ] Write migration adding `digital_products.type` + 6 tables + `buyer_user_id` + indexes/FKs.
- [ ] Extend `Entitlements::normalize()` and defaults.
- [ ] Run `php artisan migrate --pretend` + `php artisan migrate`.

### Task 2: Models
**Files:** Create `app/Courses/Models/*.php` (Course, Chapter, Lesson, LessonResource, Enrollment, LessonProgress), Modify `app/Storefront/Models/DigitalProduct.php`
- [ ] Define fillable/casts/relations, `isCourse()`, scopes.
- [ ] Test `DigitalProduct->course` creation.

### Task 3: Services + policy
**Files:** Create `app/Courses/Services/*.php`, `app/Courses/CourseAccess.php`, `app/Courses/Policies/CoursePolicy.php`
- [ ] Implement enrollment idempotency, progress percent, sequential gate, video normalizer.
- [ ] Gate hierarchy validation.

### Task 4: API controllers + routes
**Files:** Create `app/Courses/Controllers/*.php`, Requests, Modify `common/foundation/routes/api.php` or `routes/api.php`
- [ ] CRUD chapters/lessons/resources, reorder endpoints transactional, settings publish.
- [ ] Assert owner + hierarchy.

### Task 5: Checkout integration
**Files:** Modify `app/Storefront/StorefrontWebhookHandler.php`, `app/Storefront/StorefrontCheckout.php`, `app/Storefront/DigitalProductRefundService.php`
- [ ] Hook grant on fulfill; free zero-price immediate fulfillment.
- [ ] Revoke on refund.

### Task 6: Creator UI
**Files:** Modify `resources/client/dashboard/digital-products/product-type-picker.tsx`, `digital-product-form-page.tsx`, Create `resources/client/dashboard/courses/course-builder/*`
- [ ] Picker adds course, builder layout curriculum+editor, drag, Tiptap, settings dialog.

### Task 7: Storefront + student
**Files:** Modify `resources/client/digital-products/public/digital-product-public-pages.tsx`, Create `resources/client/courses/learn/*`, Modify `resources/client/app-router.tsx`, `OrderLookupController`
- [ ] Curriculum public, my-orders courses tab, course home + lesson player.

### Task 8: Tests + regression
**Files:** Create `tests/Feature/Course*.php`, `resources/client/**/*.test.tsx`
- [ ] Run `php artisan test`, `npm run test`, `npm run build`.
