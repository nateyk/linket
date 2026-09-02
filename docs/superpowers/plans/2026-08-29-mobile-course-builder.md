# Mobile Course Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the course builder mobile-first, touch-safe, and consistent while completing the deferred move, cover, and preview follow-ups.

**Architecture:** Keep the existing desktop split-pane and native handle-only sortable behavior at `lg` and above. Below `lg`, render one primary builder surface at a time and use explicit menu actions for ordering; native HTML drag-and-drop is not used as a required phone interaction. Extract only responsive overlay/content units that need to be shared by the settings dialog and move flow.

**Tech Stack:** Laravel 12.67, PHP 8.4, React 19, TypeScript 5.9, Tailwind CSS 4.3, Base UI, shadcn base-luma, Vitest, DDEV.

**Spec:** `docs/superpowers/specs/2026-08-29-mobile-course-builder-design.md`

## Global Constraints

- No new dependencies; use existing `Drawer`, `AlertDialog`, `Select`, `Dialog`, `Button`, `toast`, `cn`, and `ProductCover` primitives.
- Preserve handle-only native sortable behavior on desktop. Phone ordering must be available through explicit controls.
- Use `@shadcn` aliases and project semantic tokens; use `gap-*`, not `space-x-*` or `space-y-*`, in touched code.
- Use `Button` controls rather than raw interactive elements where an equivalent exists. Icon-only buttons need accessible labels.
- Keep the shared cropper on `react-easy-crop`; it already supplies touch pan and pinch zoom.
- All failed mutations restore prior local state where state was optimistic and call `toast.danger`.
- Test through Vitest, Oxlint, the frontend build, `git diff --check`, and affected Laravel feature tests through DDEV.

---

### Task 1: Establish Mobile Builder State And Responsive Header

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:121-715`
- Modify: `resources/client/dashboard/courses/course-builder-page.test.tsx`

**Interfaces:**
- Consumes: `Course`, `Lesson`, `selectedLesson`, `setSelectedLesson` from the existing builder.
- Produces: `mobileSurface: 'curriculum' | 'editor'`; `CourseBuilderHeader` and phone-only return-to-curriculum behavior used by later tasks.

- [ ] **Step 1: Write the failing source-contract tests**

```ts
test('keeps phone navigation focused on one builder surface', () => {
  expect(source).toContain("useState<'curriculum' | 'editor'>('curriculum')");
  expect(source).toContain("setMobileSurface('editor')");
  expect(source).toContain("setMobileSurface('curriculum')");
  expect(source).toContain('lg:hidden');
  expect(source).toContain('hidden lg:flex');
});

