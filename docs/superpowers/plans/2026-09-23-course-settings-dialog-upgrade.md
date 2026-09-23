# Phase C: Settings Dialog Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the course settings dialog to parity with the digital-product form: ETB price input with legacy-currency guard, rich-text description, shared `CroppedCover`, and outcomes-aware dirty tracking.

**Architecture:** All edits stay inside `CourseSettingsContent`, `CourseSettingsDialog`, and module scope of `course-builder-page.tsx`. No API changes (the PUT body already sends every field touched). No new dependencies. The bespoke `CoverImageDropzone` is deleted in favor of shared production code.

**Tech Stack:** React 19, Tailwind v4, Base UI, shadcn `base-luma`, TipTap, react-router, vitest, oxlint.

**Spec:** `docs/superpowers/specs/2026-09-23-course-settings-dialog-upgrade-design.md`

## Global Constraints

- Semantic tokens only: no hex, no `rgb()`/`oklch()` inline, no Tailwind color literals, no arbitrary radius/shadow. Radius via `rounded-card*` / `rounded-input` / `rounded-button` only.
- Spacing via `gap-*`; never `space-x-*` / `space-y-*`. Equal sizes via `size-*`.
- Reuse `@shadcn/*` primitives; lucide icons with `data-icon="inline-start|inline-end"` inside buttons.
- Static UI strings via `<Trans message="..." />`. Runtime toast/server messages stay string literals — identical to the existing `toast.*` calls in this file.
- No `dark:` overrides on new UI. No API changes. No new dependencies.
- `npm test` = `vitest run`. Lint touched files with `npx oxlint <paths>`.

---

### Task 1: ETB price input with currency-convert guard

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (import block, price `Field.Root`, dialog state, sync effect, `reset()`, `save()` gate)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `InputGroup/InputGroupAddon/InputGroupInput/InputGroupText` (new import, block copied verbatim below); `Checkbox` (already imported, line 26); `course.product.currency` (exists on the type); `toast` (already imported).
- Produces: `convertToEtb` dialog state consumed by the price field (checkbox) and `save()` (gate).

- [ ] **Step 1: Write the failing test**

