# Editor UI audit — CHANGES

Handover for the six-commit editor audit on local `main` (never pushed). New
user-facing strings went through `trans(message(...))` / `<Trans>` +
`npm run extract`. Every commit is green on its own: `tsc --noEmit` 0,
`oxlint` = the four pre-existing `playwright.config.ts` errors only, full
`vitest run` green, `vite build` ok, `extract` 0 deletions, `impeccable
detect` clean.

## Commits → audit items

| # | Commit | Items |
|---|--------|-------|
| 1 | `5f7e7d1a` Batch 1 | A-01 WYSIWYG About on load · A-02 unsaved-changes guard · A-18 bio counter |
| 2 | `f34f51d2` Batch 2 | A-03 icon-only names · A-04 file-input labels · A-08 tab contrast · A-14 focus ring · A-21 clear-button tab stop |
| 3 | `62aa159f` Batch 3 | A-09 headings · A-10 landmarks + skip link · A-11 tab keyboard · A-15 "Short bio" · A-16 Ctrl/Cmd+S · A-17 reduced motion |
| 4 | `d85ecb63` Batch 4a | A-05 discard reverts preview/Save · A-06 preview tab-follow · A-07 per-tab save-error summary · A-20 prerender skip for `?preview=1` |
| 5 | `eabd9271` Batch 4b | A-12 skills chips n/8 · A-19 preview bottom sheet below `lg` |
| 6 | this commit, Batch 5 | A-05 remount correctness (bug fix) · A-10 mobile-nav landmark · A-03 geo-chart map label · dead-code removal · this file |

## Item index

- **A-01** — About tab opens through the public renderer's normalizer
  (`renderAboutHtml`) into TipTap; mangled hrefs repaired (idempotent);
  pristine forms stay pristine via the `onEditorReady` rebase.
- **A-02** — Leaving a dirty editor opens the accessible guard dialog:
  Save & leave / Discard changes / Stay.
- **A-03** — Icon-only controls carry accessible names (header menu, sidebar
  toggle, swatches, TipTap toolbar, product-row remove; Batch 5 adds the
  geo-chart "About this map" info trigger).