test('moves secondary header actions into an accessible phone menu', () => {
  expect(source).toContain('aria-label="Course actions"');
  expect(source).toContain('<Trans message="Preview" />');
  expect(source).toContain('<Trans message="Configure" />');
  expect(source).toContain('Analytics');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- resources/client/dashboard/courses/course-builder-page.test.tsx`

Expected: FAIL because `mobileSurface` and the phone action menu do not exist.

- [ ] **Step 3: Add the mobile surface state and responsive header**

```tsx
const [mobileSurface, setMobileSurface] = useState<'curriculum' | 'editor'>(
  'curriculum',
);

<div className="flex min-w-0 items-center gap-2">
  <div className="hidden items-center gap-2 lg:flex">{/* existing secondary actions */}</div>
  <Dropdown.Root>
    <Dropdown.Trigger render={<Button aria-label="Course actions" size="icon-sm" variant="outline" className="lg:hidden"><MoreHorizontalIcon /></Button>} />
    <Dropdown.Content align="end">
      <Dropdown.Item onClick={openPreview}><EyeIcon /><Trans message="Preview" /></Dropdown.Item>
      <Dropdown.Item onClick={() => setSettingsOpen(true)}><SettingsIcon /><Trans message="Configure" /></Dropdown.Item>
      <Dropdown.Item render={<Link to={`/dashboard/my-products/${productId}/course/analytics`} />}><BarChart3Icon />Analytics</Dropdown.Item>
    </Dropdown.Content>
  </Dropdown.Root>
  <Button size="sm" onClick={() => void publish()} disabled={publishing}>
    <Trans message={isPublished ? 'Update' : 'Publish'} />
  </Button>
</div>
```

- [ ] **Step 4: Make curriculum selection and editor return update the surface**

```tsx
onClick={() => {
  setSelectedLesson(lesson);
  setSelectedChapterId(chapter.id);
  setMobileSurface('editor');
}}

<Button variant="ghost" size="sm" className="self-start lg:hidden" onClick={() => setMobileSurface('curriculum')}>
  <Trans message="Back to curriculum" />
</Button>
```

- [ ] **Step 5: Change the primary layout to a single phone surface and desktop split pane**

```tsx
<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
  <div className={cn('flex min-h-0 w-full flex-col overflow-hidden border-b bg-card lg:w-[36%] lg:border-r lg:border-b-0', mobileSurface === 'editor' && 'hidden lg:flex')}>
    {/* curriculum */}
  </div>
  <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/10 p-4', mobileSurface === 'curriculum' && 'hidden lg:flex')}>
    {/* editor */}
  </div>
</div>
```

- [ ] **Step 6: Run the focused test to verify it passes**

Run: `npm test -- resources/client/dashboard/courses/course-builder-page.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the focused change**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
```

### Task 2: Add Touch-Safe Curriculum Controls

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:236-310, 453-675`
- Modify: `resources/client/dashboard/courses/course-builder-page.test.tsx`

**Interfaces:**
- Consumes: `moveItem<T>()`, `reorderChapters(oldIndex, newIndex)`, and `reorderLessons(chapterId, oldIndex, newIndex)`.
- Produces: `moveChapterByOffset(chapterId, offset)` and `moveLessonByOffset(chapterId, lessonId, offset)`, used only through explicit menus at phone sizes.

- [ ] **Step 1: Write the failing tests for boundary-safe explicit ordering**

```ts
test('provides explicit phone move actions while preserving desktop handles', () => {
  expect(source).toContain('moveChapterByOffset');
  expect(source).toContain('moveLessonByOffset');
  expect(source).toContain('<Trans message="Move up" />');
  expect(source).toContain('<Trans message="Move down" />');
  expect(source).toContain('hidden lg:block');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- resources/client/dashboard/courses/course-builder-page.test.tsx`

Expected: FAIL because the helper functions and menu copy do not exist.

- [ ] **Step 3: Add offset helpers that delegate to current optimistic reorder functions**

```tsx
const moveChapterByOffset = (chapterId: number, offset: number) => {
  if (!course) return;
  const oldIndex = course.chapters.findIndex(chapter => chapter.id === chapterId);
  const newIndex = oldIndex + offset;
  if (oldIndex < 0 || newIndex < 0 || newIndex >= course.chapters.length) return;
  void reorderChapters(oldIndex, newIndex);
};
```

Implement `moveLessonByOffset` equivalently against its owning chapter and call `reorderLessons` only when the destination index is in bounds.

- [ ] **Step 4: Replace extra-small phone targets and expose menu move actions**

```tsx
<div className="hidden lg:block">
  <button ref={dragHandleRef} type="button" aria-label="Reorder lesson" className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50" />
</div>
<Dropdown.Item disabled={lessonIndex === 0 || !!reordering} onClick={() => moveLessonByOffset(chapter.id, lesson.id, -1)}>
  <Trans message="Move up" />
</Dropdown.Item>
<Dropdown.Item disabled={lessonIndex === chapter.lessons.length - 1 || !!reordering} onClick={() => moveLessonByOffset(chapter.id, lesson.id, 1)}>
  <Trans message="Move down" />
</Dropdown.Item>
```

Apply the same pattern to chapter controls. Use `size="sm"` for phone-visible action buttons and `gap-*` containers in all touched curriculum markup.

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `npm test -- resources/client/dashboard/courses/course-builder-page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the focused change**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
```

### Task 3: Add Destination Selection And Optimistic Lesson Move Rollback

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx`
- Modify: `resources/client/dashboard/courses/course-move.test.tsx`

**Interfaces:**
- Consumes: `Course`, `Chapter`, `Lesson`, `apiClient.post('/api/v1/course-lessons/{lesson}/move')`.
- Produces: `MoveLessonDialog({course, lesson, sourceChapter, open, onOpenChange, onMoved})` and `moveLesson(course, lesson, sourceChapterId, targetChapterId)` local update logic.

- [ ] **Step 1: Write the failing move chooser and rollback tests**

```ts
test('requires a destination chapter instead of choosing the first alternative', () => {
  expect(source).toContain('MoveLessonDialog');
  expect(source).toContain('Select.Trigger');
  expect(source).toContain('targetChapterId === null');
  expect(source).not.toContain('course.chapters.find(\n                                                   c => c.id !== chapter.id,');
});

test('restores course state when a lesson move fails', () => {
  expect(source).toContain('const previousCourse = course;');
  expect(source).toContain('setCourse(previousCourse);');
  expect(source).toContain("toast.danger(e?.message ?? 'Unable to move lesson')");
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- resources/client/dashboard/courses/course-move.test.tsx`

Expected: FAIL because the current menu chooses the first other chapter and does not update local state before requesting.

- [ ] **Step 3: Create the controlled destination chooser**

```tsx
function MoveLessonDialog({course, lesson, sourceChapter, open, onOpenChange, onMoved}: MoveLessonDialogProps) {
  const [targetChapterId, setTargetChapterId] = useState<number | null>(null);
  const targets = course.chapters.filter(chapter => chapter.id !== sourceChapter.id);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>{/* title, description, Select group, Cancel and disabled Move buttons */}</Dialog.Portal>
    </Dialog.Root>
  );
}
```

Use `Select.Group`, `Select.Item`, and a disabled move action until `targetChapterId !== null`.

- [ ] **Step 4: Optimistically update both lesson arrays and restore the exact previous course on failure**

```tsx
const previousCourse = course;
setCourse(current => current ? moveLessonInCourse(current, lesson.id, sourceChapter.id, targetChapterId) : current);
setReordering(`move-${lesson.id}`);
try {
  await apiClient.post(`/api/v1/course-lessons/${lesson.id}/move`, {target_chapter_id: targetChapterId, position: 0});
  await load();
  onOpenChange(false);
} catch (e: any) {
  setCourse(previousCourse);
  toast.danger(e?.message ?? 'Unable to move lesson');
} finally {
  setReordering(undefined);
}
```

`moveLessonInCourse` removes the lesson from source, prepends it to target, updates its `chapter_id`, and maps both arrays to contiguous `sort_order` values.

- [ ] **Step 5: Wire the lesson menu to open the chooser**

```tsx
<Dropdown.Item disabled={!!reordering} onClick={() => setMoveRequest({lesson, sourceChapter: chapter})}>
  <Trans message="Move to chapter" />
</Dropdown.Item>
```

- [ ] **Step 6: Run the move tests and backend test**

Run: `npm test -- resources/client/dashboard/courses/course-move.test.tsx && ddev exec php artisan test tests/Feature/CourseMoveLessonTest.php`

Expected: PASS; both source and target sort orders remain contiguous.

- [ ] **Step 7: Commit the focused change**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-move.test.tsx
```

### Task 4: Make Settings And Deletion Flows Mobile-Safe

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:215-225, 1000-1180`
- Modify: `resources/client/dashboard/courses/course-builder-page.test.tsx`

**Interfaces:**
- Consumes: existing `CourseSettingsDialog` inputs and save request.
- Produces: `CourseSettingsContent` shared by responsive desktop dialog and mobile drawer; `DeleteCourseItemDialog` for chapter and lesson deletion.

- [ ] **Step 1: Write failing overlay tests**

```ts
test('uses a bottom Drawer for phone settings and a Dialog on desktop', () => {
  expect(source).toContain("import {Drawer} from '@shadcn/drawer/drawer'");
  expect(source).toContain('<Drawer.Root');
  expect(source).toContain('position="bottom"');
  expect(source).toContain('<Dialog.Root');
});

test('replaces browser confirmation with AlertDialog', () => {
  expect(source).toContain("import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog'");
  expect(source).not.toContain('confirm(');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- resources/client/dashboard/courses/course-builder-page.test.tsx`

Expected: FAIL because settings only use Dialog and deletion calls `confirm()`.

- [ ] **Step 3: Extract settings form content and render it in both overlay shells**

```tsx
function CourseSettingsContent(props: CourseSettingsContentProps) {
  return <>{/* Field.Root controls, cover dropzone, learning switch, instructor collapsible */}</>;
}

<Drawer.Root open={open} onOpenChange={requestClose} position="bottom">
  <Drawer.Portal><Drawer.Backdrop /><Drawer.Content className="lg:hidden"><Drawer.Header><Drawer.Title><Trans message="Course Settings" /></Drawer.Title></Drawer.Header><Drawer.Body><CourseSettingsContent {...contentProps} /></Drawer.Body><Drawer.Footer>{footer}</Drawer.Footer></Drawer.Content></Drawer.Portal>
</Drawer.Root>
<Dialog.Root open={open} onOpenChange={onOpenChange}>
  <Dialog.Portal>{/* hidden lg:block desktop dialog */}</Dialog.Portal>
</Dialog.Root>
```

Use `Drawer.Body`/`Drawer.Footer` for phone and `Dialog.Body`/`Dialog.Footer` for desktop. Use `flex flex-col gap-6`, not `space-y-6`.

- [ ] **Step 4: Track dirty state and guard dismissals**

```tsx
const isDirty = title !== initial.title || coverFileId !== initial.coverFileId || price !== initial.price || requireSeq !== initial.requireSeq;
const requestClose = (nextOpen: boolean) => {
  if (!nextOpen && isDirty) { setDiscardOpen(true); return; }
  onOpenChange(nextOpen);
};
```

Use an `AlertDialog` to confirm discarding changes. Cancel keeps the settings overlay open; discard resets from `course` and closes it.

- [ ] **Step 5: Replace chapter and lesson deletion with a pending-aware AlertDialog**

```tsx
<AlertDialog.Root open={pendingDelete !== null} onOpenChange={open => !open && setPendingDelete(null)}>
  <AlertDialog.Portal>{/* title, description, Cancel, destructive Action */}</AlertDialog.Portal>
</AlertDialog.Root>
```

The destructive action calls the current API endpoint, awaits `load()`, clears selection if needed, closes on success, and shows `toast.danger` on failure.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- resources/client/dashboard/courses/course-builder-page.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the focused change**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
```

### Task 5: Make Image Crop Overlays Fit Short Phone Viewports

**Files:**
- Modify: `common/foundation/resources/client/shadcn/image-crop/image-crop.tsx:171-201`
- Modify: `common/foundation/resources/client/uploads/components/cropped-image-selector.tsx:227-292`
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:1225-1263`
- Modify: `resources/client/shadcn/image-crop.test.tsx`

**Interfaces:**
- Consumes: `ImageCropContent`, `ImageCropApply`, and `ImageCropReset`.
- Produces: responsive crop canvas sizing and one `Dialog.Root` per `CroppedImageSelector` instance.

- [ ] **Step 1: Write the failing responsive crop test**

```ts
test('uses dynamic viewport-safe crop sizing and one dialog tree', () => {
  expect(cropSource).toContain('h-[min(50dvh,520px)]');
  expect(cropSource).not.toContain('min-h-[320px]');
  expect(selectorSource.match(/<Dialog\.Root/g)).toHaveLength(1);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- resources/client/shadcn/image-crop.test.tsx`

Expected: FAIL because the crop canvas has a hard 320px minimum and the selector renders two dialog roots.

- [ ] **Step 3: Replace fixed mobile crop height with dynamic viewport sizing**

```tsx
<div className="relative h-[min(50dvh,520px)] min-h-52 overflow-hidden rounded-card bg-muted sm:h-[460px] sm:min-h-0">
  <Cropper image={imageUrl} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
</div>
```

Remove caller-level `min-h-[320px]` and retain desktop `sm:max-h-[520px] sm:min-h-[460px]` constraints.

- [ ] **Step 4: Consolidate CroppedImageSelector into one dialog root**

```tsx
<Dialog.Root open={cropOpen} onOpenChange={setCropOpen}>
  <Dialog.Portal>
    <Dialog.Backdrop />
    <Dialog.Content className="max-w-[calc(100vw-2rem)] sm:max-w-xl">
      {pendingFile ? (
        <ImageCrop aspect={aspect} file={pendingFile} onCrop={handleCrop}>
          <Dialog.Header><Dialog.Title><Trans message="Crop image" /></Dialog.Title><Dialog.Description><Trans message="Adjust the preferred region, then apply." /></Dialog.Description></Dialog.Header>
          <Dialog.Body><ImageCropContent /></Dialog.Body>
          <Dialog.Footer><ImageCropReset asChild><Button variant="ghost"><Trans message="Reset" /></Button></ImageCropReset><Dialog.CloseButton><Trans message="Cancel" /></Dialog.CloseButton><ImageCropApply asChild><Button><Trans message="Apply crop" /></Button></ImageCropApply></Dialog.Footer>
        </ImageCrop>
      ) : <p className="text-sm text-muted-foreground"><Trans message="No image selected." /></p>}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

- [ ] **Step 5: Make crop footer wrap safely on phones**

```tsx
<Dialog.Footer className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
  <ImageCropReset asChild><Button variant="ghost"><Trans message="Reset" /></Button></ImageCropReset>
  <Dialog.CloseButton variant="outline"><Trans message="Cancel" /></Dialog.CloseButton>
  <ImageCropApply asChild><Button><Trans message="Apply crop" /></Button></ImageCropApply>
</Dialog.Footer>
```

- [ ] **Step 6: Run focused tests**

Run: `npm test -- resources/client/shadcn/image-crop.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the focused change**

```bash
git add common/foundation/resources/client/shadcn/image-crop/image-crop.tsx common/foundation/resources/client/uploads/components/cropped-image-selector.tsx resources/client/dashboard/courses/course-builder-page.tsx resources/client/shadcn/image-crop.test.tsx
```

### Task 6: Finish Shared Product Cover Rendering

**Files:**
- Modify: `resources/client/digital-products/public/digital-product-public-pages.tsx:742-778`
- Modify: `resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx:127-172`
- Modify: `resources/client/digital-products/public/digital-product-cover.test.tsx`

**Interfaces:**
- Consumes: `ProductCover` from `@ui/product-cover` with `cover`, `alt`, `className`, and image fallback behavior.
- Produces: public product and shop widget cover rendering that uses the single shared image normalization/error/aspect implementation.

- [ ] **Step 1: Write failing shared-cover tests**

```ts
test('public and widget product covers use the shared ProductCover', () => {
  expect(publicSource).toContain("import {ProductCover} from '@ui/product-cover'");
  expect(widgetSource).toContain("import {ProductCover} from '@ui/product-cover'");
  expect(publicSource).not.toContain('const [imageError, setImageError]');
  expect(widgetSource).not.toContain('const [imageError, setImageError]');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- resources/client/digital-products/public/digital-product-cover.test.tsx`

Expected: FAIL because both locations maintain their own image error state.

- [ ] **Step 3: Replace only the image branch with ProductCover**

```tsx
<ProductCover
  cover={product.cover}
  alt={product.title}
  className="size-full"
/>
```

Keep each page's product-specific empty-state decoration outside `ProductCover`; do not duplicate image loading, URL normalization, or image-error state.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- resources/client/digital-products/public/digital-product-cover.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the focused change**

```bash
git add resources/client/digital-products/public/digital-product-public-pages.tsx resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx resources/client/digital-products/public/digital-product-cover.test.tsx
```

### Task 7: Replace JSON Preview With A Human Course Preview Surface

**Files:**
- Create: `resources/client/dashboard/courses/course-preview-page.tsx`
- Modify: `resources/client/dashboard/dashboard-routes.tsx:435-445`
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:372-405`
- Create: `resources/client/dashboard/courses/course-preview-page.test.tsx`

**Interfaces:**
- Consumes: authenticated `GET /api/v1/courses/{course}/preview`, `CourseResource` data, and `ProductCover`.
- Produces: `/dashboard/my-products/:productId/course/preview`, a human-readable owner-only preview screen.

- [ ] **Step 1: Write the failing preview route test**

```ts
test('registers a human course preview route', () => {
  expect(routes).toContain("path: 'my-products/:productId/course/preview'");
  expect(builderSource).toContain('course/preview');
  expect(builderSource).not.toContain('window.open(\n                `/api/v1/courses/${course.id}/preview?preview=1`');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- resources/client/dashboard/courses/course-preview-page.test.tsx`

Expected: FAIL because no dashboard preview route or page exists.

- [ ] **Step 3: Implement the authenticated preview page**

```tsx
export function Component() {
  const {productId} = useParams();
  const [course, setCourse] = useState<CoursePreview | null>(null);
  useEffect(() => {
    if (!productId) return;
    void apiClient.get(`/api/v1/digital-products/${productId}`).then(async response => {
      const courseId = response.data.data.course.id;
      const preview = await apiClient.get(`/api/v1/courses/${courseId}/preview`);
      setCourse(preview.data.data);
    });
  }, [productId]);
  if (!course) return <FullPageLoader screen />;
  return <CoursePreview course={course} />;
}
```

`PublicCoursePreview` displays `ProductCover`, title, price formatted with `formatMoney`, chapter/lesson curriculum, and a clearly labeled Preview banner. It does not offer purchase or state-changing learner actions.

- [ ] **Step 4: Register the dashboard route and update both header preview actions**

```tsx
{
  path: 'my-products/:productId/course/preview',
  lazy: () => import('@app/dashboard/courses/course-preview-page'),
},

onClick={() => window.open(`/dashboard/my-products/${productId}/course/preview`, '_blank')}
```

- [ ] **Step 5: Run focused route tests**

Run: `npm test -- resources/client/dashboard/courses/course-preview-page.test.tsx resources/client/dashboard/courses/course-preview.test.tsx resources/client/dashboard/dashboard-routes.test.tsx`

Expected: PASS; no Preview control opens an API JSON response.

- [ ] **Step 6: Commit the focused change**

```bash
git add resources/client/dashboard/courses/course-preview-page.tsx resources/client/dashboard/courses/course-preview-page.test.tsx resources/client/dashboard/dashboard-routes.tsx resources/client/dashboard/courses/course-builder-page.tsx
```

### Task 8: Full Verification And Responsive QA

**Files:**
- Modify only if a test reveals a defect in a prior task.

**Interfaces:**
- Consumes: all completed responsive builder, overlay, crop, cover, and preview changes.
- Produces: verified mobile and desktop behavior with no scope expansion.

- [ ] **Step 1: Run frontend verification**

Run: `npm test && npx oxlint resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-preview-page.tsx common/foundation/resources/client/shadcn/image-crop/image-crop.tsx common/foundation/resources/client/uploads/components/cropped-image-selector.tsx && npm run build && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 2: Run backend regression tests**

Run: `ddev exec php artisan test tests/Feature/CourseMoveLessonTest.php tests/Feature/CourseSystemTest.php`

Expected: PASS, including source and target sort-order reindexing.

- [ ] **Step 3: Perform viewport QA in the browser**

Check widths 360px, 390px, 768px, 1024px, and desktop:

```text
360/390: one surface at a time; header does not overflow; menus and footer actions are tap-friendly; crop dialog fits.
768: settings drawer scrolls with a persistent footer; deletion confirmation is readable.
1024/desktop: split layout and native sortable handles remain available; all old actions still work.
```

- [ ] **Step 4: Commit only any defect corrections from verification**

```bash
git status --short
# If verification changed files, stage exactly those listed by `git status --short`.
# If verification changed no files, do not create a commit.
```