Append to `course-builder-page.test.tsx`:
```tsx
describe('course settings price', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('uses the ETB input group with a legacy-currency convert guard', () => {
    expect(source).toContain("from '@shadcn/forms/input-group/input-group'");
    expect(source).toContain('<InputGroupText>ETB</InputGroupText>');
    expect(source).toContain('Convert this product price to ETB');
    expect(source).toContain('convertToEtb');
    expect(source).toContain('Enter the correct ETB price and confirm the currency conversion before saving.');
  });
});
```
(Verify `fs`/`path` imports exist in that test file first — other describes in it already use `fs.readFileSync(path.resolve(...))`, so they do.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL on all five assertions.

- [ ] **Step 3a: Add the import**

After the `Input` import (line 25), insert:
```tsx
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
```

- [ ] **Step 3b: Replace the price field**

Replace the price `Field.Root` block (old lines 2585-2596):
```tsx
      <Field.Root>
        <Field.Label>
          <Trans message="Price (ETB)" />
        </Field.Label>
        <Input
          value={price}
          onChange={e => setPrice(e.target.value)}
          type="number"
          min="0"
          step="0.01"
        />
      </Field.Root>
```
with:
```tsx
      <Field.Root>
        <Field.Label htmlFor={`${inputId}-price`}>
          <Trans message="Price (ETB)" />
        </Field.Label>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>ETB</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id={`${inputId}-price`}
            value={price}
            onChange={e => setPrice(e.target.value)}
            type="number"
            min="0"
            step="0.01"
          />
        </InputGroup>
        {legacyCurrency.toLowerCase() !== 'etb' && (
          <label className="mt-2 flex items-start gap-3 rounded-card-sm border border-border bg-muted/30 p-3 text-sm">
            <Checkbox
              checked={convertToEtb}
              onCheckedChange={value => setConvertToEtb(value === true)}
            />
            <span>
              <span className="block font-medium">
                <Trans message="Convert this product price to ETB" />
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                <Trans message="Set the correct Ethiopian birr amount above. Existing sales remain in their original currency." />
              </span>
            </span>
          </label>
        )}
      </Field.Root>
```
Keep the label text `Price (ETB)` byte-identical.

- [ ] **Step 3c: Wire dialog state, sync, reset, and the save gate**

`CourseSettingsContent` props: add `legacyCurrency: string; convertToEtb: boolean; setConvertToEtb: (value: boolean) => void;` to both the props type and destructuring. In `CourseSettingsDialog`: add `const [convertToEtb, setConvertToEtb] = useState(false);` next to the other dialog state; add `setConvertToEtb(false);` to the file-sync `useEffect` (after `setPrice(...)`) and to `reset()`; pass all three through `contentProps`. In `save()`, immediately after `if (saving) return;`, insert:
```tsx
    if (course.product.currency.toLowerCase() !== 'etb' && !convertToEtb) {
      toast.danger(
        'Enter the correct ETB price and confirm the currency conversion before saving.',
      );
      return;
    }
```
(`course` is non-null here — `save` already dereferences `course.id` unconditionally.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "feat(courses): ETB price input with currency convert guard"
```

---

### Task 2: Rich-text description editor

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (description `Field.Root`, new module component)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `articleEditorTipTapExtensions`, `TipTapEditorProvider`, `TiptapEditorContent`, `FormatDropdown`, `Divider`, `FontStyleButtons`, `ListButtons`, `LinkButton`, `ClearFormatButton` — all already imported at the top of this file (lines 1-11), no new imports.
- Produces: `CourseSettingsDescriptionEditor` (module scope, same API shape as the digital form's editor: `{value: string; onChange: (value: string) => void}`).

- [ ] **Step 1: Write the failing test**

Append to `course-builder-page.test.tsx`:
```tsx
describe('course settings description', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('edits the description in rich text', () => {
    expect(source).toContain('CourseSettingsDescriptionEditor');
    expect(source).toContain('TipTapEditorProvider');
    expect(source).toContain('TiptapEditorContent');
    expect(source).not.toContain('maxLength={20000}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL — no editor component, `maxLength={20000}` still present.

- [ ] **Step 3a: Swap the description field**

Replace the description `Field.Root` block (old lines 2524-2535):
```tsx
      <Field.Root>
        <Field.Label htmlFor={`${inputId}-description`}>
          <Trans message="Description" />
        </Field.Label>
        <Input
          id={`${inputId}-description`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What will students learn?"
          maxLength={20000}
        />
      </Field.Root>
```
with:
```tsx
      <Field.Root>
        <Field.Label htmlFor={`${inputId}-description`}>
          <Trans message="Description" />
        </Field.Label>
        <CourseSettingsDescriptionEditor
          value={description}
          onChange={setDescription}
        />
      </Field.Root>
```
Keep the label text `Description` byte-identical. (The placeholder disappears with the plain input — intended; the editor is self-explanatory like the digital form's.)

- [ ] **Step 3b: Add the module-level editor**

Append near `CourseSettingsContent` (module scope, after that component's closing):
```tsx
function CourseSettingsDescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TipTapEditorProvider
      extensions={articleEditorTipTapExtensions}
      initialContent={value}
      onChange={onChange}
    >
      <div className="overflow-hidden rounded-card-sm border border-border">
        <div className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1 text-muted-foreground">
          <FormatDropdown />
          <Divider />
          <FontStyleButtons />
          <Divider />
          <ListButtons />
          <Divider />
          <LinkButton />
          <Divider />
          <ClearFormatButton />
        </div>
        <TiptapEditorContent className="prose prose-sm min-h-[180px] max-w-none px-3 py-2.5 dark:prose-invert" />
      </div>
    </TipTapEditorProvider>
  );
}
```
This mirrors the digital form's editor verbatim, including its `initialContent` semantics.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "feat(courses): rich-text course description editor"
```

---

### Task 3: Shared CroppedCover replaces the bespoke dropzone

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (cover `Field.Root`, delete `CoverImageDropzone`, clean 4 imports)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `CroppedCover` from `@common/uploads/components/cropped-image-selector` (new import — path verified in committed `digital-product-form-page.tsx:12`); `setCoverUrl`, `setCoverFileId` (already props of the content component).
- Produces: nothing downstream. `onChange(url, entry)` contextual typing provides `entry?.id` with no extra type import.

- [ ] **Step 1: Write the failing test**

Append to `course-builder-page.test.tsx`:
```tsx
describe('course settings cover', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('reuses the shared cropped cover uploader', () => {
    expect(source).toContain(
      "import {CroppedCover} from '@common/uploads/components/cropped-image-selector'",
    );
    expect(source).toContain('<CroppedCover');
    expect(source).toContain('uploadType="linkImages"');
    expect(source).toContain('aspect={16 / 9}');
    expect(source).not.toContain('CoverImageDropzone');
    expect(source).not.toContain('FileDropzone');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL — `CroppedCover` absent, `CoverImageDropzone`/`FileDropzone` present.

- [ ] **Step 3a: Swap the cover field**

Replace the cover `Field.Root` block (old lines 2550-2583, from `<Field.Root>` after the outcomes block through its closing `</Field.Root>`) with:
```tsx
      <Field.Root>
        <Field.Label>
          <Trans message="Cover Image" />
        </Field.Label>
        <CroppedCover
          value={coverUrl}
          onChange={(url, entry) => {
            setCoverUrl(url);
            setCoverFileId(entry?.id ?? null);
          }}
          uploadType="linkImages"
          aspect={16 / 9}
        />
        <Field.Description>
          <Trans message="Recommended size: 1200x514px • Max size: 5MB" />
        </Field.Description>
      </Field.Root>
```
Keep the `Cover Image` label and the hint copy byte-identical (the hint moves from a raw `<p>` into `Field.Description`).

- [ ] **Step 3b: Delete the bespoke dropzone and orphaned imports**

Delete the entire `CoverImageDropzone` function (old lines 2973 through its closing). Remove exactly these imports, verified orphaned (each had exactly 2 hits: import + dropzone use):
- line 38 `import {FileDropzone} from '@common/ui/file-dropzone';`
- line 14 `import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';`
- line 43 `import {ProductCover} from '@ui/product-cover';`
- lines 52-57, the `ImageCrop/ImageCropApply/ImageCropContent/ImageCropReset` block from `@shadcn/image-crop/image-crop`
Add:
```tsx
import {CroppedCover} from '@common/uploads/components/cropped-image-selector';
```
If `tsc`/`oxlint` flags any other newly-unused import after the deletion, remove that import too (and only that).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "feat(courses): shared cropped cover in settings"
```

---

### Task 4: Outcomes-aware dirty tracking

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (`isDirty` computation only)
- Test: `resources/client/dashboard/courses/course-builder-page.test.tsx` (append)

**Interfaces:**
- Consumes: `learningOutcomes: {id: string; text: string}[]` state, `course.product.learning_outcomes: string[] | undefined` (ids are regenerated randomUUIDs on every reset — hence text comparison, never id comparison).
- Produces: `hasOutcomeChanges` boolean folded into the existing `isDirty` (name and discard flow untouched).

- [ ] **Step 1: Write the failing test**

Append to `course-builder-page.test.tsx`:
```tsx
describe('course settings outcomes dirty tracking', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('outcome edits participate in the discard guard', () => {
    expect(source).toContain('hasOutcomeChanges');
    expect(source).toContain('learning_outcomes ?? []');
    expect(source).toContain('item.text !== savedOutcomes[index]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: FAIL — none of the strings present.

- [ ] **Step 3: Compare outcome texts in isDirty**

Immediately before the `isDirty` declaration (old line 2743), insert:
```tsx
  const savedOutcomes = course.product.learning_outcomes ?? [];
  const hasOutcomeChanges =
    learningOutcomes.length !== savedOutcomes.length ||
    learningOutcomes.some((item, index) => item.text !== savedOutcomes[index]);
```
and extend `isDirty` with `|| hasOutcomeChanges` (keep the existing comparisons and the `const isDirty =` name byte-identical — a test pins it).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx
git commit -m "fix(courses): include outcomes in settings dirty tracking"
```

---

### Task 5: Verification pass (tokens, lint, tests, manual QA)

**Files:** none (fix-only; commit only if a fix is required).

- [ ] **Step 1: Token audit with pre-existing baseline**

The builder file has known pre-existing violations (amber literals, `rounded-xl`, `space-y-*` outside this phase's touch areas). Run:
```bash
grep -En "#[0-9a-fA-F]{3,8}|rounded-\[|shadow-\[|bg-(blue|gray|white|black)-|dark:" resources/client/dashboard/courses/course-builder-page.tsx || true
```
For every hit, confirm it is byte-identical on `main` (`git show main:<path> | grep -F '<hit>'`). Any hit NOT present on main is a regression from this phase — fix it before proceeding.

- [ ] **Step 2: Lint touched files**

Run: `npx oxlint resources/client/dashboard/courses/course-builder-page.tsx resources/client/dashboard/courses/course-builder-page.test.tsx`
Expected: zero errors on touched lines (pre-existing errors on untouched lines must be shown byte-identical on `main`, same method as Step 1).

- [ ] **Step 3: Run the full client test suite**

Run: `npx vitest run`
Expected: all suites PASS.

- [ ] **Step 4: Manual QA checklist (report results in chat, fix issues as new commits)**

  - Open Configure on a course: title, rich-text description, cover, ETB price, outcomes, placement, sequential switch all render.
  - Non-ETB product: convert checkbox appears; save blocked with toast until confirmed; confirmed save persists ETB price.
  - Replace/remove/upload cover through `CroppedCover`; crop dialog opens with 16:9 aspect.
  - Edit outcomes only → close attempts trigger the discard dialog; untouched dialog closes silently.
  - Save persists all fields; failure leaves the dialog open with an error toast.

- [ ] **Step 5: Commit only if fixes were needed**

```bash
git add -A
git commit -m "fix(courses): address verification findings on settings upgrade"
```

Skip this step entirely when the verification pass is clean.
