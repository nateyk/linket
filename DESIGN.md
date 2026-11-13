---
name: Linket
description: Creator storefront and link-in-bio dashboard — quiet, neutral, token-driven, with one working blue accent.
colors:
  primary: 'oklch(46% 0.214 259.815)'
  primary-fg: 'oklch(0.9911 0 190.05)'
  primary-dark: 'oklch(88.2% 0.059 254.128)'
  primary-dark-fg: 'oklch(0.2478 0 0)'
  background: 'oklch(1 0 0)'
  foreground: 'oklch(0.2478 0 0)'
  card: 'oklch(1 0 0)'
  card-fg: 'oklch(0.2478 0 0)'
  secondary: 'oklch(0.967 0.001 286.375)'
  secondary-fg: 'oklch(0.21 0.006 285.885)'
  muted: 'oklch(0.97 0 0)'
  muted-fg: 'oklch(0.556 0 0)'
  accent: 'oklch(0.97 0 0)'
  accent-fg: 'oklch(0.205 0 0)'
  border: 'oklch(0.922 0 0)'
  input: 'oklch(0.922 0 0)'
  sidebar: 'oklch(0.985 0 0)'
  sidebar-fg: 'oklch(0.145 0 0)'
  positive: 'oklch(0.49 0.192 149.58)'
  warning: 'oklch(0.53 0.152 70.88)'
  note: 'oklch(0.9619 0.058 95.62)'
  destructive: 'oklch(0.46 0.187 25.74)'
  dark-background: 'oklch(0.145 0 0)'
  dark-foreground: 'oklch(0.985 0 0)'
  dark-card: 'oklch(0.205 0 0)'
  dark-border: 'oklch(1 0 0 / 10%)'
  dark-input: 'oklch(1 0 0 / 15%)'
  dark-positive: 'oklch(0.7227 0.192 149.58)'
  dark-warning: 'oklch(0.7785 0.152 70.88)'
  dark-destructive: 'oklch(0.77 0.136 24.63)'
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: '24px'
  title:
    fontFamily: 'inherit'
    fontSize: '16px'
    fontWeight: 500
    lineHeight: '24px'
  label:
    fontFamily: 'inherit'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
  label-strong:
    fontFamily: 'inherit'
    fontSize: '14px'
    fontWeight: 500
    lineHeight: '20px'
  section-title:
    fontFamily: 'inherit'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: '28px'
  page-title:
    fontFamily: 'inherit'
    fontSize: '24px'
    fontWeight: 600
    lineHeight: '32px'
  caption:
    fontFamily: 'inherit'
    fontSize: '12px'
    fontWeight: 500
    lineHeight: '16px'
rounded:
  input: '12px'
  button: '24px'
  card: '24px'
  card-sm: '16px'
  card-xs: '12px'
  pill: '9999px'
spacing:
  1: '4px'
  2: '8px'
  3: '12px'
  4: '16px'
  5: '20px'
  6: '24px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-fg}'
    rounded: '{rounded.button}'
    height: '36px'
    padding: '0 12px'
    typography: '{typography.label-strong}'
  button-primary-hover:
    backgroundColor: 'color-mix(in oklch, oklch(46% 0.214 259.815) 80%, transparent)'
    textColor: '{colors.primary-fg}'
    rounded: '{rounded.button}'
    height: '36px'
    padding: '0 12px'
  button-outline:
    backgroundColor: 'transparent'
    textColor: '{colors.primary}'
    rounded: '{rounded.button}'
    height: '36px'
    padding: '0 12px'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.foreground}'
    rounded: '{rounded.input}'
    height: '36px'
    padding: '0 12px'
  card:
    backgroundColor: '{colors.card}'
    textColor: '{colors.card-fg}'
    rounded: '{rounded.card}'
    padding: '24px 24px'
  badge:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-fg}'
    rounded: '{rounded.card-sm}'
    height: '20px'
    padding: '0 8px'
---

# Design System: Linket

## Overview

**Creative North Star: "The Creator's Counter"**

