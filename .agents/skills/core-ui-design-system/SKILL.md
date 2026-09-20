---
name: core-ui-design-system
description: Use when writing, adding, modifying, or reviewing any React UI/UX in this project — new components, pages, layout, Tailwind styling, fonts, or integrating shadcn registry blocks that don't match the app's design language.
---

# Core UI Design System

## Core Principle

**Output must look native.** New UI must be indistinguishable from the existing components: same tokens, same layout rhythm, same component vocabulary. The core design system is not up for negotiation — AI may browse/adapt block ideas, but when adding code it must stay inside the system. If a choice would make new UI "feel different" from the current app, it is wrong.

## Non-Negotiable Context

- Stack: React 19 + Tailwind CSS v4 + **Base UI** (`@base-ui/react`) + shadcn/ui. Do NOT introduce Radix.
- shadcn-style: `base-luma` (`components.json`). Base primitives, not Radix.
- Aliases: components from `@shadcn/*` (installed in `common/foundation/resources/client/shadcn/`), utils/UI helpers from `@ui/*` (e.g. `@ui/utils/cn`, `@ui/i18n/trans`, `@ui/settings/use-settings`). Check `tsconfig.json` paths before importing.
- Global CSS: `resources/client/app.css` → imports `common/foundation/resources/client/core/common.css` → `common-tailwind.css` + `presets/*`.

## 1. Semantic Tokens Only — No Raw Values

Map colors/shadows/radius to semantic tokens — these are wired to `--be-*` vars via the `@theme inline` block in `common/foundation/resources/client/core/common-tailwind.css`. Theme presets (`soft-pop`, `brutalist`, `tangerine`) switch the whole app via `data-theme-preset`; raw values break that and dark mode.

**Allowed everywhere:**

