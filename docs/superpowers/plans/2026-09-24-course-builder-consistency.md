# Phase D: Builder Consistency + Lesson Editor Behavior — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the course builder and analytics pages onto the app's token, rhythm, i18n, and a11y conventions, and fix three lesson-editor behaviors (type-switch data loss, stale video box, silent dirty-switch loss) — with no API changes and byte-identical save payloads.

**Architecture:** Class/string-level conversions plus three localized behavior changes in `course-builder-page.tsx`; one new tiny pure module `lesson-dirty.ts` for the dirty comparison (directly unit-tested — it has zero dependencies, unlike the page module). Analytics changes are confined to `course-analytics-page.tsx`.

**Tech Stack:** React 19, Tailwind CSS v4, Base UI, shadcn `base-luma`, react-router, vitest, oxlint.

**Spec:** `docs/superpowers/specs/2026-09-24-course-builder-consistency-design.md`

## Global Constraints

- Token equivalence (Tailwind v4 defaults vs theme vars): `rounded-xl` (12px) → `rounded-card-xs`; `rounded-2xl` (16px) → `rounded-card-sm`; `rounded-3xl` (24px) → `rounded-card`. Warning tones → `text-warning` / `bg-warning/10` / `bg-warning` (symmetrical with the committed `bg-positive/*` usage). No hex, no other literals, no arbitrary radius/shadow.
- Spacing: every `space-y-N [rest]` becomes `flex flex-col gap-N [rest]`, preserving all other classes. Equal sizes via `size-*`.
- Static UI strings via `<Trans message="..." />`, dynamic values via `values={{...}}` with static message templates. Runtime toast/server messages stay literals (file convention).
- No `dark:` overrides on new UI. No API changes — `save()`/`saveQuiz()` payloads byte-identical. No new dependencies except none at all (`lesson-dirty.ts` is dependency-free).
- `npm test` = `vitest run`. Lint touched files with `npx oxlint <paths>`.

---

### Task 1: Analytics tokens, layout, and MetricCard tone

**Files:**
- Modify: `resources/client/dashboard/courses/course-analytics-page.tsx`
- Test: `resources/client/dashboard/courses/course-analytics-page.test.tsx` (append)

**Interfaces:**
- Consumes: nothing new. `Card`, `Empty`, `Accordion`, `Progress`, `Badge`-like spans already in file.
- Produces: token-backed classes, unchanged DOM structure and text content.

- [ ] **Step 1: Write the failing test**