Linket's interface is a shop counter, not a showroom. The counter is where goods are
laid out, where the transaction happens, and where the person behind it stands all day.
That means the chrome is quiet and the products are loud: our own UI should recede so a
creator's links, products, orders and payouts are the most visible thing on screen. The
dashboard is a working surface — scannable at a glance, dense where density helps,
never decorative for its own sake.

The system is semantic-token driven end to end. Nothing in a component is allowed to
name a raw color; every surface, border and label resolves through the `--be-*`
variables that a theme supplies. The default record is neutral and near-achromatic
(white paper, ink-grey text, hairline borders) with exactly one chromatic accent — a
working blue — reserved for actions. Dark mode is a first-class twin, not an afterthought:
it remaps the same token names rather than introducing new ones.

Expressiveness is delegated, not absent. A creator's public page is theirs to make
loud; the dashboard that builds it stays restrained. When a decision is close, choose
the quieter surface.

**Key Characteristics:**

- Semantic tokens only — no raw color values in components
- One working blue as the single decorative accent; status colors are earned by meaning
- Flat by default, separated by a 1px ring rather than shadow
- Generous, pill-like control radius (24px) against 12px fields and 16px badges
- 4px spacing grid; 24px card padding; 14px/16px working type sizes
- Logical properties everywhere — the UI is RTL-ready by construction

## Colors

A quiet, near-achromatic palette with one working accent: color means _action_ or
_state_, never decoration.

### Primary

- **Counter Blue** (`oklch(46% 0.214 259.815)`): the only accent. Fills primary
  buttons, draws focus outlines, marks progress, tints outline-button borders and
  active nav. Used wherever the user is meant to act. The lightness is pinned so the
  accent clears WCAG AA in both directions — accent text on white and near-white
  labels on the accent both measure ≥ 4.5:1.
- **Counter Blue, Light** (`oklch(88.2% 0.059 254.128)`): the dark-mode equivalent —
  the same blue lifted for legibility on a near-black ground. Primary foreground on it
  flips to `oklch(0.2478 0 0)`.

### Tertiary — Status & Semantics

Chromatic color is spent only on meaning:

- **Confirm Green** (`oklch(0.49 0.192 149.58)`): positive outcomes — success
  badges, positive buttons, info-block accents. Always paired with a 10–20% wash of
  itself, never a solid slab behind text. Darkened for AA (near-white labels on the
  solid tone measure ≥ 4.5:1); the dark scheme keeps `oklch(0.7227 0.192 149.58)`,
  where the token is text on a near-black ground rather than a fill.
- **Caution Amber** (`oklch(0.53 0.152 70.88)`): warnings and attention states, with
  the same AA darkening and the same dark-scheme exception
  (`oklch(0.7785 0.152 70.88)`).
- **Notice Cream** (`oklch(0.9619 0.058 95.62)`): the quietest status tone, for
  informational callouts that must not read as an alert.
- **Alarm Red** (`oklch(0.46 0.187 25.74)` light, `oklch(0.77 0.136 24.63)` dark):
  destructive actions and form errors. Solid fill only on `danger` buttons;
  otherwise a 10% wash with red text. The token has a light and a dark scheme
  value — AA-dark in light mode, AA-bright in dark mode — so solid fills take a
  `text-primary-foreground` label (near-white in light, ink in dark) that clears
  4.5:1 in both schemes.

### Neutral

- **Counter Slab** (`oklch(0.985 0 0)`): the sidebar ground — a half-step off page white
  so navigation reads as a separate plane without a heavy border.
- **Sheet White** (`oklch(1 0 0)`): cards, popovers and the page background. Cards are
  the _same_ white as the page; they are distinguished by their ring, not by tone.
- **Soft Ink** (`oklch(0.2478 0 0)`): primary text. Never pure black — the system is
  tinted-neutral by construction, not `#000`.
- **Counter Ink** (`oklch(0.145 0 0)`): sidebar text and the dark-mode page ground.
- **Label Grey** (`oklch(0.556 0 0)`): secondary and placeholder text, card
  descriptions. This is the floor for small text — lighter loses contrast.
