# Course Builder Preview and Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify cover preview across builder/storefront and enable cross-chapter lesson moves with contiguous sort_order.

**Architecture:** Extract a shared `ProductCover` component for all previews, fix `CourseBuilder` preview to use authenticated `GET /courses/{id}/preview`, and extend `CourseService::moveLesson` to reindex source chapter plus add a `Dropdown → Move to chapter` action (keeping existing intra-list `useSortable` for chapters/lessons).

**Tech Stack:** React 19, TypeScript 5.9, Tailwind 4.3, shadcn base-luma, lucide, Laravel 12.67, PHP 8.4, `useSortable`, `apiClient`, `toast`, `cn`.

**Spec:** docs/superpowers/specs/2026-08-30-course-builder-remaining-spec.md

## Global Constraints
- Laravel 12.67, PHP 8.4, React 19.1, TypeScript 5.9.3, Tailwind 4.3.1, Vite 8.0.1, shadcn base-luma, `react-easy-crop` 5.5.7 already installed — no new deps.
- Use `@shadcn` aliases, semantic tokens (`bg-card`, `text-muted-foreground`), `Button` variants, `cn()` for conditionals, `size-*` for equal dimensions.
- All API calls via `apiClient` with `ActiveWorkspace` header, `toast` for errors, handle-only drag.
- Tests via `vitest run` (`resources/client/**/*.test.*`), lint `npx oxlint`, build `npm run build`.

---

## File Structure

**New:**
- `common/foundation/resources/client/ui/product-cover.tsx` — shared `ProductCover` (covers `normalizeMediaUrl`, `imageError` fallback, `aspect-video`, `object-cover`, `onError`).

**Modify:**
- `resources/client/dashboard/courses/course-builder-page.tsx:344-400` — preview button + `CoverImageDropzone` aspect + header.
- `resources/client/dashboard/digital-products/digital-product-form-page.tsx:612` — `ProductBuilderPreview` to use `ProductCover`.
- `common/foundation/resources/client/shadcn/image-crop/image-crop.tsx` — no change (aspect already generic).
- `app/Courses/Services/CourseService.php:93-114` — `moveLesson` reindex source + target.
- `app/Courses/Controllers/LessonsController.php:143` — existing `move` route, ensure `assertOwner` check.
- `resources/client/dashboard/courses/course-builder-page.tsx:440-623` — curriculum `Dropdown` move action.

**Test:**
- `resources/client/dashboard/courses/course-preview.test.tsx` — preview link uses `preview=1`.
- `resources/client/dashboard/courses/course-cover.test.tsx` — cover aspect `16/9`.
- `tests/Feature/CourseMoveLessonTest.php` — cross-chapter move leaves no gaps.

---

### Task 1: Shared ProductCover Component

**Files:**
- Create: `common/foundation/resources/client/ui/product-cover.tsx`
- Test: `resources/client/shadcn/product-cover.test.tsx` (or `resources/client/ui/product-cover.test.tsx`)

**Interfaces:**
- Consumes: `FileEntry` url, `cover?: {id:number,url:string}|null`
- Produces: `export function ProductCover({cover, className, aspect?}:{cover?:{url:string}|null, className?:string, aspect?:string})` — renders `img` with `onError` fallback + `normalizeMediaUrl` if needed, `aspect-video`, `object-cover`, `rounded-card`.

- [ ] **Step 1: Write the failing test**

```tsx
// resources/client/shadcn/product-cover.test.tsx
import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('product cover',()=>{
  test('shared component handles imageError and aspect-video',()=>{
    const src=fs.readFileSync(path.resolve('common/foundation/resources/client/ui/product-cover.tsx'),'utf8');
    expect(src).toContain('ProductCover');
    expect(src).toContain('imageError');
    expect(src).toContain('aspect-video');
    expect(src).toContain('onError');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/shadcn/product-cover.test.tsx -v`
Expected: FAIL with "no such file or directory, open '.../product-cover.tsx'"

- [ ] **Step 3: Write minimal implementation**

