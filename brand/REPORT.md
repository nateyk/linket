# Linket — identity round 3, production round (STOP: sign-off)

Round 3 redraws the wordmark heavier — concept A "Linked Li" kept, the system
rebuilt around it: stroke 32 (e-bowl/bar 26, t-crossbar 27), joints
r 10 = 0.31 × stroke with filleted inner corners, 45° chamfered L–i link with
the foot reaching the i column (174/170), round tittle Ø38, tight spacing
(stem channels 19 units; round 2 had 26). **Edge treatment: flat cuts** —
straight stroke ends like the reference; the round-cap variant exists in
`source/round3-*-round.svg` but is not the master. Craft corrections from
review: k/e/t terminal cuts fixed, corners rounded not sharp, L-in baseline
nick closed.

`tools/build_v3.py` is the single geometry source: it writes the six round-3
concepts and feeds the production builders (`build_round2`, `build_icons`,
`build_marks`), so master, colour files, favicon/app icons and marks cannot
drift apart. The Li crop window moved 229 → 225 (round-3's heavier `n` starts
at x 226 and would have crept into the icon measurement), and the ≤24 px small
cut mirrors the round-2 rule — tittle +4 and raised −8 → Ø42 @ y46
(gap 16 → 20).

Everything was re-measured from the shipped files by pixel analysis, never by
eye. Full chain:

    cd brand/tools
    python3 build_v3.py && python3 build_round2.py && python3 build_icons.py \
      && python3 build_marks.py && python3 build_wordmarks.py \
      && python3 refdiff.py && python3 analyze.py && python3 sheets.py all \
      && python3 verify_sheets.py && python3 verify_round2.py