- **Hairline Grey** (`oklch(0.922 0 0)`): borders and dividers, light mode. In dark mode
  this becomes `oklch(1 0 0 / 10%)`, a translucent white at 10%.
- **Panel Grey** (`oklch(0.967 0.001 286.375)`): the secondary-button fill and other
  quiet-but-present surfaces; slightly cooler than the muted greys.
- **Touch Grey** (`oklch(0.97 0 0)`): hover and selected washes. Never a resting state.

### Named Rules

**The Token-Only Rule.** No raw color ever appears in a component. `text-muted-foreground`,
never `text-gray-200`. If a value isn't in the token set, the token set gets a new
entry — components don't get a hard-coded escape hatch.

**The Single Accent Rule.** Counter Blue is the only decorative accent on a screen.
Status colors may appear only when they report real state. If you need a second
brand color to make a screen work, the screen's hierarchy is wrong, not its palette.

## Typography

**Display Font:** no distinct display face — display sizes reuse the body family.
Headings and marketing type run on the same stack as body copy, which is why the
dashboard reads as instrumentation rather than branding. Display _sizes_ (30–48px)
exist only on public storefront and landing surfaces; see Hierarchy.

**Body Font:** the theme-selected family, defaulting to the system UI stack
(`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
'Helvetica Neue', Arial, sans-serif`). A theme may substitute a Google font, loaded at
weights 400/500/600/700 and bound via `--be-font-family`.

