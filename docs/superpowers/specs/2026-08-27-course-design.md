# Course System Design — Linket (Approach A)

> Approved: 2026-08-27. Immediate-live + post-moderation with hybrid setting.

**Goal:** Add Course as native `digital_products.type=course` extending existing commerce.

**Non-goals (v1):** quizzes, certificates, assignments, live classroom, drip, bundles, Q&A forum (extensible hooks remain).

## Architecture
- `digital_products` owns pricing/cover/status/storefront. New enum `type='course'` default `digital` — additive, no backfill break. `config('store.courses_require_approval')` default `false` → post-moderation; flip to `true` for pre-moderation without code change.
- 1:1 `courses` + normalized `course_chapters → course_lessons → course_lesson_resources`, `course_enrollments`, `course_lesson_progress`.
- Checkout reuse: `StorefrontCheckout → storefront_orders → payment_transactions → StorefrontWebhookHandler::fulfill` adds `EnrollmentService::grant`.
- Storage reuse: `FileEntry + UploadType(courseVideos private, courseResources private)` + `max_course_storage` entitlement.
- Access: `CourseAccess::canAccessLesson(user, lesson, context)` central; sequential lock server-side; signed URLs for media.

## Data Model
```
digital_products.type enum('digital','ebook','audio','course') default 'digital' indexed
courses(id, digital_product_id UNIQUE FK cascade, require_sequential_completion bool default false, instructor_user_id nullable FK users, published_at nullable, timestamps)
course_chapters(id, course_id FK cascade, title varchar 160, sort_order int, timestamps, index(course_id,sort_order))
course_lessons(id, chapter_id FK cascade, course_id FK cascade, title varchar 160, content longtext nullable, video_type enum(upload,external,null), video_file_entry_id nullable FK, video_url varchar 1024 nullable, duration_seconds int nullable, status enum(draft,published) index, sort_order int, timestamps, index(course_id,chapter_id,sort_order))
course_lesson_resources(id, lesson_id FK cascade, file_entry_id FK restrict, display_name varchar 255, size bigint, mime varchar 100, sort_order int, timestamps)
course_enrollments(id, course_id FK cascade, user_id FK cascade, storefront_order_id nullable FK, status enum(active,revoked) default active, enrolled_at timestamp, completed_at nullable, timestamps, unique(user_id,course_id))
course_lesson_progress(id, user_id FK cascade, course_id FK cascade, lesson_id FK cascade, completed_at timestamp, timestamps, unique(user_id,lesson_id))
```
- `storefront_orders.buyer_user_id nullable FK users` for logged-in enrollment vs guest `buyer_email` recovery.

## Services
- `CourseService::createForProduct, publish(course) → touch published_at + digital_product status approved (if setting false)`, `unpublish`, `reorderChapters(course, orderedIds)`, `reorderLessons(chapter, orderedIds)`, `duplicateLesson`.
- `EnrollmentService::grant(order|user+course)` idempotent `firstOrCreate` under `lockForUpdate` + `DB::transaction`.
- `ProgressService::complete(user, lesson)` idempotent; `progressPercent(course,user)` = `completed_published / total_published *100`.
- `SequenceGate::canAccess(user,course,lesson)` → check prior published lessons completed when `require_sequential=true`.
- `VideoUrlNormalizer` allowlist youtube/vimeo via `get-video-id`.

## Entitlements
- `Entitlements::normalize()` adds `max_courses, course_creation_enabled default true, max_course_storage_bytes, course_video_upload_enabled`. `DigitalProductsController::enforceProductLimit` splits by `type`.

## Security
- Ownership: `workspace_id + user_id` on every mutation; hierarchy `chapter.course_id == course.id && lesson.chapter_id == chapter.id`.
- Student: `enrollment exists && status active` or guest `OrderRecoveryService` session; draft lessons filtered `status=published && course.published_at not null`.
- Storage: private disks, `hasValidSignature()`, `revoked_at`, mime allowlist, HTML sanitized.

## Frontend
- Builder: `DashboardLayout` 30/70, shadcn accordion/dropdown/dialog/switch/badge/progress, `use-sortable` drag, Tiptap editor (H1-3, bold/italic/underline/strike/link/list/blockquote/code), video dropzone + URL, resources list, settings dialog, preview uses real student UI with `preview=true`.
- Storefront: card badge `Course • N lessons`; public page curriculum accordion; checkout same endpoint.
- Student: `course-home` (hero, progress, curriculum, details), `lesson-player` (sidebar/drawer, video HLS/embed, content, resources, Prev/Complete/Next), `my-orders` / `find-my-purchase` merged courses tab, `Continue course` resolves first incomplete.

## Verification
- Pest feature: creation/ownership/chapters/lessons/sequential/progress/enrollment idempotency/regression.
- Vitest: builder reorder.
- Manual: create 3 chapters, reorder, upload video, external URL, Tiptap, attach resource, publish, purchase as buyer, sequential lock bypass, mobile.
