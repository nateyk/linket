# My Portal Library Home UX — Design

Date: 2026-10-17  
Status: approved in chat (approach A + single scrolling library)  
Mode: **Operate** (buyer library) inside Linket DESIGN.md (“Creator’s Counter”)  
Reference: SkillSphere “My purchased courses” main area only (grid + filters) — not its seller sidebar

## 1. Intent

`/my-portal` opens as a **library home**: one wide composition where buyers immediately see what they can continue and download. It is not a recovery tool, not a seller dashboard, and not a fake profile shell.

Success: after email OTP (or while logged in), the first viewport answers “what do I open next?” with one primary Continue action and a scannable course grid.

## 2. Non-goals

- No SkillSphere-style left nav (Profile / Wishlist / Certificates / Create course).
- No marketplace pricing, strikethrough prices, wishlist hearts, or student counts on purchased cards.
- No new backend capabilities in this pass (reuse `/api/v1/public/my-portal/library` + `/api/v1/my-courses` + purchases).
- No redesign of lesson player / course learn chrome beyond shared shell width/tokens.

## 3. Information architecture (single scroll)

1. **Header** (existing MyPortalShell): Linket mark + support affordance.  
2. **Page title**: “My Portal” + one muted line (session / access copy).  
3. **Continue** (if any in-progress course): 1–3 horizontal cards; primary CTA **Continue**.  
4. **Courses**: filter All · In progress · Completed + responsive card grid (1 col mobile, 2 col `sm+`).  
5. **Downloads**: file purchases with remaining counts + **Download** (and receipt/review actions as today).  
6. **Optional account CTA** (portal-only session): one quiet line + Create account — never blocking.

Guest (portal cookie) and logged-in users share this layout; data sources differ under the hood.

## 4. Visual / interaction thesis

- Quiet chrome, loud products (covers + titles), per DESIGN.md.
- Semantic tokens only; `@shadcn/*` Card, Badge, Button, Progress, Tabs or ToggleGroup for filters.
- Cards: cover plane + title + progress + one CTA (**Continue** / **Open**). No price row.
- Filters: pill/toggle pattern matching existing shadcn stories — active = primary.
- Motion: light only (hover/focus on cards, progress fill) — 2 intentional touches max.
- Dark mode: token remaps; do not invent a SkillSphere-only dark skin.

## 5. Components (frontend)

| Piece | Responsibility |
| --- | --- |
| `MyPortalShell` | Wider max width for library; keep brand header/footer |
| `MyPortalLibraryPage` (refactor hub + guest PurchaseOrders into one) | Load data, compose sections |
| `PortalContinueStrip` | In-progress continue cards |
| `PortalCourseCard` | Cover, title, progress, CTA |
| `PortalCourseFilters` | All / In progress / Completed |
| `PortalDownloadList` | Existing download/receipt/review behavior, restyled |

Prefer splitting from the oversized `order-lookup-page.tsx` rather than growing it further.

## 6. States

| State | Behavior |
| --- | --- |
| Loading | Centered Spinner in main |
| Empty library | One empty alert: buy on a creator bio → access here |
| Courses empty / downloads present | Hide Continue; show downloads |
| Downloads empty / courses present | Hide downloads section or empty caption |
| Session expired | Existing request-code path |
| Error loading | Existing warning + retry / new code |

## 7. Copy

- Title: `My Portal`
- Subtitle: `Access everything you purchased — courses and downloads.`
- Filters: `All`, `In progress`, `Completed`
- CTAs: `Continue`, `Open`, `Download`
- Optional: `Create an account with this email to keep progress on all devices.`

All via `<Trans message="..." />`.

## 8. Testing

- Vitest source contracts: Continue strip, filters, no price/wishlist strings, library API still used.
- Manual: desktop + mobile screenshot of `/my-portal` with course + download fixtures.
- Storybook (when running): PortalCourseCard / filters stories if added; else align with existing Card/Tabs stories.

## 9. Storybook

Use Storybook MCP / local Storybook for Card, Tabs, Badge, Progress consistency while building. If Storybook is down, follow committed stories under `common/foundation/resources/client/shadcn/*`.
