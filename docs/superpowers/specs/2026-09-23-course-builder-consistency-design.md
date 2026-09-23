# Phase D — Builder Consistency + Lesson Editor Behavior: Design Spec

**Date:** 2026-09-23
**Branch:** `feat/course-builder-consistency` (off `main`)
**Scope:** `course-builder-page.tsx` (lesson editor, header actions, quiz alert), `course-analytics-page.tsx` (tokens, i18n)
**Parent research:** course UI/UX workstream kickoff (4-agent review, 2026-09-23); builds on Phases A–C (merged)
**Constraints:** shadcn reusable primitives only; core UI rhythm + theme tokens; zero inline custom styling; no API changes.

---

## 1. Problem Statement

The course builder works but diverges from app conventions and has three behavioral defects deferred from Phase B:

1. Token literals (`bg-amber-500/10`, `rounded-xl`), `space-y-*` layouts, and `h-8 w-8` sizing instead of theme tokens and rhythm utilities.
2. Untranslated or unextractable strings (bare labels, dynamic `Trans` templates) and a fill-less quiz alert.
3. Missing a11y labels, missing `data-icon` on button icons, and save buttons that swap labels instead of using `Spinner + disabled`.
4. Switching lesson type to readable destroys unsaved video input even though `save()` already nulls the inactive side.
5. The "current video" box reads the stale `lesson.video` prop instead of local editing state.
6. Switching lessons with unsaved lesson/quiz edits silently drops them.

## 2. Design

### S1 — Token/layout sweep (mechanical, no visual redesign)
- Analytics amber tones → status tokens (`course-analytics-page.tsx:222,268,315`, indicator + text).
- `rounded-xl` → `rounded-card*` (analytics 101-106/144/185, builder 750/2024/2476).
- `space-y-*` → `flex flex-col gap-*` (analytics 99/177, builder ~10 sites).
- `h-8 w-8` → `size-8` (builder 2140).

### S2 — i18n sweep
- Wrap bare strings: `Analytics` (630/670), `Chapter {id} • Lesson editor` (1662), `or` (1751), `Current:/View` (1769-1771), `Error loading quiz` (1931), mp4 hint (as `<Trans>` in the `description` prop), `1200x514` hint.
- Dynamic templates (1202, 2863) become static message + `values` interpolation.
- Quiz alert gains `fillStyle="subtleFill"` + icon per the digital pattern.

### S3 — A11y/loading/icon conventions
- `aria-label="Delete chapter"` on the delete-chapter icon button (821-827).
- `data-icon="inline-start"` on bare button icons (609/617/792/909/826).
- Quiz save buttons (2262/2210) use `Spinner + disabled` instead of Trans label swap.

### S4 — Lesson editor behavior
- *Type switch:* remove the video-field clearing on switch-to-readable (lines 1767-1771); `save()` already nulls the inactive side, so switching preserves unsaved input on both sides. Keep the preservation note copy.
- *Video box:* derive from local state — URL row for typed URLs (truncated URL + View link), "Uploaded video attached" row for uploads, hidden when neither — instead of the stale `lesson.video` prop.
- *Dirty guard:* compare lesson fields + quiz state against the loaded `lesson` prop via an extracted pure helper; switching lessons with unsaved edits surfaces the discard-confirmation pattern (keep editing / discard).

## 3. File Mapping

| File | Change |
|---|---|
| `resources/client/dashboard/courses/course-builder-page.tsx` | S1–S4 |
| `resources/client/dashboard/courses/course-analytics-page.tsx` | S1–S2 |
| `resources/client/dashboard/courses/course-builder-page.test.tsx` | updated/pinned assertions |
| `resources/client/dashboard/courses/course-analytics-page.test.tsx` | updated/pinned assertions |

## 4. Risk Mitigation

- No API changes; `save()`/`saveQuiz()` payloads byte-identical.
- Type-switch change strictly reduces data loss (clearing code removed, nothing added to the payload path).
- Dirty guard reuses the existing discard-confirmation UI pattern; no new components.
- Analytics changes are class/string-level only.

## 5. Acceptance Criteria

- [ ] Zero token literals / `space-y-*` / non-`size-*` pairs in touched areas
- [ ] All user strings through `Trans` with extractable static messages
- [ ] Icon buttons labelled; button icons flagged; saves use `Spinner + disabled`
- [ ] Type switching preserves both sides; video box reflects local edits
- [ ] Unsaved lesson/quiz edits trigger discard-confirmation on lesson switch
- [ ] `vitest` suite green, `tsc` + `oxlint` clean
