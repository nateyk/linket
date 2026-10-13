# Linket wordmark — usage note (round 3)

One lockup: **horizontal only** (concept A, "Linked Li"). There is no stacked
version — don't invent one. Master geometry: canvas 711×256, stroke 32,
butt terminals, joints r 10 (0.31 × stroke, inner corners filleted), 45°
chamfered L–i link, round tittle Ø38 (e-bowl/bar 26, t-crossbar 27). Only the
tittle carries colour; the letters never do.

## Files

| what | file | use it for |
|---|---|---|
| outlined master | `master/linket-wordmark-master.svg` | source of truth: filled paths, no fonts, `g#letters` + `path#dot` |
| master, small cut | `master/linket-wordmark-master-small.svg` | same, for ≤24 px |
| colour versions | `color/linket-*.svg` (5 × full + `-small`) | **app logo slots** (`branding.logo_*` + mobile) + og/print/docs/marketing |
| symbol (Li mark) | `symbol/linket-mark-dark.svg`, `-light.svg` | standalone Li mark for square needs — kept in the kit, not wired into any slot |
| favicon | `icon/favicon.svg`, `icon/favicon.ico` (16/32/48) | browser tabs (white tile, small cut) |
| alternate favicon | `icon/favicon-dark.svg` | `prefers-color-scheme: dark` |
| app icons | `icon/apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` | iOS/Android/desktop, full joint |
| maskable | `icon/icon-maskable-512.png` | PWA, content inside 80% safe circle |
| social | `icon/og-image.png` (1200×630) | link previews, wordmark centred |
| ratios | `CONTRAST.md` | computed WCAG numbers for every version |

## Colour versions — when

| version | letters / tittle | ground | contrast |
|---|---|---|---|
| `color-light` (primary) | `#0a0a0a` / `#0049cc` | white, `#fafafa`, light UI | 19.80:1 / 7.43:1 |
| `color-dark` | `#ffffff` / `#0050de` | `#0a0a0a` and dark surfaces | 19.80:1 / 3.02:1 |
| `mono-black` | `#0a0a0a` / `#0a0a0a` | light, single-ink print | 19.80:1 |
| `mono-white` | `#ffffff` / `#ffffff` | dark, photo overlays | 19.80:1 |
| `on-blue` | `#ffffff` / `#ffffff` | `#0049cc` brand field | 7.43:1 |

The dark tittle is the **same brand blue** (hue 218.6°, saturation 100%) with
lightness lifted 40% → 43.5% until it clears 3:1 on `#0a0a0a` — `#0049cc`
directly on dark is only 2.66:1, so it is never used there. Full numbers and
the CVD evidence: `CONTRAST.md`, `png/cvd-check.png`.

## Sizes

- **Normal minimum: 24 px** wordmark height.
- **16–24 px:** use the `-small` files (tittle 42 raised −8, gap 16 → 20).
  Measured after AA: the tittle core is exactly `#0049cc` / `#0050de` at every
  size down to 16 px (no dilution) — but at 16 px it is a ~2 px dot, so
  colour is an accent, form carries recognition.
- **Below 16 px don't use the wordmark** — use the Li tile (`favicon`).

## Clear space

Keep empty space on all four sides of the ink of at least **one stroke width**
(32 units on the master ≈ 12.5 % of the wordmark's height; at h 32 px that is
4 px). Clear space is measured from the ink (letters + tittle), not the canvas
edge. Type, buttons or other marks stay outside it.

## Where each asset lives (as shipped)

- **App logo slots carry the FULL WORDMARK.**
  `branding.logo_dark` → `public/images/logo-dark.svg` = `color-light`
  (dark artwork, light grounds); `logo_light` → `color-dark` (white +
  lifted tittle, dark grounds); the `_mobile` slots take the `-small`
  cuts (they render at 16–26 px — the ≤24 px rule).
- **No text sits beside the logo image anywhere.** Every image lockup
  (landing header, mobile nav sheet, dashboard/sidebar, biolink + profile
  footers, auth pages, order header, suspended page) renders the wordmark
  alone; the wordmark *is* the name. `site_name` as text stays wherever it
  is not a lockup — page titles, copyright lines, copy — and stays
  admin-configurable. Where a link lost its visible text it now carries
  `aria-label={site_name}` (or an `sr-only` title) so it keeps an
  accessible name.
- **Favicon/PWA/apple-touch carry the Li tile** (`public/favicon.svg`,
  `favicon-dark.svg`, `favicon.ico`, `favicon/*`, `images/favicon-original.png`
  as the app's reseed source). Head tags: svg pair (light/dark via
  `prefers-color-scheme`) + ico fallback + apple-touch 180.
- **Never replace `branding.site_name` text with an image.** Copyright,
  auth copy and SEO titles render the configured name as text so the
  instance can rename itself — the wordmark image defaults to "Linket", so
  a renamed instance should upload its own logo (admin
  `BrandingImageSelector`).
- **Alt text:** wherever the wordmark appears without adjacent name text, the
  image needs `alt="Linket"`. Inline SVG ships with `role="img"`,
  `aria-label="Linket"` and a `<title>Linket</title>` — keep them.

## Don'ts

No gradients · no outline/stroke added around the letters · no rotation, tilt
or perspective · no recolouring letters · no tittle colour outside the table
above (never `#0049cc` on dark) · no stretching, squeezing or re-spacing · no
reordering letters · no shadow or glow · no tagline inside the lockup · no
busy photography behind it (solid panel + a mono version instead) · no second
mark next to it.