```tsx
// common/foundation/resources/client/ui/product-cover.tsx
'use client';
import {cn} from '@ui/utils/cn';
import {useState} from 'react';
export function ProductCover({cover, className, aspect="aspect-video"}:{cover?:{url:string}|null, className?:string, aspect?:string}){
  const [err,setErr]=useState(false);
  if(!cover?.url || err) return <div className={cn('flex aspect-video items-center justify-center rounded-card bg-muted text-muted-foreground',className)}>No cover</div>;
  return <img src={cover.url} alt="" onError={()=>setErr(true)} className={cn('w-full object-cover',aspect,className)} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/shadcn/product-cover.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add common/foundation/resources/client/ui/product-cover.tsx resources/client/shadcn/product-cover.test.tsx
git commit -m "feat(ui): add shared ProductCover with imageError and aspect-video"
```

---

### Task 2: Fix CourseBuilder Preview Link

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:344-400`
- Test: `resources/client/dashboard/courses/course-preview.test.tsx`

**Interfaces:**
- Consumes: `course.id`, `productId`, `apiClient`
- Produces: `previewUrl = \`/api/v1/courses/${course.id}/preview?preview=1\`` opened via `window.open` with `credentials: same-origin`.

- [ ] **Step 1: Write the failing test**

```tsx
// resources/client/dashboard/courses/course-preview.test.tsx
import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course preview link',()=>{
  test('uses authenticated preview endpoint',()=>{
    const src=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    expect(src).toContain('/preview?preview=1');
    expect(src).not.toContain('`/@${course.product.title}`');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-preview.test.tsx -v`
Expected: FAIL with "expected … to contain '/preview?preview=1'"

- [ ] **Step 3: Write minimal implementation**

```tsx
// in CourseBuilder header, replace:
// onClick={() => window.open(`/ @${course.product.title}`, '_blank')}
const preview = () => window.open(`/api/v1/courses/${course.id}/preview?preview=1`, '_blank');
// also ensure fetch with credentials: same-origin already used in load()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-preview.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-preview.test.tsx
git commit -m "fix(courses): use authenticated preview endpoint for builder"
```

---

