# MEMORY

Progress notes for the Linket store editor. Newest work last.

## Where things stand

Eight commits landed on `main`, all local, none pushed:

| Commit | What |
|---|---|
| `9ccf6581` | Phone preview: real iPhone artwork, one mobile section at a time |
| `73ec4ed1` | Collect the iPhone geometry in one typed module |
| `c36556b4` | Stop re-rendering the page when the frame resizes |
| `c5381ac9` | Fit the whole phone in the panel; debounce preview sync |
| `20dcec53` | Optimise the artwork: metadata + dead gradients |
| `e3903430` | Preview nav honours `prefers-reduced-motion` |
| `96300acc` | Remove the dead preview branch and the compact variant |
| `266c1116` | Document where the artwork comes from |

Verification at `266c1116`: `tsc --noEmit` clean, `oxlint` clean except 4
pre-existing `playwright.config.ts` errors (`process` undefined — unrelated,
present before this work), 399 tests across 55 files pass, `vite build`
succeeds.

Untracked in the tree, not part of the work: `.impeccable/critique/*.md` and the
stray `iphone-14-pro-*.svg` copies at the repo root (the real ones live in
`resources/client/dashboard/stores/store-editor/`).

## The thing that was wrong at the start

The brief assumed the preview rendered the desktop layout because the page
branched on `window.innerWidth` / `useMediaQuery`, and that `transform: scale()`
fed it the editor's width instead of the phone's. **That was wrong.** The
biolink layout branches on a *container query* (`@container` + `@4xl:`), and
`LivePreview` already iframed the real public route at 393×852, so the iframe
was getting the mobile branch correctly all along.

The actual bug was inside the mobile branch: `MobileCreatorProfile` rendered
`CreatorProfileContent` — the `StoreFront` tab strip — inside the Profile
section. So Products and About appeared inline under the card *while* the
bottom nav also switched to those same sections. Two controls, one destination.
Fixed by making Profile the card alone.

There is no `forceMobile` prop and none is needed. Do not add one.

## Decisions worth remembering

**Geometry lives in one place.** `phone-preview.constants.ts` holds the viewBox,
screen box (as percentages of it), radius, viewport and safe areas, with
`frameHeightFor` / `frameWidthFor` / `scaleFor` derived.
`phone-preview.geometry.test.ts` re-derives the screen box from the back SVG
and fails if the two drift apart — run it rather than trusting hand-edited
numbers. Regeneration steps are in the `phone-preview.tsx` header comment.

**The scale is written to the DOM, never to state.** `usePhoneScale` sets the
transform through a ref, rAF-throttled. A resize that re-rendered the subtree
would rebuild the preview iframe and lose its scroll position, focus and
in-flight media mid-drag. There is a render-count test guarding this.

**The phone fits the panel in pure CSS.** `container-type: size` on the fit box
exposes the available height as `100cqh`; the frame's width is
`min(100cqw, calc(100cqh * ratio))`. No JS measuring, no scroll. Verified at
panel heights 430–900 and widths 260–1280.

**SVG optimisation is pixel-identity-limited.** svgo's `convertPathData` and
`cleanupNumericValues` shift the bezel outline by a fraction of a pixel and
re-antialias the entire edge — 1.3–2.7% of pixels differing, a visible red
hairline round the frame. So svgo runs with only the passes that cannot move
geometry, and coordinates keep full precision. **The brief asked for 2–3
decimals; that was declined with a measurement to justify it.** Re-check this
before "fixing" the precision.

**Unreachable `<defs>` must be resolved through href edges, transitively.** Most
of these gradients carry no stops of their own and inherit via `xlink:href`.
Counting `url()` alone keeps whole dead chains alive while dropping a live
parent silently flattens everything built on it. An early pass did exactly that
and broke the bezel gradient — the pixel diff caught it.

**`isPreview` was dead, and it was hiding a bug.** Nothing ever passed it to
`BiolinkLayout`, so the `!isPreview &&` guard on the page background was
permanently true and the background was **skipped in preview**. Removing the
prop means the background now paints on every path, which is correct: the
preview is an iframe of the live route and has its own background.

**The `compact` prop was quietly degrading every mobile card.** Only the dead
`CreatorProfilePreview` ever passed it, so live mobile rendered 4 skills instead
of 8, 6 socials instead of all, a two-line bio, and tighter padding. Removed;
all of it now renders at the full scale the live page uses.

## Testing setup

Vitest 4 dropped `environmentMatchGlobs`. Component tests opt into jsdom with a
`@vitest-environment jsdom` docblock and pick up `ResizeObserver`,
`IntersectionObserver` and `matchMedia` stubs from
`resources/client/test-dom-setup.ts` (wired via `setupFiles` in
`vite.config.ts`). Everything else stays on node.

`*.dom.test.tsx` files that need to read a container-query branch must scope
their queries to it — jsdom resolves no `@4xl:` rules, so both the mobile and
desktop arrangements stay in the DOM at once. `creator-profile-layout.dom.test.tsx`
has helpers (`mobileBranch()` / `desktopBranch()`) that find the branch by
`classList`, not by selector: an escaped `@4xl:hidden` selector is not a valid
CSS selector and throws.

## Environment notes for the next session

Playwright's Chromium will not launch: `libnspr4`, `libnss3` and `libasound2`
are missing and there is no passwordless sudo. Firefox is worse (`libasound`).
Working setup — extract the `.deb`s into a private sysroot and point
`LD_LIBRARY_PATH` at it:

```
LD_LIBRARY_PATH=/home/nate/.cache/pvlibs/root/usr/lib/x86_64-linux-gnu
```

The sysroot is already populated. Chromium then runs headless fine. Do not
`apt install`; that would need sudo.

`/tmp/opencode` is wiped between sessions. Persistent scratch lives in
`/home/nate/.cache/pvwork/` (SVG optimisation scripts, pixel-diff harness) and
`/home/nate/.cache/pvlibs/` (the browser sysroot).

## To do

- **Not done:** booting the app with a seeded biolink to screenshot the three
  mobile sections inside the phone. Behaviour is covered by rendered tests
  instead, but the visual confirmation the brief asked for is still missing.
- **Not done:** verifying the fitted panel inside the real editor UI. The fit
  was verified against a standalone harness that mirrors `LivePreview`'s
  structure at seven panel sizes, not the actual page.
- `opencode.json` and `public/build/manifest.json` show as modified in every
  `git status`; they are build/session noise, not part of this work. Don't
  commit them without checking.
- The 4 `playwright.config.ts` lint errors are pre-existing. Fixing them needs
  `process` in the oxlint globals; unrelated to anything here, but they make
  `npm run lint` non-zero.