Last run: `analyze.py` ALL PASS, `refdiff.py` deltas confined to the e letter
(219–231 px, ≤0.19 % of ink, bbox x 1038–1121 at 2× — the `_trace` on-circle
arc fix at the e's aperture terminal), `verify_sheets.py` **ALL SHEET CHECKS
PASS** (16 sheets, 305 checks), `verify_round2.py` **73/73 ALL ROUND-3 CHECKS
PASS**. Squint: pixel
grid at 32 px i·n 3.00 / n·k 3.00 / k·e 3.16 / e·t 4.00 px, geometric spread
**0.54 ≤ 0.6** (even rhythm; full-size channels 19.0 / 19.0 / 21.5 / 23.4).
`svg_audit.py` 100/100 on master/colour/marks (favicons 99/98 — INFO only:
decimal precision of the tile transform).

App tests: `npm run test` **523/523**,
`ddev artisan test --filter=StorefrontPublicAssetsTest` **6/6**,
`npm run build` ✓. Nothing was committed.

---

Everything below documents the round-2 sign-off and is kept as history;
where round 3 superseded a number (geometry, tittle sizes, squint channels),
the round-3 section above governs.

## Files delivered (paths relative to `brand/`)

| what | files |
|---|---|
| outlined master | `master/linket-wordmark-master.svg` — 711×256, strokes already expanded to filled paths, no fonts, `g#letters` + `path#dot` (dot separate); round-1 spacing/geometry unchanged |
| master, small cut | `master/linket-wordmark-master-small.svg` (tittle 32, raised −8) |
| colour versions | `color/linket-{color-light, color-dark, mono-black, mono-white, on-blue}.svg` + each `-small` → 10 files |
| favicon | `icon/favicon.svg` (= white tile, chosen), `icon/favicon-white.svg`, `icon/favicon-dark.svg` (prefers-color-scheme), `icon/favicon.ico` (16/32/48), `icon/favicon-{16,32,48}.png` |
| app icons | `icon/apple-touch-icon.png` (180), `icon/icon-192.png`, `icon/icon-512.png`, `icon/icon-app.svg` |
| maskable | `icon/icon-maskable.svg`, `icon/icon-maskable-512.png` |
| social | `icon/og-image.svg`, `icon/og-image.png` (1200×630) |
| notes | `CONTRAST.md` (computed ratios), `USAGE.md` (one-page usage rule) |
| new sheets (PNG) | `png/color-versions.png`, `png/cvd-check.png`, `png/small-sizes.png`, `png/favicon-tabs.png`, `png/icon-preview.png`, `png/squint-32.png` |

## Colour versions — computed contrast (table from `CONTRAST.md`)

| version | letters / tittle | ground | ratio |
|---|---|---|---|
| `color-light` (primary) | `#0a0a0a` / `#0049cc` | `#ffffff` | **19.80:1** / **7.43:1** |
| `color-dark` | `#ffffff` / `#0050de` | `#0a0a0a` | **19.80:1** / **3.02:1** |
| `mono-black` | `#0a0a0a` / `#0a0a0a` | `#ffffff` | **19.80:1** |
| `mono-white` | `#ffffff` / `#ffffff` | `#0a0a0a` | **19.80:1** |
| `on-blue` | `#ffffff` / `#ffffff` | `#0049cc` | **7.43:1** |
| *reference* | `#0049cc` tittle on `#0a0a0a` | — | 2.66:1 → the reason the lifted blue exists |

- **Lifted dark-ground blue = `#0050de`**: same HSL hue (218.6°) and
  saturation (100 %) as the brand blue, lightness lifted 40 % → 43.5 % — the
  minimal lift that clears 3:1 on `#0a0a0a`. Same brand blue, only as light
  as legibility requires.
- **CVD** (`png/cvd-check.png`): Machado severity-1.0 protanopia,
  deuteranopia, tritanopia + grayscale simulated at pixel level over the real
  render. The letters are neutral, so they are untouched by every deficiency;
  only the tittle moves — protan `(0,94,208)`, deutan `(0,77,202)`, tritan
  `(0,108,132)`, grayscale `(67,67,67)` — all re-simulated and compared
  pixel-exactly in `verify_round2.py`.
- **Reads with no colour**: `mono-black`/`mono-white`/`on-blue` each verified
  to contain exactly one fill (one hex in the whole file).

## Small sizes

- Round-1 small cut (tittle 32 raised −8, gap 16→20) ships as the `-small`
  files, used for **all ≤24 px** output (favicon).
- **Dot blue-ness after AA** (`png/small-sizes.png`, re-measured in
  `verify_round2.py`): tittle core pixel at 16/24/32/48 px on white and on
  `#0a0a0a` is exactly `rgb(0,73,204)` / `rgb(0,80,222)` — α = 1.00,
  B−R = 204/222, i.e. **no AA dilution at any size, 16 px included**.
  Honest caveat printed on the sheet: at 16 px it is a 2×2 px square, so
  colour reads as an accent — form carries recognition (mono rows prove it).
- **Squint test** (`png/squint-32.png`): at 32 px the min white channels are
  i·n **4.00** / n·k **4.00** / k·e **3.61** / e·t **4.12** px — spread
  **0.52 px ≤ 0.6**: no letter pair stands out. σ1.2 blur panel + 4× pixel
  zoom on the sheet.
- **Channel diagnosis — false alarm, no regression.** Round 1 recorded
  27.0 / 27.0 / 26.4 / 26.9 (i·n / n·k / k·e / e·t); today's files measure
  exactly the same. `refdiff` localises the r1→r2 delta to the e aperture
  only (the intended φ = 45° cut); `analyze.py` ALL PASS.

## Favicon / app icons

- **Li crop**; small cut in the favicon (spec: full joint fails nowhere in
  practice, but the small cut is the committed rule), full joint in
  app/maskable/og PNGs (platform masks apply).
- **Optical centring**: coverage centroid, not bbox — centroid−bbox offset
  (−3.6, +18.3) viewBox units (small cut) / (−4.3, +20.7) full joint, i.e.
  bbox centring would sit the mark low. Rendered centroid errors: 16 px
  1.59 %, 48 px 0.75 %, 192 px 0.21 %, 512 px 0.17 % of size (≤2 % target).
- **Tile verdict: white wins** (`png/favicon-tabs.png`): tittle at full
  brand blue 7.43:1 vs lifted 3.02:1; white tile vs dark chrome 16.10:1;
  dark tile vs dark chrome only 1.23:1 → `favicon.svg` = white, and
  `favicon-dark.svg` ships for `prefers-color-scheme: dark`.
- **Radius**: tile rx 7.603/512 = 0.15 × icon stroke 50.7 — the same R1
  ratio as the wordmark, not a bubbly tile.
- **Maskable**: measured content radius 0.763 of half-size ≤ 0.8 safe zone.
- **ICO**: 3 entries, sizes 16/32/48, each entry a valid PNG of its own
  size (header parsed in `verify_round2.py`).
- **og**: 1200×630, full wordmark ink centred at (600, 315), ink width 720.

## Trademark (quick check, before printing)

Web-level search of USPTO/EUIPO records found **no existing registration for
the exact word LINKET** in software classes (9/42). The link-in-bio field is
crowded with "Link…" marks (Linktree, The Linkt, Linknbio, …), so this is a
sanity check, **not a clearance** — run a full professional search before any
print run.

## Problems found / disclosures (round 2)

- **No browser on this machine** — tab mockups (`favicon-tabs`) and icon
  previews are SVG recreations built from the shipped PNG/SVG files with the
  measured ratios printed on the sheet; not screenshots.
- Type renders as **DejaVu Sans** (the app uses the system UI stack).
- **Honest human 5-person read test: not done — I cannot run it.** The
  squint/CVD/cold-read sheets are measurements; a human test stays yours.
- Round-1 `source/a-r0.svg` / `b-r0.svg` were **not** regenerated (they carry
  the historical round-cap e and serve as the round-1 record); the rest of the
  pipeline was rebuilt and passes.
- Symbols S1/S2/S3 moved to `brand/archive/` — superseded by one mark.
- Nothing committed. *(Round-2 art scope was `brand/` only; the approved
  wiring below extends into `public/` + two blades.)*

## App wiring — implemented (final pass after your review)

**Decisions (as shipped)**

1. **Logo slots carry the FULL WORDMARK.** `public/images/logo-dark.svg` ←
   `color/linket-color-light.svg` (full cut), `logo-light.svg` ←
   `color-dark`, `mobile-logo-*` ← the `-small` cuts (those slots render at
   16–26 px). The first wiring pass used the Li symbol instead; replaced on
   your review ("use full word mark … I don't want text logo on it"). The
   symbol files stay in the kit (`brand/symbol/`), not wired anywhere.
2. **No text next to the image — anywhere.** The `site_name` text that sat
   beside the logo (your screenshots: landing header, biolink footer) is
   removed from every image lockup — the wordmark *is* the name.
   `site_name` as *text* stays wherever it is not a logo lockup (page
   titles, copyright lines, copy) and stays admin-configurable.

**New files (kit)**

| file | content |
|---|---|
| `brand/symbol/linket-mark-dark.svg` / `-light.svg` | standalone Li mark, small cut, transparent — kept, not wired |
| `brand/tools/build_marks.py` | mark generator (measured tight bbox 48,52–208,204 = 160×152) |
| `brand/tools/verify_wiring.py` | wiring verifier (64 checks) |

**Assets changed**

- `public/images/logo-dark.svg` / `logo-light.svg` ← full-cut colour
  wordmarks; `mobile-logo-dark/light` ← small-cut colour wordmarks.
- Favicon bundle: `public/favicon.ico` ← real 3-entry ICO (16/32/48);
  new `public/favicon.svg` + `public/favicon-dark.svg`; new
  `public/favicon/apple-touch-icon.png` (180); `public/favicon/icon-{72,96,
  128,144,152,192,384,512}.png` re-rendered from `icon-app.svg` (every
  manifest size, `manifest.json` untouched); `public/images/favicon-original.png`
  ← 512 tile (the app's reseed source stays on brand); stale
  `public/images/favicon.svg` overwritten.
- `common/foundation/resources/views/framework.blade.php`: head = svg
  favicon (light) + svg favicon-dark (dark) + `.ico` fallback + apple-touch
  180, `data-keep` preserved.
- `resources/views/redirects/redirect-error.blade.php`: same links replacing
  dead `client/favicon/*` paths (no `public/client/` exists).

**Source changed (8 files + 1 test)**

- `navbar/logo.tsx` — `BrandName` lockup deleted; the now image-only
  Auto/Wide links get `aria-label={site_name}` (they would otherwise have
  no accessible name — WCAG 4.1.2).
- `landing-page/header/header.tsx` — mobile sheet title → `sr-only`
  (accessible name kept, visible text gone).
- `biolink-layout.tsx` + `creator-profile-layout.tsx` — site_name span
  removed; those lockups now read the small-cut mobile files (h-6 = 24 px /
  h-4.5 = 18 px → the ≤24 px rule), wide file as fallback.
- `auth-layout.tsx`, `auth-layout-v2.tsx`, `my-order-shell.tsx`,
  `user-suspended-page.tsx` — the same image+text lockups reduced to the
  image (`aria-label` added where the link would lose its name).
- `biolink-appearance.test.ts` — P1-6 updated: it asserted the old
  token-wired text span; it now asserts the image-only lockup + that an
  accessible name survives.

**Settings state (read, not written):** all four `branding.logo_*` rows hold
the default paths (no admin overrides → the swap is live); no
`branding.favicon` row (created only on admin favicon upload); `site_name`
untouched.

**Verification (final)**

- `verify_wiring.py` **64/64 ALL WIRING CHECKS PASS** — byte-compares the
  slots against the brand deliverables, asserts all 8 lockup edits (no
  site_name span left, aria-labels present), favicon/ladder dims + centroid
  ≤0.43 % + blue tittle at every size, blade targets exist, no dead links.
- `verify_round2.py` **73/73**; marks svg_audit **100/100**.
- **vitest full suite: 74 files / 509 tests pass** (includes the dom tests
  that render `Logo` and the branding layouts); `oxlint` clean on every
  touched file.
- `ddev artisan test --filter=StorefrontPublicAssetsTest` **6/6**;
  `ddev artisan view:cache` compiles every blade; `npm run build` (vite)
  succeeds.
- Live: `GET /login` 200 with all four icon links rendered; `GET /` 200.

**Notes / limits**

- Renamed instances: the default wordmark bakes "Linket" in — an instance
  that renames itself should upload its own logo (admin
  `BrandingImageSelector`); `site_name` text still carries the configured
  name everywhere it is not a lockup.
- `sw.js` is registered in HEAD but was never a tracked file — pre-existing,
  not introduced here (service worker absent in this checkout).
- The marketing SEO homepage head carries no icon links (pre-existing);
  browsers fall back to `/favicon.ico`, which is now our art. Optional
  follow-up: add the svg pair there too.
- `GenerateFavicon` reseed quirk kept as-is: an admin favicon upload
  regenerates the ladder and writes a 16 px PNG *named* `.ico` (pre-existing
  behaviour).
- Tests run via **ddev** (the local `php` shim is Windows PHP and cannot
  spawn pest from WSL paths). `public/build/` is gitignored except the
  tracked `manifest.json`, refreshed by the build.

---

# Round 1 (superseded parts annotated below)

Sources live in `brand/source/`, sheets in `brand/png/` (symbol sheet moved to
`brand/archive/png/`).

All sheets were verified **by pixel comparison** (every logo cell re-rendered
from source and diffed against the sheet, backgrounds asserted, edges checked
for overflow, labels asserted) — never by looking at an image viewer. Re-run:
`python3 tools/sheets.py all && python3 tools/verify_sheets.py`.

## Open these (PNG)

| # | Sheet | What it answers |
|---|-------|-----------------|
| 1 | `png/roundness-sheet.png` | A & B at R0 / R1 / R2, one system, labeled |
| 2 | `png/spacing-before-after.png` | R0 vs re-spaced, measured channels, aligned baselines |
| 3 | `png/coldread-light.png` | 16/24/32/48/64 px black-on-white + small-size cut rows |
| 4 | `png/coldread-dark.png`, `png/coldread-blue.png` | same, white on #0a0a0a / #0049cc |
| 5 | `png/coldread-blur-mirror.png` | squint (σ1.2–σ4) and mirrored |
| 6 | `png/variants-link-cuts.png` | the L→i link: arc48 / arc30+r3.6 / chamfer+r3.6 / chamfer sharp / sharp arc / 15° cut |
| 7 | `archive/png/symbol-sheet.png` | 3 symbol candidates × R1/R2 × 16–160 px + reversed *(superseded — archived in round 2)* |
| 8 | `png/context-header.png` | header lockups in the real navbar structure |
| 9 | `png/context-sidebar.png` | wordmark in the sidebar logo slot vs symbol + name |
| 10 | `png/context-profile.png` | public-profile footer at real sizes (18 px mark, 12 px text) |

Sources: `source/a-r0|a-r1-chamfer|a-r2|b-r0|b-r1|b-r2` (levels),
`a-r1-chamfer|a-r2-arc|a-r2-cut15|a-r1|…` (link variants),
`a-r1-dot32|b-r1-dot32` (small-size cut); symbols `s1|s2|s3-r1|r2` now in
`archive/source/`.

## Measured facts

- **Spacing** (min white channel, px; i·n, n·k, k·e, e·t):
  A-R0 **27.3 / 27.0 / 37.1 / 30.0** → R1 & R2 **27.0 / 27.0 / 26.4 / 26.9**.
  B-R0 **23.0 / 23.0 / 32.0 / 25.9** → **27.0 / 27.0 / 26.4 / 26.9**.
  Even now; the wide k·e / e·t gaps you saw are gone (Δ −10.7 / −3.1 px on A).
- **R1 vs R2 differ by 15 px at full size**, only at the L elbow and the dot
  corners. Butt terminals carry the sharpness, not the corner radius.
- **Engine proof**: the outline engine at r=0 is pixel-identical to a
  miter/butt stroke (0.000 % difference), so R1/R2 differ nowhere else.
- **Dot survival** (dot / gap / stem, 0–255): all sizes pass. At 16 px A =
  230 / **98** / 250, B = 251 / 45 / 220; at ≥32 px gap = 0 (clean) everywhere.
  Small cut (tittle 28→32, raised 8 → gap 16→20): B@16 gap **45→0** (true blank
  row), A@16 dot 230→255 (fully solid).

## Honest cold-read verdict

- **16 px**: the L→i idea holds; letters compress but stay ordered. The only
  real risk is the dot: A's dot-to-stem gap greys over (≈98/255 AA row), so a
  hurried read can see `l`+`l`/`I` instead of `l`+`i`. B separates slightly
  better (45) but shows a faint AA row at 24 px (56) — pixel-grid luck, not
  geometry (the ASCII render shows a blank row).
- **"Uj"/"Lu"?** No. The left stroke is cap-height, the right rise only
  x-height, and there is no second stem, so the U-silhouette never closes;
  mirrored and blurred the reading does not flip. First two letters read
  **Li**, at every size and background.
- **Small-size cut built** (`a-r1-dot32`, `b-r1-dot32`): use for **≤24 px**
  (favicons, tiles). Normal cut for ≥32 px. This is on the light sheet as the
  bottom two rows.

## Recommendations (this is the whole point of the round)

1. **Roundness: R1** (r = 0.15 × stroke = 3.6, butt cuts, square tittle).
   Tight enough per your brief (R0's 0.5×stroke caps were the softness), while
   the elbow — the one place that *is* the "link" idea — keeps a trace of
   designed curvature instead of a razor corner. R2 is near-identical
   (15 px); if you want maximum precision, take R2 — both are on sheet 1.
2. **Link variant: 45° chamfer** (sheet 6). Your own rule decided it: curves
   only where the letter needs them — an L corner doesn't. The chamfer also
   matches the butt-cut language; the arc bulges exactly where we're tightening;
   the 15° cut is a nice editorial detail but adds an angle outside the system
   (keep it out).
3. **Concept: A primary, B fallback** — as set. A is the tighter idea (one
   continuous stroke *is* the link); B survives 16 px slightly better and is
   the safer favicon — worth keeping as the small-size master if you love A
   at 16 px less than at 32+.
4. **Symbol: S1 "Linked Li"** primary, S2 "Linkline" alternate.
   *(Superseded in round 2: one wordmark only — no separate symbol; all
   symbols archived under `brand/archive/`. Kept here for the record.)*
   S1 is the wordmark's own opening move at 512 — same stroke ratio
   (48 = 24/512), same butt cuts, same square tittle, r 7.2 = 0.15×stroke.
   Honest weakness of **S3**: the tittle floats 144 units off the heel and
   reads disconnected, weakest of the three. The old blue icon is **not used
   anywhere**; for the record it measured r ≈ 0.23×stroke — softer than our
   R1 — so replacing it also sharpens the brand.
5. **Lockups (sheets 8–10)**: the current components render the site name as
   *live text* next to the mark (`site_name`, admin-configurable) —
   H1/P1 keep that property (swap in S1, keep the text). Wordmark-as-image
   (H2/H3/P2/P3) is the stronger brand but bakes "Linket" in, so use it only
   where the name is fixed (profile footer, social cards, docs). My pick:
   **H1 structure for the app, wordmark as the primary brand asset**
   (favicon, social, anything static).
   *(Superseded by the final wiring decision (your review): **wordmark in
   the image slots, and the live-text lockup removed entirely** — no text
   beside the image anywhere. See the wiring section at the top. The
   "bakes Linket in" caveat is handled by the admin logo upload; the
   renamed-instance advice stands.)*

## Disclosures

- No browser here: mockups are SVG recreations from the real values
  (`DESIGN.md`, `navbar/logo.tsx`, `creator-profile-layout.tsx`,
  `footer.tsx` — labels, gaps, sizes quoted on each sheet). True to spec,
  but not a screenshot.
- Type renders in this machine's **DejaVu Sans**; the app uses the system UI
  stack, so text will look tighter in the browser than in the sheets.
- Masters are filled outlines (no fonts, no strokes): svg_audit 100/100 on
  master/colour/marks, 99–100/100 INFO-only on the tile favicons.
- Nothing committed; kit work under `brand/`, re-rendered assets under
  `public/` (same slots and paths as before).

**Round 3 delivered:** the whole kit regenerated on the heavy round-3
geometry (flat cuts) and re-wired into `public/`; verification chain +
app tests green — see the round-3 section at the top.
