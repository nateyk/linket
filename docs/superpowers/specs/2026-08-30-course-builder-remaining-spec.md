# Course Builder Remaining Work Spec

**Goal:** Fix preview divergence and enable cross-chapter lesson moves for the course builder, with unified cover handling.

**Context:** Audit of `main` at `88b9e2c` found builder children (chapters/lessons) sortable only intra-list, preview link broken, and cover previews diverge (`1200/514` vs `16/9`) between builder (`course-builder-page.tsx`), `digital-product-form-page.tsx`, `creator-profile-editor.tsx`, and storefront (`digital-product-public-pages.tsx` / `shop-widget-renderer.tsx`). `CourseService::moveLesson` exists but UI never calls it, and source gap not reindexed.

**Scope:** This spec covers (1) unified ProductCover preview and (2) cross-chapter lesson move with source-gap fix. Other audit items (price validation, confirm dialogs, collapsible persistence) are out of scope and tracked separately.

## Requirements

### 1. Unified Preview
- `CourseBuilder` header `Preview` must open `GET /api/v1/courses/{course}/preview?preview=1` or `GET /api/v1/courses/{course}/learn?preview=1` with `credentials: same-origin` and `ActiveWorkspace` check, not `window.open(`/ @${title}`)`.
- All previews (`ProductBuilderPreview` in `digital-product-form-page.tsx:612`, `CourseBuilder` cover, `public` and `shop-widget`) must use a shared `ProductCover` component that handles `normalizeMediaUrl`, `imageError` fallback, `aspect-video` / `object-cover`, and currency via `formatMoney`; cover aspect must be single source `16/9` everywhere (remove `1200/514`).
- `ProductBuilderPreview` must show `cover_url` via shared component, not `FileIcon + count` for courses.

### 2. Cross-Chapter Lesson Move
- Lessons must be draggable **between chapters** (not only intra-list). `SortableCurriculumItem` currently isolates `type` per chapter (`course-builder-lessons-${chapter.id}`); new UI must either share a single `course-lessons-${course.id}` type with `onMove` or add a `Dropdown → Move to chapter` action calling `POST /api/v1/course-lessons/{lesson}/move` (`LessonsController.php:143`).
- `CourseService::moveLesson` must reindex **both** source and target chapters after move (currently only target). `sort_order` must be `0..n-1` contiguous after any move/delete/reorder.
- UI must be optimistic with rollback + `toast.danger` on 422, and disable drag while `reordering`.
- Existing intra-list reorder (`POST /courses/{course}/chapters/reorder` and `POST /course-chapters/{chapter}/lessons/reorder`) must keep working.

## Constraints
- Laravel 12.67, PHP 8.4, React 19, TypeScript 5.9, Tailwind 4.3, shadcn base-luma, lucide, `@shadcn` aliases, `useSortable` handle-only.
- No new deps; reuse `apiClient`, `toast`, `cn`, `Button` variants, semantic tokens.

## Success Criteria
- Preview button opens authenticated preview and renders same cover component as storefront.
- Lesson can be moved to another chapter via drag or dropdown and persists after reload; no gaps in `sort_order` (verified via `GET /api/v1/courses/{course}`).
- Cover aspect `16/9` everywhere, no `1200/514` leftover.
- Tests green: `npm test` 42+ and new move/preview tests, `npx oxlint` 0, `npm run build` 0.
