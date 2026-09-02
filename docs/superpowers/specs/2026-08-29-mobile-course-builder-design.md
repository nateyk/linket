# Mobile Course Builder Design

## Goal

Make the course builder fast, clear, and reliable on phone-sized screens without regressing the existing desktop split-pane workflow. Complete the previously deferred course-builder and cover-preview follow-ups in the same focused delivery.

## Audit Findings

- The current phone layout displays curriculum and editor as vertically stacked panes. The curriculum is capped at `50vh`, creating competing scroll areas and leaving too little room for editing.
- Chapter and lesson ordering uses native HTML drag events. This is not a dependable touch interaction, so it cannot be the primary phone reordering mechanism.
- The header renders four secondary actions and the primary publish action in one row, which crowds narrow viewports.
- The course settings form uses a centered dialog. The installed Base UI Drawer provides the appropriate swipeable, safe-area-aware mobile surface.
- Image crop dialogs combine fixed minimum crop heights with dialog padding and can overflow short phone viewports.
- Deletion uses `window.confirm`, rather than the installed accessible AlertDialog.
- Moving a lesson picks the first alternative chapter silently, rather than letting the instructor select a destination.

## Responsive Model

### Phone And Tablet (`< lg`)

- The builder has one primary surface at a time.
- The initial surface is the curriculum. Selecting a lesson changes to the lesson editor surface.
- The lesson editor has an explicit back action that returns to curriculum. It preserves the selected lesson and unsaved form state for the current editor mount.
- The curriculum occupies the available main-section height with one scroll container. It has no fixed 50vh cap.
- The header keeps the primary publish/update action visible. Preview, configure, and analytics move to a single overflow menu. The course title remains visible and truncates when necessary.
- Sorting is not exposed as native drag and drop. Each chapter and lesson provides Move up and Move down actions in its overflow menu. Actions are disabled at list boundaries and while a reorder request is active.
- Lesson overflow includes Move to chapter when more than one chapter exists. This opens a destination picker with all other chapters, followed by a confirmation action. The selected destination is required; no implicit first-chapter behavior exists.

### Desktop (`lg` And Above)

- Preserve the current side-by-side curriculum/editor layout.
- Preserve handle-only chapter and within-chapter lesson drag sorting.
- Keep explicit move actions in overflow menus as an accessible alternative to drag sorting.
- Keep header actions directly visible when space permits.

## Builder Components

### Header Actions

- Add a responsive actions component owned by `course-builder-page.tsx` unless extraction is needed after implementation.
- Phone view: publish/update button plus an icon-only overflow trigger with accessible label. Overflow contains Preview, Configure, and Analytics.
- Desktop view: retain labeled action buttons and publish/update button.
- All direct touch controls must use the project's standard `Button` sizes, never `xs` or `icon-xs` for primary phone interactions.

### Curriculum

- Replace `space-y-*` layout with `flex flex-col gap-*` in touched curriculum and form regions.
- Use `Button`-based handles/actions so labels, focus styling, disabled states, and touch target dimensions are consistent.
- On phone, hide drag handles and present move controls through each chapter/lesson menu.
- On desktop, preserve handles and native DnD behavior. DnD remains disabled during a pending reorder.
- The selected lesson row remains visually distinct and exposes its title as the main button target.

### Lesson Editor

- Add a phone-only back-to-curriculum button above the editor title.
- Maintain a single editor scroll container on phone.
- Keep the save button reachable after long content editing; it may become a sticky bottom action only if the implementation can do so without introducing nested scroll traps.
- Use `Separator` instead of manually styled horizontal divider elements in touched markup.

## Settings And Confirmation Overlays

### Course Settings

- Render the same settings form content inside a `Drawer` with `position="bottom"` below `lg` and a `Dialog` at `lg` and above.
- Drawer content uses an independently scrollable body, a persistent footer, and safe-area padding supplied by the existing Drawer primitive.
- The desktop dialog remains scrollable and receives responsive padding (`p-4` at phone size, existing wider spacing at `sm` and above).
- Track dirty state for title, cover, price, and sequential-completion setting. An outside close, Escape, or drawer swipe must request confirmation before discarding dirty changes.

### Destructive Actions

- Replace `confirm()` calls for chapter and lesson deletion with an `AlertDialog`.
- The dialog clearly names the affected item and, for a chapter, states that its lessons will also be deleted.
- The destructive request has pending state, reports failures with `toast.danger`, and closes only after success.

### Move To Chapter

- Use the existing form primitive or installed shadcn `Select` if present. Do not install a dependency solely for this flow.
- The move surface is a small `Dialog` on desktop and a bottom `Drawer` on phone only if the selector needs enough vertical space; otherwise use a single responsive Dialog with mobile-safe width.
- Initial selection is empty. Source chapter is excluded. The action remains disabled until a target is selected.
- Moving a lesson updates the local course state optimistically, restores the exact prior state on request failure, and reports a toast error.

## Image Crop UX

- Keep `react-easy-crop`; it already supports one-finger pan and pinch zoom.
- Make crop height responsive: on narrow screens, derive the canvas from dynamic viewport height and avoid a hard 320px minimum that can overflow short displays. Keep the existing larger desktop height at `sm` and above.
- Crop dialogs use mobile-safe horizontal padding and stack footer actions when their labels cannot fit.
- Keep Reset, Cancel, and Apply controls at standard touch-friendly Button sizing.
- Consolidate `CroppedImageSelector` to one dialog tree so state transitions do not unmount and remount overlay infrastructure.

## Deferred Follow-Ups Included

### I1: Optimistic Rollback

- Duplicate and move actions capture the complete previous `Course` state before their request.
- Move updates source and target chapter lesson arrays and contiguous sort orders locally before the request.
- On failure, restore the captured course and show a specific toast. On success, reload canonical server data.

### I2: Destination Chooser

- Covered by the Move To Chapter design above.

### I3: Shared Cover Rendering

- Replace duplicate public/storefront/creator cover preview markup with `ProductCover`.
- `ProductCover` remains the single location for media URL normalization, image error fallback, `aspect-video`, and `object-cover` behavior.

### I4: Human Preview

- Replace the builder's API JSON preview tab with the human course storefront/learner preview route.
- Preserve authenticated workspace access and the `preview=1` capability. Verify the final route and required workspace header against the existing route implementation before coding.

## Error Handling And Accessibility

- All async actions that mutate course state set pending state, prevent duplicate submissions, and use `toast.danger` on failure.
- Every icon-only trigger has an accessible label.
- Overlay primitives retain visible title and description.
- Keyboard users retain access to every action available to mouse or touch users.
- Native drag sorting remains an enhancement, never the only way to reorder content.

## Tests And Verification

- Add behavioral tests for responsive rendering decisions and source-contract tests only where the repository's test harness cannot render responsive UI.
- Add tests for phone move actions, disabled boundary actions, selected target requirement, optimistic rollback, deletion confirmation, and mobile/desktop overlay selection.
- Retain existing chapter/lesson reorder, preview, crop, and ProductCover regression tests.
- Verify at 360px, 390px, 768px, 1024px, and desktop using the browser after implementation.
- Run targeted Vitest tests, `npm test`, `npx oxlint` on changed TypeScript files, `npm run build`, `git diff --check`, and affected Laravel feature tests through DDEV.

## Out Of Scope

- Replacing the shared native DnD infrastructure project-wide.
- Adding a new third-party DnD or responsive-detection dependency.
- Redesigning unrelated dashboard pages.