| Use | Classes |
|---|---|
| Surfaces | `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-secondary`, `bg-accent` |
| Text | `text-foreground`, `text-muted-foreground`, `text-primary`, `text-accent-foreground`, `text-card-foreground` |
| Accent | `bg-primary`, `text-primary`, `bg-primary/10`, `ring-primary/10`, `border-border` |
| States | `bg-hover`, `bg-selected`, `bg-focus` (opacity tokens) |
| Border/ring | `border-border`, `ring-1 ring-foreground/10` (Card's native edge) |
| Radius | `rounded-card`, `rounded-card-sm`, `rounded-card-xs`, `rounded-input`, `rounded-button` |
| Shadows | `shadow-sm` … `shadow-2xl` from preset (deliberately subtle) |
| Charts | `chart-1` … `chart-5` for any chart/data-viz color |
| Status | `bg-positive/10`, `text-positive`, `text-warning`, `text-destructive` (via Badge/Alert variants) |

**Forbidden:** hex codes (`#fff`), `rgb(...)`/`oklch(...)` inline, Tailwind color literals (`bg-blue-500`, `text-gray-400`, `bg-white/5`) as design decisions, arbitrary radius/shadow (`rounded-[20px]`, `shadow-[0_0_30px...]`). Layout utilities (spacing, sizing, grid) are fine; visual styling is not.

## 2. Layout Rhythm

Match the existing cadence. Spacing flows from the component APIs first; custom layout uses the standard scale.

- `gap-*` for spacing — **never** `space-x-*` / `space-y-*`.
- `size-*` when width and height are equal (`size-4`, `size-10`) — not `w-4 h-4`.
- `truncate` shorthand, not `overflow-hidden text-ellipsis whitespace-nowrap`.
- Keep compact density: `text-sm` body, `font-medium` labels, `h-9`/`h-10` inputs like existing forms. No huge `py-16` sections that float off the page's established density.
- Equalize action columns with `mt-auto` on pinned CTAs so baselines align across grid cells.
- No random negative margins / absolute heights to "tune" things; use the component and variants instead.
- Use `cn()` for conditional classes (`@ui/utils/cn`), not template-literal ternaries.

## 3. Component-First — Check Before You Build

**If a component exists in `@shadcn/*`, use it. Delete before add.** 36 are installed: `button`, `button-group`, `badge`, `card`, `dialog`, `alert-dialog`, `drawer`, `sheet`, `popover`, `dropdown`, `tooltip`, `tabs`, `toggle`, `toggle-group`, `accordion`, `collapsible`, `item`, `empty`, `alert`, `breadcrumb`, `separator`, `skeleton`, `spinner`, `progress`, `meter`, `chart`, `table`, `avatar`, `scroll-area`, `command`, `autocomplete`, `context-menu`, `attachment`, `image-crop`, `navigation-menu`, `toast` + full `forms/` set (`input`, `select`, `combobox`, `checkbox`, `switch`, `textarea`, `slider`, `number-field`, `radio-group`, `input-group`, `field`, `label`, `form`).

Composition rules (same as the `shadcn` skill):
- Full Card API: `CardHeader / CardTitle / CardDescription / CardContent / CardFooter`.
- `Badge` for status pills; `Alert` for callouts; `Empty` for empty states; `Skeleton` for loading; `Separator` instead of `<hr>`/border divs; `Spinner` + `disabled` for button loading (Button has no `isLoading`).
- Forms: `FieldGroup` + `Field` + `FieldLabel`; `InputGroup`/`InputGroupInput`/`InputGroupAddon`; `ToggleGroup` for 2–7 option sets (not looped Buttons). Validation: `data-invalid` + `aria-invalid`.
- 2–5 toggle options → `ToggleGroup` or `ButtonGroup variant="segmented"`.
- Dialog/Drawer/Sheet always need a Title (`sr-only` ok) and trigger via `render`/`asChild`.
- Icons: `lucide-react` (project `iconLibrary`). Pass icon components, `data-icon="inline-start|inline-end"` inside buttons, no sizing classes on icons (components handle it).

**Implicit instances:** before using a `variant` or `color`, confirm it exists (e.g. Button uses `variant` + `color` + `size`; not Base UI names). Check the closest existing story file (`*.stories.tsx`) or component source for the real API.

Read at least one existing implementation of the pattern you're adding before writing yours. If your new code doesn't use the same primitives as the neighbors, stop and reuse theirs.

## 4. Veto List — "Vibe Code" Effects

These are the most common AI violations. **Do not add them.** If a registry block you're adapting uses them, remove them during integration.

- Glassmorphism / backdrop blur on surfaces (`backdrop-blur-*` outside the known hero glow pattern).
- Gradient text or gradient fills as decoration (`bg-clip-text text-transparent`).
- Added drop/glow shadows not in the theme (`shadow-[...]`, `drop-shadow-xl`, neon glows).
- Arbitrary radius (`rounded-[20px]`, `rounded-50`).
- `bg-white/5`, `bg-black/40` overlays.
- Hover scale / rotate / translate flourishes on cards or list items.
- Random entrance animations or spin/pulse micro-animations; `tw-animate-css` classes only where existing code uses them (e.g. `animate-in fade-in` on price flips) and always guard with `motion-reduce:animate-none`.
- New font imports or font-family overrides (see Typography).
- Dark-mode-only hacks: the token system gives dark mode free — never write `dark:` overrides on brand-new UI.

**One allowed decorative exception:** the `blur-3xl` + `bg-primary/opacity` glow blob used behind hero sections (`hero-simple-centered.tsx:53`). Copy that exact pattern if a hero is being built; don't invent new blur styles elsewhere.

## 5. Integrating Registry Blocks (@7ovr, @shadcnblocks, @efferd, shadcn official)

Blocks are **patterns to lift, not files to paste**. They are Radix/`@/*`-flavored and will clash with this Base UI project.

1. Review the block visually/structure only (fetch its code for reference, or copy to a scratch file — never commit it raw).
2. Extract layout structure (grid/columns, section order) — that's the reusable idea.
3. Rebuild the section with **this project's primitives and tokens only** (`@shadcn/*`, semantic classes).
4. Convert `asChild` → Base UI `render` where a trigger is needed.
5. Delete: Radix imports, hardcoded `@/components/ui` paths (→ `@shadcn/*`), added CSS that duplicates presets, icons not from `lucide-react`.
6. Wrap user-facing strings in `<Trans message="..." />` (`@ui/i18n/trans`).

Same for shadcn CLI installs: run in a scratch dir, then port the section by hand following 1–6. Never leave un-integrated block CSS/JS in the bundle.

## 6. Typography

- Font: Inter Variable, loaded globally by the app (`@fontsource-variable/inter`). No new font packages.
- Family override: `--be-font-family` on `html` (`common.css:27`). Don't set `font-family` per-component.
- Use existing scale: headings match neighbors (`text-3xl`~`text-5xl` hero, `text-lg`/`text-xl` section titles), body `text-sm`/`text-base`, labels `text-sm font-medium`. No bizarre `text=[30px]`.

## 7. Colors & Presets — Non-Negotiable

The app supports user-selectable theme presets (`soft-pop` default, `brutalist`, `tangerine`) that redefine every token, plus light/dark (`data-theme-preset` + `.dark`). Consequences:

- Never hardcode a "brand color" outside tokens; the preset system is the brand.
- Semantic tokens must resolve under every preset and under `.dark` — verify with `soft-pop` dark at minimum.
- Charts: use `chart-1..5`; never per-viz hex.

## Checklist (must all pass before the task is done)

- [ ] Every color/shadow/radius is a semantic token; no hex, no `rounded-[...]`, no `shadow-[...]`
- [ ] Components reused from `@shadcn/*`; none reinvented, block integrations stripped to the project primitives
- [ ] Spacing uses `gap-*` and `size-*`; no `space-y-*`, no `w-4 h-4`
- [ ] No vetoed effects (backdrop blur, gradient text, glow shadows, hover transforms, random animations)
- [ ] Zero `dark:` overrides on new UI; dark mode is free
- [ ] Typography uses Inter + existing scale; no new fonts
- [ ] Strings wrapped in `<Trans />`; i18n convention respected
- [ ] Exported/copy code actually compiles with this project's aliases and Base UI APIs

## Red Flags — STOP

- "The block used `shadow-[0_0_40px_rgba(...)]`, it looked cool" → the preset shadows are intentionally subtle; strip it.
- "I'll use `bg-white/5` for contrast" → use `bg-muted`/token.
- "I'll just quickly diverge for this one screen" → one exception becomes the style drift you're fighting.
- "Radix is fine here" → Base UI is the base; Radix will clash and duplicate.
- "A new font makes it feel premium" → Inter is the system; extra fonts bloat the bundle and break rhythm.
- "I'll hand-roll the toggle instead of ToggleGroup" → 2–7 options → ToggleGroup, period.
- "space-y-6 is fine" → `flex flex-col gap-6` is the convention.

## Quick Reference

| Need | Use |
|---|---|
| Surface | `Card*` / `bg-card` + `ring-1 ring-foreground/10` `rounded-card` |
| Action | `Button` with real `variant`/`color`/`size` |
| Option set (2–7) | `ToggleGroup` or `ButtonGroup variant="segmented"` |
| Status pill | `Badge` variant |
| Overlay | `Dialog`/`AlertDialog`/`Drawer`/`Sheet` |
| Empty/loading | `Empty` / `Skeleton` / `Spinner` |
| Chart | `chart` wrapper (Recharts) + `chart-1..5` |
| Divider | `Separator` |
| Callout | `Alert` |
| Data table | `table` (TanStack wrapper) |