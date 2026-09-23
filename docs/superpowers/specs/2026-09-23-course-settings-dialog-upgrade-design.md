# Phase C — Settings Dialog Upgrade: Design Spec

**Date:** 2026-09-23
**Branch:** `feat/course-settings-dialog-upgrade` (off `main`)
**Scope:** `CourseSettingsDialog` + `CourseSettingsContent` in `course-builder-page.tsx` (lines ~2410–2850)
**Parent research:** course UI/UX workstream kickoff (4-agent review, 2026-09-23); builds on Phases A–B (merged)
**Constraints:** shadcn reusable primitives only; core UI rhythm + theme tokens; zero inline custom styling; no API changes (the PUT body already sends title, description, learning_outcomes, price_cents, cover_file_entry_id, require_sequential_completion, biolink_ids).

---

## 1. Problem Statement

The course settings dialog (the sole editor for title/price/cover after creation) is downgraded versus the digital-product form:

1. Price is a bare number input — no ETB prefix, no legacy-currency conversion guard.
2. Description is a single-line `Input maxLength={20000}` — no rich text.
3. Cover uses a bespoke ~80-line `CoverImageDropzone` (own dropzone + duplicate crop dialog) instead of the shared `CroppedCover`.
4. `isDirty` ignores learning outcomes, so outcome edits bypass the discard-confirmation dialog.

## 2. Design

### S1 — Price: ETB InputGroup + currency-convert guard
- Replace the bare number `Input` with `InputGroup` + `ETB` prefix (digital-form pattern).
- Add `convertToEtb` dialog state; when `course.product.currency` is not ETB, show the convert checkbox and block save with `toast.danger` until confirmed (dialogs use toasts per this file's convention).

### S2 — Description: rich text
- Replace the single-line `Input` with a TipTap editor built on this file's existing imports (`articleEditorTipTapExtensions`, `TipTapEditorProvider`, menubar buttons, `TiptapEditorContent`) — same stack as the digital description editor. Label/id wiring mirrored as-is.

### S3 — Cover: shared `CroppedCover`
- Delete `CoverImageDropzone` plus the hand-rolled preview/`Remove cover` block; render `<CroppedCover value onChange uploadType="linkImages" aspect={16/9} />` (hover Replace/Remove, real progress, shared crop dialog built in).
- Keep the `Cover Image` label text and the recommended-size hint verbatim. Remove orphaned imports (`FileDropzone`, plus `useActiveUpload` only if unused elsewhere in the file — verify at implementation).

### S4 — Dirty tracking includes outcomes
- Compare outcome texts (ids are regenerated randomUUIDs on every reset, so id comparison would false-positive): length plus element-wise equality against `course.product.learning_outcomes ?? []`.

### S5 — Tests
- Extend `course-builder-page.test.tsx`: `CroppedCover` usage + absence of `CoverImageDropzone`, TipTap editor presence, convert-guard strings, outcomes comparison inside `isDirty`. Source-assertion style, no new infra.

## 3. File Mapping

| File | Change |
|---|---|
| `resources/client/dashboard/courses/course-builder-page.tsx` | S1–S4 (settings content + dialog only) |
| `resources/client/dashboard/courses/course-builder-page.test.tsx` | S5 assertions |

## 4. Risk Mitigation

- PUT body unchanged — backend contract untouched.
- Existing tests pin `Cover Image`, `Course Name`, and `const isDirty =` — all preserved verbatim.
- `CroppedCover` is shared production code already used by the digital form and creator profile.
- No structural changes to the builder monolith.

## 5. Acceptance Criteria

- [ ] Price shows ETB prefix; non-ETB products require convert confirmation before save
- [ ] Description edits in rich text and persist through save
- [ ] Cover replace/remove/upload flows work through `CroppedCover`; no `CoverImageDropzone` remains
- [ ] Outcome edits trigger the discard dialog; unchanged outcomes do not
- [ ] `vitest` suite green, `tsc` + `oxlint` clean, semantic tokens only
