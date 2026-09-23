# Phase B: Course Flow-Confusion Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the five researched confusion points in the course flow (handoff provenance, silent edit-redirect, unexplained submit gating, uncertain-creation dead-end, silent rename + prepend-on-move) using existing primitives and established repo patterns.

**Architecture:** All client-side, no API changes, no new routes, no new dependencies. The builder edits are localized to the header, curriculum-column top, rename handler, and move helper — no structural split of the monolith. `moveLessonInCourse` stays a pure module function (now with append-at-end semantics + unit coverage).

**Tech Stack:** React 19, Tailwind v4, Base UI, shadcn `base-luma`, react-router, vitest, oxlint.

**Spec:** `docs/superpowers/specs/2026-09-23-course-flow-confusion-fixes-design.md`

## Global Constraints

- Semantic tokens only: no hex, no `rgb()`/`oklch()` inline, no Tailwind color literals, no arbitrary radius/shadow. Radius via `rounded-card*` / `rounded-input` / `rounded-button` only.
- Spacing via `gap-*`; never `space-x-*` / `space-y-*`. Equal sizes via `size-*`.
- Reuse `@shadcn/*` primitives; lucide icons with `data-icon="inline-start|inline-end"` inside buttons.
- Static UI strings via `<Trans message="..." />` (values via `values={{...}}`). Runtime validation/server messages stay string literals rendered through `Field.Error` / `Alert.Description` / `toast.*` — identical to `digital-product-form-page.tsx` and the existing builder `toast.*` calls.
- No `dark:` overrides on new UI. No API changes. No new dependencies.
- `npm test` = `vitest run`. Lint touched files with `npx oxlint <paths>`.

---

### Task 1: Handoff provenance line on the course page

**Files:**
- Modify: `resources/client/dashboard/courses/create-course-page.tsx` (insert block)
- Test: `resources/client/dashboard/courses/create-course-page.test.tsx` (append describe)

**Interfaces:**
- Consumes: `prefill` (`parseWizardPrefill(searchParams)`), `isFree`, `price` state, `Trans` — all already in the file post-Phase-A.
- Produces: nothing downstream (display-only).

- [ ] **Step 1: Write the failing test**