**Label/Mono Font:** `--font-mono` (Tailwind's default mono stack) for code, IDs and
numeric columns.

**Character:** a plain, high-legibility UI stack with no personality of its own — which
is the point. The type is deliberately characterless so creator content carries the
voice. Weight does the work that size does not: 400 for prose, 500 for anything
interactive or titled, 600 available for emphasis.

Note: `@fontsource-variable/inter` is declared in `package.json`, but no import of it
was found in the source. The rendered default is the system stack above. Adding Inter
would be a change to this file, not an extraction from it.

### Hierarchy

Headings sit above the working scale and are named by role, never chosen by size:

- **Page title** (600, 24px, 32px): the single top heading on a dashboard screen —
  `text-2xl font-semibold tracking-tight`.
- **Section title** (600, 20px, 28px): dialog, panel and subsection headings —
  `text-xl font-semibold`.
- **Subsection title** (600, 18px, 28px): card and block headings inside a section —
  `text-lg font-semibold`.
- **Display** (30–48px, 600): `text-3xl`–`text-5xl`, public storefront and landing
  only. Never inside the dashboard.

Below them, the working scale:

- **Body** (400, 16px, 24px): default reading size for prose and form content.
  Inputs opt out deliberately — `text-base` on mobile (16px prevents iOS zoom),
  dropping to `text-sm` (14px) at the `md` breakpoint.
- **Title** (500, 16px, 24px): card and panel titles (`Card.Title`). Same size as body;
  weight is the only signal.
- **Label** (400, 14px, 20px): the workhorse. Table cells, list rows, sidebar items,
  nav links, and button text all sit at 14px.
- **Label Strong** (500, 14px, 20px): buttons, badges, active nav items, table cells
  marked `font-medium`.
- **Caption** (500, 12px, 16px): badges, `xs` buttons, chart ticks, tight metadata.
- **Avatar initials** (500): the one sub-12px text in the system. `Avatar` steps its
  fallback with its own container — 32px→14px, 24px→12px, 18px (`size="xs"`)→10px.
  It is a component scale, not a type role: never hand-set `text-[10px]` to imitate
  it, pass `size` instead.

### Named Rules

**The Two-Size Rule.** Working UI runs on exactly two sizes: 16px for reading and
input, 14px for controls, tables and navigation. 12px is for badges and metadata only.
If you're reaching for a third working size, the content wants to be restructured, not
rescaled. Headings are exempt because they are named by role — a page title is a page
title, not a size you picked. Between 12px and 16px there is no step: never reach for
13px or 15px.

**Device-Chrome Exemption.** The store editor's phone preview draws a real iPhone 14
Pro — status bar, Dynamic Island, home indicator. That clock is a drawing of
hardware, not UI type: it keeps the device's own 15px, is `aria-hidden` and purely
decorative, and lives as `PHONE_STATUS_BAR_TIME_FONT_SIZE` in
`phone-preview.constants.ts` next to the rest of the geometry. It is the only
sanctioned 15px in the system; never copy that value into working UI.

**The Weight-First Rule.** Establish hierarchy with weight before size. Titles and body
are both 16px; they differ by 100 weight. Reserve size jumps for genuine section
breaks.

## Public storefront contract

The public storefront uses the same component language as the dashboard, but its
creator appearance is resolved through a separate semantic token realm. The
appearance resolver maps creator settings to these `--biolink-*` values and then
remaps the shared `--be-*` primitives inside the storefront:

| Concern | Storefront token | Shared primitive mapping |
| --- | --- | --- |
| Primary text | `--biolink-text` | `--be-foreground` |
| Muted text | `--biolink-muted-text` | `--be-muted-foreground` |
| Main surface | `--biolink-surface` / `--biolink-surface-strong` | `--be-background` / `--be-card` |
| Quiet surface | `--biolink-surface-muted` | `--be-muted` / `--be-secondary` |
| Hairline edge | `--biolink-border` | `--be-border` / `--be-input` |
| Action accent | `--biolink-accent` | `--be-primary` |
| Action foreground | `--biolink-accent-foreground` | `--be-primary-foreground` |

Creator appearance must not repaint the dashboard globally. Storefront surfaces
use one shared ring (`biolinkSurfaceEdgeClassName`) instead of stacking borders
and shadows. Resting creator, About, product and service surfaces stay flat;
appearance-controlled button depth is applied only where an action or preset
explicitly calls for it.

### Shared buyer-card anatomy

`ProductCard` is the canonical catalog card for public digital products and
services. Implementations preserve this order:

1. 16:9 media, with an optional type/category overlay.
2. Two-line title, followed by optional description and metadata.
3. Price, free, or quote semantics in the footer.
4. Exactly one primary View/Buy/Inquiry action.

Cards use `rounded-card`, semantic foreground/background tokens, and a visible
focus ring for interactive content. On small screens the catalog remains a
single-column flow; at larger widths the existing responsive grid may expand
without changing card anatomy. Do not introduce a second public card component
for a route-specific variant.

### Component and state handoff

The executable [`ProductCard` Storybook fixture](resources/client/digital-products/shared/product-card.stories.tsx)
is the review surface for the shared card contract. It covers the reusable
published, carousel/metadata, and missing-cover/quote states without creating
route-specific card markup.

| State | Required behavior |
| --- | --- |
| Published | Show the 16:9 cover, two-line title, optional description/meta, price, and one primary action. |
| Carousel | Keep previous/next and image-position controls keyboard reachable; reveal controls for coarse pointers and focus. |
| Missing cover | Preserve card anatomy and provide the shopping-bag fallback instead of collapsing the media region. |
| Quote/free | Keep the footer action singular while allowing `Free` or `Request a quote` price semantics. |
| Focused | Title links and carousel controls expose a visible semantic-token focus outline. |

Review the fixture at 360, 375, 430, 768, 1024, and 1440px. At 360–430px
the card stays one column with no horizontal overflow; at 768px and above the
parent grid may add columns but the card anatomy and action order do not change.
At 200% zoom and keyboard-only navigation, all actions remain reachable and
the title remains readable without clipping beyond its two-line limit.

## Layout

The dashboard is a viewport, not a document. `DashboardLayout` renders a `h-screen h-dvh`
flex column: `100vh` is the compatibility fallback and `100dvh` follows the visible
mobile viewport as browser chrome expands or collapses. Scrolling happens inside
content regions rather than on the page. This keeps panels, tables, the sidebar and
the mobile bottom navigation anchored to the visible viewport.

- **Content container:** `max-w-7xl` (80rem), centered, `py-4` (16px) with `gap-5`
  (20px) between stacked sections — the standard page rhythm.
- **Sidebar:** `w-3xs` (16rem / 256px) expanded, collapsing to a 60px icon rail
  (`w-15`), and becoming an off-canvas `Drawer` on mobile. Items are `px-3 py-2`
  (12px/8px) at 14px.
- **Navbar:** `gap-4 px-2` (16px / 8px). The `default` variant adds `border-b py-2`;
  `inset` and `floating` variants drop the border and let the frame float on a muted
  ground instead.
- **Section headers:** `DashboardLayout.SectionHeader` is the one 56px
  (`h-14`) header bar, with `border-b`, `--section-spacing` inline padding,
  and `SectionTitle` at 24px/600. Use `render={<h1 />}` for page titles;
  breadcrumbs stay muted/normal-weight, while the title carries emphasis.
  Creator forms show one parent breadcrumb and a chevron on desktop, a
  named back icon on mobile, and primary actions on the inline end. Keep
  the same divider in Insights and Store Editor. Tabs below the header
  align to `--section-spacing`. Avoid hand-removing the divider or adding
  duplicate back paths, oversized titles, or extra header rows.
- **Section variants:** three sanctioned frames — `default` (bordered), `inset`
  (floating content inside a padded shell), `floating` (everything on `bg-muted` with
  8px gaps). Pick one per screen; don't mix within a screen.
- **Spacing rhythm:** a strict 4px base grid (`--spacing: 0.25rem`). Component internals
  use 8/12/16; card padding is 24; section gaps are 20.
- **Breakpoints:** Tailwind defaults — `sm` 640px, `md` 768px, `lg` 1024px,
  `xl` 1280px.
- **RTL:** `components.json` sets `"rtl": true`, and the codebase uses logical
  properties throughout (`px`/`py`, `ms`/`me`, `ps`/`pe`, `start`/`end`). Never write a
  physical `left`/`right` margin or padding in shared components.

### Named Rules

**The One-Container Rule.** Every dashboard page centers on `max-w-7xl`. A page that
needs more width is a page that needs a table with horizontal scroll, not a wider
container.

**The Editor Container.** A creation form that benefits from a live preview is the
one exception to the rule above: it centers on `max-w-6xl` and splits into
`xl:grid-cols-[minmax(0,1fr)_26rem]`, form on the left, a sticky preview rail on the
right. The narrower measure keeps the field column readable while the rail holds a
real preview bound to form state. The rail sticks at the same `xl` breakpoint the
grid splits at (`xl:sticky xl:top-6`) — a sticky that begins earlier than the grid
column is a promise the layout does not keep.

**The Builder Surface Rule.** The store editor uses `bg-card` for the working form
surface and `bg-muted/30` for the surrounding preview rail. A visible
`border-border/60` split keeps the two jobs distinct in dark mode, where
`bg-background` alone would flatten the editor into one black plane. Content/About/
Appearance navigation uses the default segmented tabs variant so the active state
has a card surface in both themes; icons clarify the section without replacing its
text label.

## Elevation & Depth

The system is flat by default and separates surfaces with a hairline ring, not with
shadow. `Card` carries no `box-shadow` at all — it uses `ring-1 ring-foreground/10`,
a 10% foreground outline that reads correctly on both light and dark grounds without
a second token.

Shadows exist, but they belong to layers that genuinely float above the plane:
dialogs, popovers, dropdowns, tooltips and drawers. Because those are transient, the
shadow vocabulary is allowed to differ between theme presets without breaking the
system — the resting surface never moves.

### Shadow Vocabulary

- **Ambient float** (default scale: `0 1px 3px 0 rgb(0 0 0 / 0.1),
0 1px 2px -1px rgb(0 0 0 / 0.1)`): dropdowns and popovers at rest; stepping up to
  `0 4px 6px -1px` for menus and `0 10px 15px -3px` for dialogs.
- **Preset override — brutalist:** hard offset, no blur — `4px 4px 0 0` in solid black.
  An intentional reskin; permitted only under `data-theme-preset="brutalist"`.
- **Preset override — tangerine / soft-pop:** softer, lower-contrast ambient shadows
  tuned to their warmer grounds.

### Named Rules

**The Ring Rule.** Containers are separated by `ring-1 ring-foreground/10`. If two
surfaces need to be told apart and a ring won't do it, they aren't the same level of
the hierarchy — restructure rather than add a shadow.

**The Flat-By-Default Rule.** Resting surfaces have no shadow. Shadow is a response to
state (hover, open, elevated), never a starting condition.

## Shapes

One radius family, three members, remapped as a unit.

- **Controls are pills.** `rounded-button` resolves to 24px. At the default 36px
  control height that exceeds half-height and clamps — so buttons render as full pills.
  The same token governs sidebar menu items, so navigation reads as a row of soft pills
  too.
- **Fields are softly squared.** `rounded-input` resolves to 12px — visibly tighter
  than buttons, so an input never reads as a button.
- **Cards are generous.** `rounded-card` is 24px, stepping down to `card-sm` (16px) for
  badges and `card-xs` (12px) for nested elements.
- **Radius is a theme dimension, not a component decision.** The `radius-none` /
  `radius-sm` / `radius-md` / `radius-lg` utility classes remap _every_ component radius
  at once. Choose one per theme; never override a radius inline on a single component.
- **Borders are 1px, always.** `--default-outline-width: 1px`. There is no 2px border in
  the system; emphasis comes from color or ring, not thickness.
- **Cards clip.** `Card` is `overflow-hidden`, so first/last child images inherit the
  card radius automatically.

### Named Rules

**The Three-Radius Rule.** Only 24px (controls/cards), 16px (badges) and 12px (fields)
exist. A fourth value means a component is being styled outside the system.

**The Square Exception.** A theme deliberately set to all-zero radius — selected as
"Square" in admin — is the one sanctioned exception to the three-radius rule, since
`.radius-none` ships in core CSS and the brutalist preset calls for it.

## Components

Precise and firm: solid tokens, tight internal rhythm, visible focus, and a 1px press
that confirms every click. Nothing bounces, nothing floats at rest.

### Buttons

- **Shape:** pill (24px radius, clamping to full-round at control height).
- **Sizes:** `xs` h-6, `sm` h-8, `default` h-9, `lg` h-10, plus icon variants at
  24/32/36/40px. Horizontal padding 8–16px by size; `gap-1.5` (6px) to icons.
- **Primary:** `bg-primary text-primary-foreground`, 14px/500, `border-transparent`.
  This is the default — a flat button with no explicit color resolves to primary.
- **Outline:** transparent fill, `border-primary/50 text-primary`, hovering to
  `bg-primary/4`.
- **Ghost:** no fill, no border, hovering to `bg-accent`.
- **Link:** no box at all — `text-primary` with a 4px underline offset on hover.
- **Colors:** `default` (secondary fill), `primary`, `danger`, `positive`, `white`.
  `positive` mirrors the primary recipe using its status token (`bg-positive
text-primary-foreground`). `danger` mirrors it too: a solid destructive fill
  (`bg-destructive`) with a `text-primary-foreground` label. The token is AA-dark in
  light mode and AA-bright in dark mode, so the scheme-aware label clears 4.5:1 on
  the solid fill in both schemes — this reverses the earlier lighten-fill wording,
  which existed because the old token was too light to carry a near-white label.
- **Hover / Press:** fill drops to 80% opacity (`hover:bg-primary/80`); `positive`
  holds at 95% (`hover:bg-positive/95`, same on `data-pressed`) so its label keeps
  4.5:1 on the hover fill. Press adds `translate-y-px` — one pixel down, no transform
  animation.
- **Focus:** `outline-2 outline-solid` in the primary color, from the global base-layer
  `outline-color`. Always visible, never removed.
- **Disabled:** `opacity-50` with pointer events off.

### Inputs / Fields

- **Style:** `h-9` (36px), `rounded-input` (12px), `border border-input`, `px-3`,
  transparent background on light and `bg-input/30` on dark.
- **Text:** 16px on mobile, 14px from `md` up — the iOS-zoom guard.
- **Focus:** border shifts to `border-foreground/20` on hover; focus uses the global
  primary outline.
- **Placeholder:** `text-muted-foreground`.
- **Error:** `aria-invalid:border-destructive` — the border itself carries the error,
  no icon required.
- **Disabled:** `bg-input/50 opacity-50` light, `bg-input/80` dark.

### Cards / Containers

- **Character:** the unit of grouping. Flat white sheet, ringed, generous.
- **Corner Style:** `rounded-card` (24px), with `overflow-hidden`.
- **Background:** `bg-card` — identical to the page background.
- **Shadow Strategy:** none. See the Ring Rule.
- **Border:** `ring-1 ring-foreground/10`.
- **Internal Padding:** `py-6` (24px) with header/content `px-6` (24px); `gap-6`
  (24px) between blocks. The `sm` size tightens to `py-4` / `px-4` / `gap-4`.
- **Anatomy:** `Card.Header` → `Card.Title` (16px/500) → `Card.Description`
  (14px, `text-muted-foreground`) → `Card.Content` → `Card.Footer`. The action slot
  pins to the header's trailing top corner.

### Badges

- **Shape:** `h-5` (20px), `rounded-card-sm` (16px), `px-2`, 12px/500.
- **Status variants:** `destructive` and `positive` use a 10% wash of their token with
  full-strength text — a tint, never a solid slab.
- **Neutral variants:** `default` (solid primary), `secondary` (panel grey),
  `outline`, `ghost`, `link`.

### Navigation

- **Sidebar item:** `rounded-button px-3 py-2`, `h-9`, 14px. Icon `size-4` (16px),
  `gap-2` (8px).
- **States:** hover and current-page both resolve to `bg-sidebar-accent` +
  `text-accent-foreground`; current page adds `font-medium` as the only extra signal —
  position, fill and weight together, no left-border indicator.
- **Collapsed:** the icon rail is `size-8` (32px) square items — same fill behaviour.
- **Mobile:** becomes a left `Drawer` with backdrop; a bottom nav bar covers primary
  destinations.

### Signature: The Press

Every interactive element in the system shares `active:translate-y-px` (buttons) or a
fill-to-80% response (fills that can't move). It is the system's entire motion
vocabulary for input — no scale, no bounce, no spring. Motion elsewhere is
`transition-button` / `transition-colors` at 150ms on the standard
`cubic-bezier(0.4, 0, 0.2, 1)`.

## Do's and Don'ts

### Do:

- **Do** express every color through a semantic token — `bg-primary`,
  `text-muted-foreground`, `border-border`.
- **Do** separate surfaces with `ring-1 ring-foreground/10` and leave them shadowless
  at rest.
- **Do** build on the 4px grid: 12/16px inside controls, 24px inside cards, 20px
  between sections, `max-w-7xl` for page content.
- **Do** use logical properties (`ps-`/`pe-`/`ms-`/`me-`) so the UI keeps working in RTL.
- **Do** keep focus visible — `focus-visible:outline-2` in primary on every interactive
  element.
- **Do** keep 16px for reading and input, 14px for controls and tables, 12px for badges.
- **Do** establish hierarchy with weight (400 vs 500) before changing size.
- **Do** give status color a real status to report — green means confirmed, red means
  destructive or invalid.

### Don't:

- **Don't** hard-code a hex, `rgb()` or a Tailwind palette class like `text-gray-200`
  in a component.
- **Don't** put a resting shadow on a card, panel or section.
- **Don't** nest a card inside a card — use `Card.Content` sections or a plain
  bordered group.
- **Don't** invent a radius, a border width or a type size outside the scales above.
- **Don't** use `#000` or `#fff` directly for text or grounds; the neutrals are tinted
  (`Soft Ink`, `Sheet White`) and pure values break the ladder.
- **Don't** add a second accent color to a screen, or use status colors decoratively.
- **Don't** reach for physical directional styles (`ml-`, `mr-`, `left-`, `right-`) in
  shared components.
- **Don't** remove or soften the focus outline, and don't add bounce or elastic
  easing — the press is the only input motion.