Append to `course-analytics-page.test.tsx` (verify `fs`/`path` imports exist first — add them if missing, following the repo's other test files):
```tsx
describe('analytics theme tokens', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/courses/course-analytics-page.tsx',
    ),
    'utf8',
  );

  test('uses rhythm and radius tokens, not literals', () => {
    expect(source).not.toMatch(/space-y-\d/);
    expect(source).not.toContain('rounded-xl');
    expect(source).not.toContain('bg-amber-500');
    expect(source).not.toContain('text-amber-');
    expect(source).not.toContain('dark:');
    expect(source).toContain('rounded-card');
  });

  test('warning tone resolves through the theme', () => {
    expect(source).toContain('bg-warning/10');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-analytics-page.test.tsx`
Expected: FAIL — `space-y-5`, `rounded-xl`, `bg-amber-500/10`, `text-amber-700`, `dark:text-amber-400` all present.

- [ ] **Step 3: Apply the mechanical conversions**

Exact edits (anchor strings are verbatim from current source):
1. Line 99 and line 177: `<div className="mx-auto w-full max-w-6xl space-y-5 py-6">` (two occurrences — apply to both) → `<div className="mx-auto flex w-full max-w-6xl flex-col gap-5 py-6">`
2. Lines 101-104: `h-28 w-full rounded-xl` (four occurrences) → `h-28 w-full rounded-card`
3. Line 106: `h-80 w-full rounded-xl` → `h-80 w-full rounded-card`
4. Line 144: `rounded-xl border border-dashed py-16` → `rounded-card border border-dashed py-16`
5. Line 185: `overflow-hidden rounded-xl border bg-card shadow-xs` → `overflow-hidden rounded-card border bg-card shadow-xs`
6. Line 222 pill ternary: `'bg-amber-500/10 text-amber-700 dark:text-amber-400'` → `'bg-warning/10 text-warning'`
7. Line 268: `<Progress.Indicator className="bg-amber-500" />` → `<Progress.Indicator className="bg-warning" />`
8. Lines 311-316 MetricCard tone map: `'text-amber-600 bg-amber-500/10 dark:text-amber-400'` → `'text-warning bg-warning/10'`
Change nothing else in this task (hints, pills text, and table stay for Task 2).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-analytics-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-analytics-page.tsx resources/client/dashboard/courses/course-analytics-page.test.tsx
git commit -m "fix(courses): theme tokens and rhythm on analytics page"
```

---

### Task 2: Analytics i18n (hints, pills, header count)

**Files:**
- Modify: `resources/client/dashboard/courses/course-analytics-page.tsx` (four MetricCard calls, two pill spans, one header span)
- Test: `resources/client/dashboard/courses/course-analytics-page.test.tsx` (append)

**Interfaces:**
- Consumes: `Trans` (already imported — the file renders `<Trans message={label} />` at old line 321).
- Produces: ReactNode hints; `MetricCard` hint prop type widens `string` → `ReactNode` (check the `ReactNode` import exists — the props type already references `ReactNode` at old line 307 for `icon`, so it does).

- [ ] **Step 1: Write the failing test**

Append to `course-analytics-page.test.tsx`:
```tsx
describe('analytics copy is translatable', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/courses/course-analytics-page.tsx',
    ),
    'utf8',
  );

  test('hints and pills go through Trans with static messages', () => {
    expect(source).toContain('hint={<Trans message="Enrolled" />');
    expect(source).toContain('message=":count lessons"');
    expect(source).toContain('hint={<Trans message="Total" />');
    expect(source).toContain('message=":count chapters"');
    expect(source).toContain('message=":chapters chapters · :lessons lessons"');
    expect(source).not.toContain('hint="Enrolled"');
    expect(source).not.toContain('hint={`${');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-analytics-page.test.tsx`
Expected: FAIL — hints are raw strings.

- [ ] **Step 3: Convert hints, pills, and header count**

MetricCard prop type: `hint: string;` → `hint: ReactNode;`. Call sites (old lines 179-182):
```tsx
<MetricCard label="Active learners" value={String(analytics.activeLearners)} hint={<Trans message="Enrolled" />} icon={<UsersIcon />} tone="default" compact />
<MetricCard label="Avg. completion" value={`${analytics.avgLessonCompletion.toFixed(0)}%`} hint={<Trans message=":count lessons" values={{count: analytics.totalLessons}} />} icon={<BookOpenIcon />} tone={analytics.avgLessonCompletion >= 50 ? 'positive' : 'warning'} compact />
<MetricCard label="Completions" value={String(analytics.lessonCompletions)} hint={<Trans message="Total" />} icon={<CheckCircleIcon />} tone="positive" compact />
<MetricCard label="Avg. chapter" value={`${analytics.avgChapterCompletion.toFixed(0)}%`} hint={<Trans message=":count chapters" values={{count: analytics.totalChapters}} />} icon={<LayersIcon />} tone={analytics.avgChapterCompletion >= 50 ? 'positive' : 'default'} compact />
```
Keep every other prop (label/value/icon/tone/compact) byte-identical. Header count span (old lines 190-191):
```tsx
<span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
  <Trans
    message=":chapters chapters · :lessons lessons"
    values={{chapters: analytics.chapters.length, lessons: analytics.totalLessons}}
  />
</span>
```
Chapter pills (old lines 220-221):
```tsx
<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium"><Trans message=":count lessons" values={{count: ch.lessonsCount}} /></span>
<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Trans message=":count learners" values={{count: ch.completedLearners}} /></span>
```
Keep all surrounding classes/keys byte-identical.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-analytics-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-analytics-page.tsx resources/client/dashboard/courses/course-analytics-page.test.tsx
git commit -m "feat(courses): translatable analytics hints and counts"
```

---

### Task 3: Builder mechanical sweep (layout, radius, a11y, loading)

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (mechanical edits + 2 imports)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `Spinner` from `@shadcn/spinner/spinner` (new import — path verified in committed `create-course-page.tsx:15`); `TriangleAlertIcon` (new lucide import — add to the existing lucide block after `Trash2Icon`, keeping alpha order).
- Produces: no behavior change except loading affordances.

- [ ] **Step 1: Write the failing test**

Append to `course-builder-page.test.tsx`:
```tsx
describe('builder rhythm and loading conventions', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('uses gap rhythm, token radii, and size utilities', () => {
    expect(source).not.toMatch(/space-y-\d/);
    expect(source).not.toContain('rounded-xl');
    expect(source).not.toContain('h-8 w-8');
    expect(source).toContain('rounded-card');
  });

  test('labels icon-only buttons and flags button icons', () => {
    expect(source).toContain('aria-label="Delete chapter"');
    expect(source).toContain('<EyeIcon data-icon="inline-start" />');
    expect(source).toContain('<SettingsIcon data-icon="inline-start" />');
  });

  test('saves show spinner state instead of label swapping', () => {
    expect(source).toContain('<Spinner data-icon="inline-start" />');
    expect(source).not.toContain("message={saving ? 'Saving...' : 'Save changes'}");
    expect(source).not.toContain("message={quizSaving ? 'Saving...' : 'Save quiz'}");
  });

  test('quiz errors use the filled destructive alert', () => {
    expect(source).toContain('fillStyle="subtleFill"');
    expect(source).toContain('<TriangleAlertIcon />');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL on all four blocks.

- [ ] **Step 3a: Layout and radius conversions**

Apply this exact mapping everywhere in the file (enumerate every site with grep first; the known sites are lines 576, 828, 1955, 1967, 2001, 2035, 2042, 2086, 2092, 2102, 2193 — if grep finds more `space-y-*`/`rounded-xl` sites, convert those too with the same rule and list them in the report):
- `space-y-N [rest]` → `flex flex-col gap-N [rest]` (e.g. `<div className="space-y-3 p-3">` → `<div className="flex flex-col gap-3 p-3">`; `<Card.Content className="space-y-4 pt-0">` → `<Card.Content className="flex flex-col gap-4 pt-0">`; `<form onSubmit={...} className="space-y-6">` → `<form onSubmit={...} className="flex flex-col gap-6">`)
- `rounded-xl` → `rounded-card-xs` (true token equivalent: 12px)
- `h-8 w-8` (quiz option toggle, old line 2218) → `size-8`

- [ ] **Step 3b: A11y, icons, spinner saves, quiz alert**

1. Delete-chapter button: add `aria-label="Delete chapter"` (keep `size="icon-sm" variant="ghost"`, existing `Trash2Icon className="size-4"`).
2. `609: <EyeIcon />` → `<EyeIcon data-icon="inline-start" />`; `617: <SettingsIcon />` → `<SettingsIcon data-icon="inline-start" />`. Leave icon-only buttons (dropdown triggers etc.) untouched.
3. Lesson save (old lines 2340-2342):
```tsx
        <Button onClick={() => void save()} disabled={saving}>
          {saving && <Spinner data-icon="inline-start" />}
          <Trans message="Save changes" />
        </Button>
```
4. Quiz save (old lines 2288-2290):
```tsx
                  <Button type="submit" disabled={quizSaving}>
                    {quizSaving && <Spinner data-icon="inline-start" />}
                    <Trans message="Save quiz" />
                  </Button>
```
5. Quiz error alert (old lines ~2005-2015): `<Alert variant="destructive" className="mb-4">` → `<Alert variant="destructive" fillStyle="subtleFill" className="mb-4">` and insert `<TriangleAlertIcon />` as the first child (before `Alert.Title`), adding `TriangleAlertIcon` to the lucide import block after `Trash2Icon`.
6. Add `import {Spinner} from '@shadcn/spinner/spinner';` with the other `@shadcn` imports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS. (Pre-existing assertions like `'Add a published lesson'` are untouched by these edits.)

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "fix(courses): rhythm tokens, a11y labels, spinner saves"
```

---

### Task 4: Builder Trans strings

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (string-level edits only)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `Trans` with `values` (pattern verified in committed `product-create-wizard.tsx`: `<Trans message="Step :current of :total" values={{...}} />`).
- Produces: no behavior change.

- [ ] **Step 1: Write the failing test**

Append to `course-builder-page.test.tsx`:
```tsx
describe('builder copy is translatable', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('wraps bare labels through Trans', () => {
    expect(source).toContain('<Trans message="Analytics" />');
    expect(source).toContain('message="Chapter :id • Lesson editor"');
    expect(source).toContain('<Trans message="or" />');
    expect(source).toContain('message="Current: :name"');
    expect(source).toContain('<Trans message="View" />');
    expect(source).toContain('message="Error loading quiz"');
    expect(source).toContain('message=".mp4, .mov, .mpeg, or .webm"');
  });

  test('uses static messages with interpolation for dynamic titles', () => {
    expect(source).toContain('message="Choose a chapter for :name."');
    expect(source).toContain('message="Delete :name?"');
    expect(source).not.toContain('message={`Choose a chapter');
    expect(source).not.toContain('message={`Delete "');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL — bare strings and template messages present.

- [ ] **Step 3: Convert the strings**

Exact edits (anchors verbatim from current source):
1. Two bare `Analytics` texts (header Link button ~630 and dropdown item ~670 — `>Analytics<` with no Trans): wrap each as `<Trans message="Analytics" />`, preserving surrounding classes/props.
2. Editor label: `<p className="text-xs text-muted-foreground">Chapter {chapterId} • Lesson editor</p>` → `<p className="text-xs text-muted-foreground"><Trans message="Chapter :id • Lesson editor" values={{id: chapterId}} /></p>`.
3. Divider: `<span className="text-xs text-muted-foreground">or</span>` → `<span className="text-xs text-muted-foreground"><Trans message="or" /></span>`.
4. Video box (old lines 1845-1852): replace inner content with Trans parts, keeping the wrapper div, link href/target/underline classes, and `lesson.video` sourcing (behavior task owns the sourcing fix — Task 5):
```tsx
            {lesson.video && (
              <div className="rounded-card border bg-muted/20 p-3 text-xs">
                <Trans message="Current: :name" values={{name: lesson.video.name}} /> —{' '}
                <a href={lesson.video.url} target="_blank" className="underline">
                  <Trans message="View" />
                </a>
              </div>
            )}
```
5. mp4 hint: `description=".mp4, .mov, .mpeg, or .webm"` → `description={<Trans message=".mp4, .mov, .mpeg, or .webm" />}` (`description` accepts ReactNode — verified in committed `file-uploader.tsx:168`).
6. Quiz alert title: `<Alert.Title>Error loading quiz</Alert.Title>` → `<Alert.Title><Trans message="Error loading quiz" /></Alert.Title>`.
7. Move dialog description: `<Trans message={`Choose a chapter for "${lesson.title}".`} />` → `<Trans message="Choose a chapter for :name." values={{name: lesson.title}} />`.
8. Delete dialog title: `<Trans message={`Delete "${itemName}"?`} />` → `<Trans message="Delete :name?" values={{name: itemName}} />`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "feat(courses): translatable builder copy"
```

---

### Task 5: Lesson editor behavior (type switch, video box, dirty guard)

**Files:**
- Create: `resources/client/dashboard/courses/lesson-dirty.ts`
- Create: `resources/client/dashboard/courses/lesson-dirty.test.ts`
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (type-switch handler, video box, row-click guard, discard dialog, snapshot wiring)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `AlertDialog` (already imported and used by delete dialogs in this file — mirror that structure); lesson/quiz state already in `LessonEditor`.
- Produces: `normalizeQuizForCompare`, `isLessonEditorDirty` (pure, exported, directly unit-tested).

- [ ] **Step 1: Write the failing tests**

Create `resources/client/dashboard/courses/lesson-dirty.test.ts`:
```ts
import {describe, expect, test} from 'vitest';
import {
  isLessonEditorDirty,
  normalizeQuizForCompare,
  type LessonEditorSnapshot,
} from './lesson-dirty';

const base: LessonDirtySnapshot = {
  title: 'Intro',
  status: 'draft',
  videoUrl: '',
  videoType: null,
  videoFileEntryId: null,
  content: 'hello',
  contentType: 'video',
  resourceIds: [1, 2],
  quizJson: null,
};

describe('normalizeQuizForCompare', () => {
  test('drops randomUUID keys before comparing', () => {
    const quiz = {
      require_pass_to_progress: false,
      passing_score: 70,
      questions: [{key: 'aaa', type: 'multiple_choice', question_text: 'Q?'}],
    };
    expect(normalizeQuizForCompare(quiz)).toBe(
      normalizeQuizForCompare({
        require_pass_to_progress: false,
        passing_score: 70,
        questions: [{key: 'zzz', type: 'multiple_choice', question_text: 'Q?'}],
      }),
    );
  });

  test('null and missing quizzes normalize to null', () => {
    expect(normalizeQuizForCompare(null)).toBeNull();
    expect(normalizeQuizForCompare(undefined)).toBeNull();
  });
});

describe('isLessonEditorDirty', () => {
  test('clean when identical', () => {
    expect(isLessonEditorDirty(base, {...base})).toBe(false);
  });

  test('flags field, resource, and quiz changes', () => {
    expect(isLessonEditorDirty({...base, title: 'Other'}, base)).toBe(true);
    expect(isLessonEditorDirty({...base, resourceIds: [2, 1]}, base)).toBe(true);
    expect(
      isLessonEditorDirty({...base, quizJson: '{"a":1}'}, base),
    ).toBe(true);
  });
});
```
Append to `course-builder-page.test.tsx`:
```tsx
describe('lesson editor preservation and guard', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('type switching preserves both sides for save to decide', () => {
    expect(source).not.toContain("setVideoUrl('')");
    expect(source).not.toContain('setVideoType(null)');
    expect(source).not.toContain('setVideoFileEntryId(null)');
  });

  test('video box reflects local editing state', () => {
    expect(source).toContain('Uploaded video attached');
    expect(source).not.toContain('{lesson.video && (');
  });

  test('lesson switching guards unsaved edits', () => {
    expect(source).toContain('pendingSwitch');
    expect(source).toContain('isLessonEditorDirty');
    expect(source).toContain('Discard unsaved changes?');
  });
});
```
Note: `setVideoUrl('')` / `setVideoType(null)` / `setVideoFileEntryId(null)` also appear in the lesson-sync effect and attach flows — the `not.toContain` assertions must target the type-switch handler specifically. Use anchored assertions instead:
```ts
    expect(source).not.toMatch(/setContentType\(next\);\s*if \(next === 'readable'\)/);
```
Replace the three `not.toContain` lines above with that single anchored assertion.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/courses/lesson-dirty.test.ts resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL — `lesson-dirty.ts` doesn't exist (import error), anchored switch assertion present.

- [ ] **Step 3a: Create the pure dirty module**

Create `resources/client/dashboard/courses/lesson-dirty.ts`:
```ts
export interface LessonDirtySnapshot {
  title: string;
  status: string;
  videoUrl: string;
  videoType: string | null;
  videoFileEntryId: number | null;
  content: string;
  contentType: string;
  resourceIds: number[];
  quizJson: string | null;
}

export function normalizeQuizForCompare(quiz: unknown): string | null {
  if (!quiz || typeof quiz !== 'object') return null;
  return JSON.stringify(quiz, (key, value) =>
    key === 'key' ? undefined : value,
  );
}

export function isLessonEditorDirty(
  current: LessonDirtySnapshot,
  original: LessonDirtySnapshot,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(original);
}
```
(Key order is construction-stable on both sides since both literals list fields in the same order.)

- [ ] **Step 3b: Stop clearing video fields on type switch**

Replace the Select `onValueChange` (old lines 1764-1772):
```tsx
          onValueChange={value => {
            const next = value as 'video' | 'readable';
            setContentType(next);
            if (next === 'readable') {
              setVideoUrl('');
              setVideoType(null);
              setVideoFileEntryId(null);
            }
          }}
```
with:
```tsx
          onValueChange={value => {
            setContentType(value as 'video' | 'readable');
          }}
```
Keep the preservation note below it untouched. `save()` already nulls the inactive side (verified lines 1487-1505), so payloads are unchanged.

- [ ] **Step 3c: Derive the video box from local state**

Replace the video box (old lines 1845-1852) with:
```tsx
            {(videoUrl || videoFileEntryId) && (
              <div className="rounded-card border bg-muted/20 p-3 text-xs">
                {videoUrl ? (
                  <span className="block truncate">
                    <Trans message="Current: :name" values={{name: videoUrl}} /> —{' '}
                    <a
                      href={videoUrl}
                      target="_blank"
                      className="underline"
                    >
                      <Trans message="View" />
                    </a>
                  </span>
                ) : (
                  <Trans message="Uploaded video attached" />
                )}
              </div>
            )}
```
(`videoUrl`, `videoFileEntryId` are already in scope; wrapper classes preserved.)

- [ ] **Step 3d: Dirty guard on lesson switch**

1. Import the helpers: `import {isLessonEditorDirty, normalizeQuizForCompare, type LessonDirtySnapshot} from './lesson-dirty';` (place with the relative imports of the file — check the existing relative-import block and match its style).
2. Inside `LessonEditor`, add snapshot refs + builder + checker (place after the state declarations, before `save`):
```tsx
  const lessonSnapshotRef = React.useRef<string | null>(null);
  const quizSnapshotRef = React.useRef<string | null>(null);
```
Check the React import style in this file first (`import {...} from 'react'` named hooks are already used: `useState`, `useEffect` — so use the bare `useRef` name, matching file convention; do NOT introduce `React.` prefix).
Snapshot capture — extend the existing lesson-sync effect (the one resetting title/status/video/content/resources/quiz on `lesson` change, old lines 1439+) by appending, still inside that effect after the quiz fetch block:
```tsx
    lessonSnapshotRef.current = JSON.stringify({
      title: lesson.title,
      status: lesson.status,
      videoUrl: lesson.video_url ?? '',
      videoType: lesson.video_type ?? null,
      videoFileEntryId: lesson.video_file_entry_id ?? null,
      content: lesson.content ?? '',
      contentType: lesson.content_type ?? 'video',
      resourceIds: (lesson.resources ?? []).map(resource => resource.id),
      quizJson: null,
    } satisfies LessonDirtySnapshot);
```
Verify the exact field names on the `Lesson` type before writing (`video_url`, `video_type`, `video_file_entry_id`, `content`, `content_type`, `resources[].id` — all observed in the sync effect lines 1440-1447; `resources` entries need an `id` field — confirm via the Lesson type, and if the field differs, use the real one).
Quiz snapshot: in the quiz-load `.then` (after `setQuiz(...)`), add `quizSnapshotRef.current = normalizeQuizForCompare(data ?? null);` and in the `.catch`, add `quizSnapshotRef.current = null;`. In `save()` success path (after `toast.positive('Lesson saved')`), refresh the lesson snapshot from current state; in `saveQuiz()` success path, set `quizSnapshotRef.current = normalizeQuizForCompare(quiz)`.
Checker:
```tsx
  const hasUnsavedChanges = () => {
    const current: LessonDirtySnapshot = {
      title,
      status,
      videoUrl,
      videoType,
      videoFileEntryId,
      content,
      contentType,
      resourceIds: resources.map(resource => resource.id),
      quizJson: normalizeQuizForCompare(quiz),
    };
    const original = lessonSnapshotRef.current;
    if (original === null) return false;
    return (
      isLessonEditorDirty(current, JSON.parse(original) as LessonDirtySnapshot) ||
      normalizeQuizForCompare(quiz) !== quizSnapshotRef.current
    );
  };
```
Wait — cleaner: store the lesson snapshot as the object (not string) and compare field-wise via the helper on both parts. Restructure to keep it simple and exactly testable:
```tsx
  const lessonSnapshotRef = React.useRef<LessonDirtySnapshot | null>(null);
  ...
  const hasUnsavedChanges = () => {
    const baseline = lessonSnapshotRef.current;
    if (baseline === null) return false;
    return isLessonEditorDirty(
      {
        title, status, videoUrl, videoType, videoFileEntryId,
        content, contentType,
        resourceIds: resources.map(resource => resource.id),
        quizJson: normalizeQuizForCompare(quiz),
      },
      {...baseline, quizJson: quizSnapshotRef.current},
    );
  };
```
with `lessonSnapshotRef.current = {title, status, ... quizJson: null}` shape (quiz tracked separately in quizSnapshotRef). Set quizSnapshotRef on load/success as above. This keeps one helper, one comparison, both refs.
3. Row click (old lines 953-960): replace direct switch with guarded switch. Add `const [pendingSwitch, setPendingSwitch] = useState<{lesson: Lesson; chapterId: number} | null>(null);` near other dialog state, plus:
```tsx
  const switchToLesson = (nextLesson: Lesson, nextChapterId: number) => {
    setSelectedLesson(nextLesson);
    setSelectedChapterId(nextChapterId);
    setMobileSurface('editor');
    setPendingSwitch(null);
  };
```
Row button becomes:
```tsx
                                            <button
                                              className="flex-1 truncate text-left font-medium"
                                              onClick={() => {
                                                if (hasUnsavedChanges()) {
                                                  setPendingSwitch({
                                                    lesson,
                                                    chapterId: chapter.id,
                                                  });
                                                  return;
                                                }
                                                switchToLesson(lesson, chapter.id);
                                              }}
                                            >
```
4. Discard dialog — mirror the delete-dialog `AlertDialog` structure, placed next to the other dialogs (find `DeleteQuiz`/`deleteQuizOpen` dialog region and follow it):
```tsx
      <AlertDialog.Root
        open={pendingSwitch !== null}
        onOpenChange={open => {
          if (!open) setPendingSwitch(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Discard unsaved changes?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Switching lessons will discard your unsaved edits to this lesson." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>
                <Trans message="Keep editing" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => {
                  if (pendingSwitch) {
                    switchToLesson(
                      pendingSwitch.lesson,
                      pendingSwitch.chapterId,
                    );
                  }
                }}
              >
                <Trans message="Discard" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
```
Verify `AlertDialog.Action` accepts `onClick` without `color` (the delete usage passes `color="danger"` + `onClick={deleteQuiz}` — same shape minus color ✓).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/courses/lesson-dirty.test.ts resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS — real unit tests for the helpers plus all source assertions. Then run the FULL suite: `npx vitest run`.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx resources/client/dashboard/courses/lesson-dirty.ts resources/client/dashboard/courses/lesson-dirty.test.ts
git commit -m "feat(courses): preserve type-switch input, live video box, dirty guard"
```

---

### Task 6: Verification pass (tokens, lint, tests, manual QA)

**Files:** none (fix-only; commit only if a fix is required).

- [ ] **Step 1: Token audit with pre-existing baseline**

Run:
```bash
grep -En "#[0-9a-fA-F]{3,8}|rounded-\[|shadow-\[|bg-(blue|gray|white|black)-|dark:" resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-analytics-page.tsx resources/client/dashboard/courses/lesson-dirty.ts || true
```
For every hit, confirm it is byte-identical on `main` (`git show main:<path> | grep -F '<hit>'`). Any hit NOT present on main is a regression from this phase — fix it before proceeding. (Known pre-existing: `dark:prose-invert` in the TipTap editor, `dark:` tones being removed by Task 1.)

- [ ] **Step 2: Lint touched files**

Run: `npx oxlint resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-analytics-page.tsx resources/client/dashboard/courses/lesson-dirty.ts resources/client/dashboard/courses/lesson-dirty.test.ts resources/client/dashboard/courses/course-builder-page.test.tsx resources/client/dashboard/courses/course-analytics-page.test.tsx`
Expected: zero errors on touched lines (pre-existing errors on untouched lines must be shown byte-identical on `main`, same method as Step 1).

- [ ] **Step 3: Run the full client test suite**

Run: `npx vitest run`
Expected: all suites PASS.

- [ ] **Step 4: Manual QA checklist (report results in chat, fix issues as new commits)**

  - Analytics page: no visual change except theme-correct warning tones; hints/counts read naturally.
  - Builder: no visual change except spinner saves, labelled buttons, translated copy.
  - Type switch video→readable→video preserves the typed URL/upload; save payloads unchanged (verify via network tab).
  - Video box shows typed URL live, uploaded file after attach, hides when cleared.
  - Lesson switch with dirty title/quiz prompts discard dialog; Keep editing preserves state; Discard switches.
  - Quiz create → save → switch lesson → back: no stale discard prompt (snapshots refresh).

- [ ] **Step 5: Commit only if fixes were needed**

```bash
git add -A
git commit -m "fix(courses): address verification findings on builder consistency"
```

Skip this step entirely when the verification pass is clean.