Append to `create-course-page.test.tsx`:
```tsx
describe('wizard handoff provenance', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
    'utf8',
  );

  test('states where the billing and price came from', () => {
    expect(source).toContain('prefill.billing !== null');
    expect(source).toContain('From previous step: Free.');
    expect(source).toContain('From previous step: Paid');
  });
});
```
(`fs` and `path` are already imported at the top of that file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/create-course-page.test.tsx`
Expected: FAIL — none of the three strings present.

- [ ] **Step 3: Insert the provenance line**

Anchor (verbatim from the merged Phase-A file): the content column opens with
```tsx
<div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-4 sm:py-5">
  {isFree && (
```
Insert between those two lines:
```tsx
          {prefill.billing !== null && (
            <p className="text-sm text-muted-foreground">
              {isFree ? (
                <Trans message="From previous step: Free." />
              ) : (
                <Trans
                  message="From previous step: Paid · ETB :price — you can change it here."
                  values={{price: price.trim() === '' ? '0.00' : price}}
                />
              )}
            </p>
          )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/create-course-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/courses/create-course-page.test.tsx
git commit -m "feat(courses): show wizard provenance on course creation"
```

---

### Task 2: Explained edit-redirect into the builder

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx` (course redirect branch only)
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (searchParams setter, notice Alert)
- Test: `resources/client/dashboard/digital-products/digital-product-form-page.test.tsx` (append), `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `navigate` (form page, already in scope); `useSearchParams`, `Alert`, `Button`, `Trans` (builder already imports all four — extend the existing `useSearchParams` destructure, do not re-import).
- Produces: transient `?notice=moved-to-builder` param, consumed and cleaned client-side only.

- [ ] **Step 1: Write the failing tests**

In `digital-product-form-page.test.tsx`, append:
```tsx
describe('course edit redirect', () => {
  test('routes course edits into the builder with an explanatory notice', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('?notice=moved-to-builder');
  });
});
```
In `course-builder-page.test.tsx`, append:
```tsx
describe('moved-to-builder notice', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('explains the redirect once, then cleans the param', () => {
    expect(source).toContain('moved-to-builder');
    expect(source).toContain('Course details live here in the course builder.');
    expect(source).toContain('Dismiss');
    expect(source).toContain("next.delete('notice')");
  });
});
```
(Verify `fs`/`path` imports exist in each test file first; add them if missing — both files already import them per repo convention. If `course-builder-page.test.tsx` lacks the imports, add the two import lines rather than failing.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL on both new blocks.

- [ ] **Step 3a: Append the notice param at the redirect site**

Exact current code (`digital-product-form-page.tsx:236-241`):
```tsx
          if (item.type === 'course') {
            navigate(`/dashboard/my-products/${item.id}/course`, {
              replace: true,
            });
            return;
          }
```
Replace with:
```tsx
          if (item.type === 'course') {
            navigate(
              `/dashboard/my-products/${item.id}/course?notice=moved-to-builder`,
              {
                replace: true,
              },
            );
            return;
          }
```

- [ ] **Step 3b: Render and clean the notice in the builder**

Change line 153 from `const [searchParams] = useSearchParams();` to `const [searchParams, setSearchParams] = useSearchParams();`, then add immediately after it:
```tsx
  const movedNotice = searchParams.get('notice') === 'moved-to-builder';
  const dismissNotice = () => {
    setSearchParams(
      previous => {
        const next = new URLSearchParams(previous);
        next.delete('notice');
        return next;
      },
      {replace: true},
    );
  };
```
Insert the Alert as the first child of the curriculum column (anchor: the column div ending at old line 700, `{/* Curriculum */}` comment at 694 — insert after the opening column `<div ...>` and before the header row `<div className="flex items-center justify-between gap-2 border-b p-3">`):
```tsx
            {movedNotice && (
              <div className="border-b px-3 py-3">
                <Alert.Root className="border-primary/20 bg-primary/5">
                  <Alert.Description className="flex flex-wrap items-center justify-between gap-2">
                    <Trans message="Course details live here in the course builder." />
                    <Button size="sm" variant="ghost" onClick={dismissNotice}>
                      <Trans message="Dismiss" />
                    </Button>
                  </Alert.Description>
                </Alert.Root>
              </div>
            )}
```
Do not touch the `lessonId` deep-link logic (lines 190-197) — `setSearchParams` with a copied instance preserves all other params.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/digital-product-form-page.test.tsx resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/digital-product-form-page.test.tsx resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "feat(courses): explain edit redirect with dismissible builder notice"
```

---

### Task 3: Self-explaining submit gating

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (header actions only + one import)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `Tooltip` from `@shadcn/tooltip/tooltip` (new import — path verified in committed `product-preview.tsx`); `canSubmit`, `hasPublishedLesson`, `publishing`, `submit()` (all already in scope).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Append to `course-builder-page.test.tsx`:
```tsx
describe('submit gating guidance', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('explains blocked and approved states next to the button', () => {
    expect(source).toContain(
      'Publish at least one lesson to submit for review.',
    );
    expect(source).toContain('Edits will return this course to draft.');
    expect(source).toContain("from '@shadcn/tooltip/tooltip'");
    expect(source).toContain('<Tooltip.Root');
    expect(source).toContain('Tooltip.Content');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL — none of the strings present.

- [ ] **Step 3: Wrap the submit button with hint text and tooltip**

Add the import (alphabetical placement is not enforced — put it with the other `@shadcn` imports):
```tsx
import {Tooltip} from '@shadcn/tooltip/tooltip';
```
Replace the submit `<Button>` block (old lines 674-688) with:
```tsx
          <div className="flex min-w-0 flex-col items-end gap-1">
            {!hasPublishedLesson && canSubmit && !publishing && (
              <p className="text-xs text-muted-foreground">
                <Trans message="Publish at least one lesson to submit for review." />
              </p>
            )}
            {!canSubmit && (
              <p className="text-xs text-muted-foreground">
                <Trans message="Edits will return this course to draft." />
              </p>
            )}
            <Tooltip.Root>
              <Tooltip.Trigger
                aria-label="Submit for review"
                render={
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      onClick={() => void submit()}
                      disabled={publishing || !canSubmit || !hasPublishedLesson}
                    >
                      <Trans
                        message={
                          publishing
                            ? 'Submitting...'
                            : hasPublishedLesson
                              ? 'Submit for review'
                              : 'Add a published lesson'
                        }
                      />
                    </Button>
                  </span>
                }
              >
                <span className="sr-only">
                  <Trans message="Submit requirements" />
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {!hasPublishedLesson ? (
                  <Trans message="Publish at least one lesson before submitting." />
                ) : !canSubmit ? (
                  <Trans message="This course is live or in review." />
                ) : (
                  <Trans message="Submit this course for review." />
                )}
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
```
Keep the existing `Trans` message ternaries byte-identical (existing tests assert them). The `render`-prop span pattern is copied verbatim from committed `product-preview.tsx` (disabled-button tooltip). Do not touch `EyeIcon`/`SettingsIcon` missing `data-icon` (Phase D scope).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS, including all pre-existing submit assertions.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "feat(courses): explain submit gating with hint and tooltip"
```

---

### Task 4: Uncertain-creation direct retry

**Files:**
- Modify: `resources/client/dashboard/courses/create-course-page.tsx` (one-line change)
- Test: `resources/client/dashboard/courses/create-course-page.test.tsx` (append)

**Interfaces:**
- Consumes: `creating`, `creationUncertain` state (already in file).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Append to `create-course-page.test.tsx`:
```tsx
describe('uncertain creation recovery', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
    'utf8',
  );

  test('keeps submit enabled for direct retry', () => {
    expect(source).toContain('disabled={creating}>');
    expect(source).not.toContain('disabled={creating || creationUncertain}');
  });

  test('keeps the my-products escape hatch', () => {
    expect(source).toContain('creationUncertain');
    expect(source).toContain('Check My Products');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/create-course-page.test.tsx`
Expected: FAIL on the first assertion (`disabled={creating || creationUncertain}` still present).

- [ ] **Step 3: Allow retry**

Change `<Button type="submit" disabled={creating || creationUncertain}>` to `<Button type="submit" disabled={creating}>`. Touch nothing else in the submit flow.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/create-course-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/courses/create-course-page.test.tsx
git commit -m "fix(courses): allow direct retry after uncertain creation"
```

---

### Task 5: Rename feedback + append-on-move

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (`updateChapterTitle`, `moveLesson`, `moveLessonInCourse`)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append rename assertions), `resources/client/dashboard/courses/course-move.test.tsx` (rewrite POST-position + optimistic-order assertions)

**Interfaces:**
- Consumes: `course` state, `apiClient`, `toast` (all in scope); `moveLessonInCourse(course, lessonId, sourceChapterId, targetChapterId)` keeps its signature — only target-placement changes from prepend to append.
- Produces: same function shapes; POST sends the computed end position.

- [ ] **Step 1: Write the failing tests**

In `course-builder-page.test.tsx`, append:
```tsx
describe('chapter rename feedback', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('saves optimistically with success and revert paths', () => {
    expect(source).toContain('previousTitle');
    expect(source).toContain("toast.positive('Chapter title saved')");
    expect(source).toContain('title: revertedTitle');
    expect(source).toContain("toast.danger(e.message ?? 'Unable to save chapter title')");
  });
});
```
In `course-move.test.tsx`, replace the POST-position expectation (`position: 0,`) with:
```ts
    expect(source).toContain('const targetCount =');
    expect(source).toContain('position: targetCount,');
```
and replace the optimistic-order expectation (`{...lesson, chapter_id: targetChapterId},\n            ...chapter.lessons,`) with:
```ts
    expect(source).toContain(
      '...chapter.lessons,\n            {...lesson, chapter_id: targetChapterId},',
    );
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx resources/client/dashboard/courses/course-move.test.ts`
Expected: FAIL on all new/changed assertions. NOTE the second path: the file on disk is `course-move.test.tsx` — if the `.ts` path errors as "no test files found", run with the `.tsx` extension instead; the assertion content is identical either way.

- [ ] **Step 3a: Optimistic rename with revert**

Replace `updateChapterTitle` (old lines 276-287) with:
```tsx
  const updateChapterTitle = async (chapterId: number, title: string) => {
    const previousTitle = course?.chapters.find(
      c => c.id === chapterId,
    )?.title;
    setCourse(c => {
      if (!c) return c;
      return {
        ...c,
        chapters: c.chapters.map(ch =>
          ch.id === chapterId ? {...ch, title} : ch,
        ),
      };
    });
    try {
      await apiClient.put(`/api/v1/course-chapters/${chapterId}`, {title});
      toast.positive('Chapter title saved');
    } catch (e: any) {
      if (previousTitle !== undefined) {
        const revertedTitle = previousTitle;
        setCourse(c => {
          if (!c) return c;
          return {
            ...c,
            chapters: c.chapters.map(ch =>
              ch.id === chapterId ? {...ch, title: revertedTitle} : ch,
            ),
          };
        });
      }
      toast.danger(e.message ?? 'Unable to save chapter title');
    }
  };
```
Keep the input's `defaultValue`/`onBlur`/Enter-to-blur wiring untouched.

- [ ] **Step 3b: Append moved lessons at the end**

In `moveLesson`, compute the destination length before the optimistic update and send it:
```tsx
    const targetCount =
      course.chapters.find(c => c.id === targetChapterId)?.lessons.length ?? 0;
```
inserted after the `if (!course || reordering) return false;` guard, and change the POST body to:
```tsx
      await apiClient.post(`/api/v1/course-lessons/${lesson.id}/move`, {
        target_chapter_id: targetChapterId,
        position: targetCount,
      });
```
In `moveLessonInCourse`, change the target-chapter branch from prepend to append:
```tsx
      if (chapter.id === targetChapterId) {
        return {
          ...chapter,
          lessons: [
            ...chapter.lessons,
            {...lesson, chapter_id: targetChapterId},
          ].map((item, sortOrder) => ({...item, sort_order: sortOrder})),
        };
      }
```
The cross-chapter-only dialog filter (`chapter.id !== sourceChapter.id`) is unchanged, so `targetCount` is exact.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx resources/client/dashboard/courses/course-move.test.ts` (fall back to `.tsx` for the second path if needed, per Step 2).
Expected: PASS, including the untouched move-dialog assertions.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx resources/client/dashboard/courses/course-move.test.ts
git commit -m "fix(courses): rename feedback and append moved lessons at end"
```
(Use the real on-disk extension for the move test file in the `git add`.)

---

### Task 6: Verification pass (tokens, lint, tests, manual QA)

**Files:** none (fix-only; commit only if a fix is required).

- [ ] **Step 1: Token audit — grep touched files for raw visual values**

Run:
```bash
grep -En "#[0-9a-fA-F]{3,8}|rounded-\[|shadow-\[|bg-(blue|gray|white|black)-|dark:" resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/courses/course-builder-page.tsx || true
```
Expected: no output.

- [ ] **Step 2: Lint touched files**

Run: `npx oxlint resources/client/dashboard/courses/create-course-page.tsx resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/create-course-page.test.tsx resources/client/dashboard/digital-products/digital-product-form-page.test.tsx resources/client/dashboard/courses/course-builder-page.test.tsx resources/client/dashboard/courses/course-move.test.ts resources/client/dashboard/dashboard-routes.tsx resources/client/dashboard/dashboard-routes.test.tsx`
Expected: zero errors (warnings acceptable only if pre-existing on untouched lines; use the real on-disk extension for the move test file).

- [ ] **Step 3: Run the full client test suite**

Run: `npx vitest run`
Expected: all suites PASS.

- [ ] **Step 4: Manual QA checklist (report results in chat, fix issues as new commits)**

  - Wizard-originated course page shows the provenance line; direct visits do not.
  - Edit-URL bounce shows the one-time dismissible explanation; Dismiss cleans the param without touching `lessonId`.
  - Submit with no published lesson shows the inline hint + hover tooltip; approved state shows the draft warning text.
  - Uncertain creation allows direct retry; escape hatch still present.
  - Chapter rename reflects instantly, toasts on success, reverts + toasts on failure (verify failure via offline/devtools).
  - Moving a lesson to another chapter lands it last, order persists after reload.

- [ ] **Step 5: Commit only if fixes were needed**

```bash
git add -A
git commit -m "fix(courses): address verification findings on flow-confusion fixes"
```

Skip this step entirely when the verification pass is clean.