### Task 3: Unify Cover Aspect to 16/9 and Use Shared ProductCover

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:1141` (`aspect={1200/514}` → `aspect={16/9}`), `resources/client/dashboard/digital-products/digital-product-form-page.tsx:771` already `16/9` keep, `common/foundation/resources/client/ui/product-cover.tsx` usage
- Test: `resources/client/dashboard/courses/course-cover.test.tsx`

**Interfaces:**
- Consumes: `ProductCover` from Task 1
- Produces: All covers render `16/9`.

- [ ] **Step 1: Write the failing test**

```tsx
// resources/client/dashboard/courses/course-cover.test.tsx
import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course cover aspect',()=>{
  test('uses 16/9 everywhere and shared component',()=>{
    const builder=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    const prod=fs.readFileSync(path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),'utf8');
    expect(builder).toContain('16 / 9'); expect(builder).not.toContain('1200 / 514');
    expect(builder).toContain('ProductCover'); expect(prod).toContain('ProductCover');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-cover.test.tsx -v`
Expected: FAIL with "expected … to contain 'ProductCover'"

- [ ] **Step 3: Write minimal implementation**

```tsx
// course-builder-page.tsx: import {ProductCover} from '@ui/product-cover';
// replace CoverImageDropzone preview <img className="aspect-[1200/514]"> with <ProductCover cover={cover} className="aspect-video" />
// change ImageCrop aspect={1200/514} to aspect={16/9}
// digital-product-form-page.tsx: replace <img className="size-full object-cover"> with <ProductCover>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-cover.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/digital-products/digital-product-form-page.tsx common/foundation/resources/client/ui/product-cover.tsx resources/client/dashboard/courses/course-cover.test.tsx
git commit -m "fix(courses): unify cover aspect to 16/9 via shared ProductCover"
```

---

### Task 4: Cross-Chapter Lesson Move (UI + Service Gap Fix)

**Files:**
- Modify: `app/Courses/Services/CourseService.php:93-114` — reindex source chapter
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx:440-623` — add `Dropdown.Item Move to…` calling `POST /api/v1/course-lessons/{lesson}/move`
- Test: `tests/Feature/CourseMoveLessonTest.php` + `resources/client/dashboard/courses/course-move.test.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/course-lessons/{lesson}/move` `{target_chapter_id, position}`
- Produces: `CourseService::moveLesson(lessonId, targetChapterId, position): void` with contiguous `0..n-1` in both chapters.

- [ ] **Step 1: Write the failing test (PHP)**

```php
// tests/Feature/CourseMoveLessonTest.php
public function testMoveReindexesSourceAndTarget(){
  $creator=$this->createCreator(); $ws=(new CreateWorkspace())->createPersonalWorkspace($creator);
  $product=$this->createCourseProduct($creator,$ws); $course=$product->course;
  $c1=Chapter::create(['course_id'=>$course->id,'title'=>'C1','sort_order'=>0]);
  $c2=Chapter::create(['course_id'=>$course->id,'title'=>'C2','sort_order'=>1]);
  $l1=Lesson::create(['chapter_id'=>$c1->id,'course_id'=>$course->id,'title'=>'L1','status'=>'draft','sort_order'=>0]);
  $l2=Lesson::create(['chapter_id'=>$c1->id,'course_id'=>$course->id,'title'=>'L2','status'=>'draft','sort_order'=>1]);
  $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$l1->id}/move",['target_chapter_id'=>$c2->id,'position'=>0])->assertOk();
  $this->assertEquals([0], Chapter::find($c1->id)->lessons()->pluck('sort_order')->all());
  $this->assertEquals([0,1], Chapter::find($c2->id)->lessons()->orderBy('sort_order')->pluck('sort_order')->all());
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/CourseMoveLessonTest.php -v`
Expected: FAIL with "Failed asserting that actual array [0,2] matches expected [0,1]" (source gap)

- [ ] **Step 3: Write minimal implementation (PHP)**

```php
// app/Courses/Services/CourseService.php: moveLesson
DB::transaction(function() use ($lesson,$target){
  $sourceId=$lesson->chapter_id;
  // move...
  Lesson::where('chapter_id',$sourceId)->where('id','!=',$lesson->id)->orderBy('sort_order')->get()->each(fn($l,$i)=>$l->update(['sort_order'=>$i]));
  // existing target reindex already
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/CourseMoveLessonTest.php -v`
Expected: PASS

- [ ] **Step 5: Write the failing test (JS)**

```tsx
// resources/client/dashboard/courses/course-move.test.tsx
import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course move',()=>{
  test('offers move to chapter',()=>{
    const src=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    expect(src).toContain('/move');
    expect(src).toContain('Move to');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-move.test.tsx -v`
Expected: FAIL

- [ ] **Step 7: Write minimal implementation (UI)**

```tsx
// course-builder-page.tsx: inside lesson Dropdown.Content
<Dropdown.Item onClick={async()=>{
  const target = course.chapters.find(c=>c.id!==chapter.id);
  if(!target) return;
  await apiClient.post(`/api/v1/course-lessons/${lesson.id}/move`,{target_chapter_id: target.id, position: 0});
  await load();
}}><Trans message="Move to chapter" /></Dropdown.Item>
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-move.test.tsx -v` and `php artisan test tests/Feature/CourseMoveLessonTest.php -v`
Expected: PASS both

- [ ] **Step 9: Commit**

```bash
git add app/Courses/Services/CourseService.php resources/client/dashboard/courses/course-builder-page.tsx tests/Feature/CourseMoveLessonTest.php resources/client/dashboard/courses/course-move.test.tsx
git commit -m "feat(courses): enable cross-chapter lesson move with source reindex"
```

---

## Self-Review

- Spec coverage: Task 1 covers shared ProductCover (spec §1), Task 2 preview link, Task 3 aspect unification, Task 4 cross-chapter move + gap fix (spec §2). All spec requirements have tasks.
- Placeholder scan: no TBD/TODO, all steps have actual code.
- Type consistency: `ProductCover` props `cover?:{url:string}|null`, `CourseService::moveLesson(int $lessonId,int $targetChapterId,int $position):void` consistent across tasks.
