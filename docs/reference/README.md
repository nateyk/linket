# Reference: next-shadcn-admin-dashboard-baseui

Cloned from https://github.com/arhamkhnz/next-shadcn-admin-dashboard-baseui
Version: studio-admin 2.2.0, Next 16, Base UI 1.8, Tailwind 4, shadcn base-nova

## Purpose
Cheat sheet for Linket UI/UX prod work. Linket is on same stack: React 19, Base UI 1.5, Tailwind 4, shadcn base-luma (package.json:12, components.json:3). Use this template to copy dashboard layouts, theme presets, and Base UI patterns for `resources/client/dashboard/*` and `common/foundation/resources/client/*`.

## What to copy
- `src/components/ui/*` -> `common/foundation/resources/client/shadcn/*`
- `src/app/(main)/dashboard/_components/header|sidebar` -> `common/foundation/resources/client/ui/dashboard/*`, `admin/admin-sidebar.tsx`
- `src/styles/presets/*.css` -> `common/foundation/resources/client/core/presets/` (now imported in `common.css:2-4`)
- `src/app/(main)/dashboard/*` dashboards as inspiration for new Linket analytics/productivity pages

## What NOT to copy
- Next.js App Router (`src/app/layout.tsx`, RSC) - Linket is Vite + react-router
- Biome/Husky - Linket uses oxlint/prettier

## Usage
Set `document.documentElement.dataset.themePreset = 'brutalist'|'tangerine'|'soft-pop'` to test presets (see `src/app/globals.css`).

Presets already imported in `common/foundation/resources/client/core/common.css:2-4`.

Keep this folder for reference, do not import directly in Linket build. Update via `git pull` in `/tmp/next-shadcn-admin-dashboard-baseui` and recopy.

## Linket Base UI status
- Committed b65ea17: oxlint 0, vite build OK, on Base UI
