# Phase B — Course Flow-Confusion Fixes: Design Spec

**Date:** 2026-09-23
**Branch:** `feat/course-flow-confusion-fixes` (off `main`)
**Scope:** course creation handoff, builder submit/resubmit guidance, uncertain-creation retry, chapter rename feedback, lesson move position
**Parent research:** course UI/UX workstream kickoff (4-agent review, 2026-09-23); builds on Phase A (entry alignment, merged)
**Constraints:** shadcn reusable primitives only; core UI rhythm + theme tokens; zero inline custom styling; no API changes.

---

## 1. Problem Statement

After Phase A aligned the entry flow, these confusion points remain (all observed in the research review):

1. The pre-filled price on the course page has no provenance — the second screen still feels like a repeated question.
2. `my-products/:id/edit` silently bounces courses into the builder with no explanation.
3. The builder Submit button silently relabels/disables without guidance; approved products leave no resubmit path.
4. On uncertain creation, the primary button disables and recovery depends on noticing a side link.
5. Chapter rename saves silently on blur with no feedback; `moveLesson` always prepends (`position: 0`) regardless of intent.

Deferred to Phase D (needs deeper builder surgery): lesson-type payload switching, dual-save dirty guard, stale video box.

## 2. Design

### S1 — Handoff context line
- Below the create-course header, a muted line stating provenance:
  - paid: `"From previous step: Paid · ETB :price — you can change it here."`
  - free: `"From previous step: Free."`
- Static `Trans` with values; no new components. Shown only when the values came from wizard params (billing param present); direct visits show nothing extra.

### S2 — Explained edit-redirect
- The `:productId/edit` course redirect appends `?notice=moved-to-builder`.
- The builder reads the param on mount: if present, renders a dismissible info `Alert` ("Course details live in the course builder…") and cleans the param from the URL (replace navigation, no history entry).
- No new routes; param is transient UI state only.

### S3 — Submit guidance + resubmit path
- Submit disabled for lack of a published lesson: keep the disabled state but add an inline hint under the button ("Publish at least one lesson to submit for review") plus a `Tooltip` on the button explaining the requirement. No silent relabel.
- Approved (`canSubmit` false): render status text next to the disabled button explaining the product is live and that edits return it to draft.

### S4 — Uncertain-creation retry
- Keep the "Check My Products" secondary link; stop disabling the primary submit when `creationUncertain` so retry is a single click.
- Copy unchanged otherwise.

### S5 — Rename feedback + move position
- Chapter rename: optimistic title update on blur + error toast + revert on failure (replacing silent blur-save). Enter-to-blur behavior unchanged.
- `moveLesson`: insert at the intended position instead of hardcoded `position: 0`. Exact index math resolved at implementation time against the chapter/lesson list code; behavior covered by a unit test on the position helper (extracted pure function if not already isolated).

## 3. File Mapping

| File | Change |
|---|---|
| `resources/client/dashboard/courses/create-course-page.tsx` | S1 context line |
| `resources/client/dashboard/digital-products/digital-product-form-page.tsx` | S2 redirect appends notice param (course branch only) |
| `resources/client/dashboard/courses/course-builder-page.tsx` | S2 notice Alert + param cleanup; S3 submit hint/Tooltip + approved status text; S5 rename feedback + move position |
| `resources/client/dashboard/courses/create-course-page.test.tsx` | S1 assertions |
| `resources/client/dashboard/courses/course-builder-page.test.tsx` | S2/S3/S5 assertions |

## 4. Risk Mitigation

- No API changes; no new routes; no new dependencies.
- `course-builder-page.tsx` is a ~3,000-line monolith: all edits are localized to the header/submit/rename/move areas named above; no structural split in this phase.
- Toast usage follows the existing `toast.danger` pattern already in the codebase.

## 5. Acceptance Criteria

- [ ] Wizard-originated course pages show the provenance line; direct visits do not
- [ ] Edit-URL bounce shows a one-time dismissible explanation, param cleaned
- [ ] Disabled submit explains itself (hint + tooltip); approved state explains resubmit semantics
- [ ] Uncertain creation allows direct retry
- [ ] Rename shows success/error feedback; move inserts at intended position (unit-tested)
- [ ] `vitest` suite green, `tsc` + `oxlint` clean, semantic tokens only