- **A-04** — Avatar/cover file inputs are labelled ("Cover image", "Profile
  photo") through the shared label prop.
- **A-05** — Discarding (dialog or remount) reverts the phone preview to the
  saved values and disables Save; the save baseline lives in the store
  (`savedProfileConfig`), save success calls `markProfileSaved`. Batch 5
  fixes the remount-stuck-dirty edge — see below.
- **A-06** — Preview follows the editor tab both ways (Profile/Products/About).
- **A-07** — Save-failure summary renders inside the failing tab.
- **A-08** — Inactive tab text at ~5.9:1 (was 4.29:1).
- **A-09** — Heading structure: sr-only store-name h1, panel h2s, accordion
  triggers named by title alone.
- **A-10** — One labelled `<main>`, header/nav landmarks, base-proof skip
  link; Batch 5 adds the mobile bottom bar's `nav` landmark ("Mobile
  navigation", exact-match `aria-current`).
- **A-11** — Tab keyboard: Arrow/Home/End/Space/Enter, replace-history
  navigation, focus survives route changes.
- **A-12** — Skills chips capped at 8 with a live `n/8` counter and inline
  rejection message.
- **A-13** — Route-level bundle split — **not fixed** (below).
- **A-14** — One focus-ring treatment across the editor.
- **A-15** — Bio field labelled "Short bio".
- **A-16** — Ctrl/Cmd+S saves the editor (no-op when clean/saving) with
  `aria-keyshortcuts` + tooltip hint.
- **A-17** — Global `prefers-reduced-motion` block (0.01ms, never `none`).
- **A-18** — Bio `n/600` counter, warning color at 90%.
- **A-19** — Below `lg`, preview opens from a floating button into an
  accessible bottom sheet.
- **A-20** — `FallbackRouteController` skips crawler prerender for
  `?preview=1` (the editor's own frame never gets the crawler page).
- **A-21** — Profile-title clear button is a real tab stop.

## Batch 5 (commit 6) detail

**A-05/A-01 remount correctness (bug fix).** Root cause, proven with
temporary in-page instrumentation and a 7-phase browser bisect: TipTap v3
creates during render (`immediatelyRender`), so the About editor's `onCreate`
rebase (child) runs *before* the parent mount re-seed; the old seed
(`reset(..., keepDefaultValues: true)`) then overwrote the rebased values
while keeping the rebased defaults → `about_html` permanently dirty with
zero edits (Save glowed after visiting About, and the discard dialog pointed
at a stale pushed draft). Fix: the re-seed now seeds both sides — values
from the pushed draft, defaults from the saved baseline — with the saved
baseline as its dep, preserving a just-rebased About HTML verbatim (translating
it again would make TipTap recreate in a loop: the two serializations are not
idempotent, 2737 vs 2744 bytes); `rebaseSavedAboutHtml` absorbs the canonical
HTML into the pushed config in the same tick; `markProfileSaved` makes the
live config the new baseline.

jsdom cannot reproduce this ordering (TipTap creates asynchronously there),
so the jsdom About test is a guard, not the repro: RED evidence is the
pre-fix browser bisect (S2/S3/S5/S7 wrongly enabled; values 2603 B vs
defaults 2721 B) and GREEN is three clean post-fix runs (only the
intentional edit, S6, enables Save).

Also in Batch 5: tab-remount dirty-state tests (dirty survives
Content→Appearance→Content; pristine stays clean with real-shaped config);
mobile bottom navbar as a landmark; geo-chart info-trigger name; dead code
removed (`accordion` lib + `accordtion-animation`, `biolink-editor-page.tsx`,
`biolink-item-payload.ts` ×2, un-exported usage-dialog helpers); catalog
1613 → 1614 keys (+Mobile navigation, 0 deleted).

## Not fixed

- **A-13 route-level bundle split** — out of audit scope; `vite build` still
  warns "chunks larger than 500 kB … use dynamic import()". Needs a
  lazy-loading pass with load testing.
- **`page-has-heading-one` (moderate) at 360 px** on dashboard/editor —
  pre-existing; needs a global h1 strategy.
- **Esc while focus is inside the preview iframe** stays in the iframe —
  pre-existing cross-document focus behavior.
- **Products-tab draft (selected product IDs) does not survive an editor
  remount** — pre-existing; deliberately untouched.
- **`store-editor-page.tsx` docstring above `EditorHeaderWithGuard`** ("tab
  content is kept mounted, so the dirty state survives") is wrong — tab
  content remounts; dirty survives because the baseline lives in the store.
  Left as-is this batch.
- **oxlint** keeps the four pre-existing `playwright.config.ts` `no-undef`
  errors.

## Verification (Batch 5 battery + probes)

- `tsc --noEmit` 0 · `oxlint` 4 pre-existing errors, 0 warnings · full
  `vitest run` **516/516** (serial; a parallel run under machine load hit
  five 5 s timeouts — all green in isolation and serially) · `vite build` ok
  · `extract` 1614 keys, 0 new, 0 deleted (10 stale kept) · `impeccable
  detect` clean.
- Playwright probes (default-deny guard; the only blocked requests were
  `POST /_boost/browser-logs` telemetry):
  - **dirty-bisect ×3**: only S6 (real edit) enables Save; S1–S5 and S7
    clean; 0 console errors.
  - **behavior-probes**: freshRevert ✓ · remountedRevert ✓ (Save disabled —
    was `false` pre-fix) · a05Discard ✓ · A-06 Profile→About→Profile→Profile
    ✓ · Ctrl+S → 1 faked PUT (`bio: PROBE-CTRLS-99`, status "Changes saved")
    · keyboard walk 22 stops, 0 without a focus ring, 0 unnamed.
  - **axe**: 0 violations (any severity) across content/about/appearance/
    insights/360/360-sheet-open.
- **DB**: `db-check` vs baseline — save surface byte-identical
  (`profile_config` MD5 unchanged; products + appearance unchanged). Only
  `biolinks.updated_at`/`clicked_at` moved because visiting `/noval` logs a
  click (`clicks_count` 369) — the screenshot step below, not the editor.

## `/noval` pixel-diff substitute

No pre-audit screenshot survived earlier /tmp wipes, so the substitute is a
code-level footprint of the six commits on the public page plus a current
capture (`~/.cache/linket-final/noval-current.png`, post-audit):

- `app/Links/Controllers/FallbackRouteController.php` (A-20): prerender
  skipped for `?preview=1` — no effect on public visits.
- `resources/client/short-links/linkeable-renderer.tsx` (A-06): message-
  source guard + tab protocol — inactive outside `?preview=1`.
- `.../biolink-renderer/about-markdown.ts` (A-01): `repairMangledLinkHrefs`
  strips sanitizer `)**` residue from https hrefs (idempotent) — previously
  broken About links now resolve; all other output byte-identical.
- `.../biolink-layout.tsx`, `biolink-renderer.tsx`, `creator-profile-layout.tsx`
  (A-06): `previewSection` threading (no public effect) plus `selectSection`
  now scrolls to the section top — public nav-button taps jump to top
  (deliberate, instant by construction).
- Tests only: `linkeable-renderer.dom.test`, `about-markdown.test`,
  `creator-profile-layout.dom.test`, `store-3006-about.fixture` (+254/−2).

## Rollback

Revert newest-first, from a clean worktree (stash or commit the unrelated
branding WIP first):

```bash
git revert --no-edit HEAD eabd9271 d85ecb63 62aa159f f34f51d2 5f7e7d1a
```
