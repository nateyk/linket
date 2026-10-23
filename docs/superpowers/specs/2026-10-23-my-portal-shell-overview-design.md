# My Portal — Shell + Overview — Design

Date: 2026-10-23  
Status: approved in chat (Approach A — section shell; Slice 1 = Shell + Overview). **Chrome implementation superseded by** `2026-10-23-my-portal-dashboard-shell-courses-design.md` (floating `DashboardLayout`); section IA + Overview content from this doc still apply.  
Mode: **Operate** (buyer library)  
Visual reference: `C:\Users\Nate\Downloads\digital-product-page-design` portal components + attached screenshots  
Supersedes IA from `2026-10-17-my-portal-library-home-ux-design.md` for navigation (left portal sidebar is now in scope). Access/session rules from `2026-10-17-my-portal-customer-access-design.md` remain in force.

## 1. Intent

Rebuild `/my-portal` as a **sectioned buyer shell** whose home is an **Overview**: welcome, continue learning, library jump cards, and recent orders. One shell serves every later section (courses, downloads, audio, orders, settings) without inventing a second visual system.

Success: after email OTP or logged-in entry, the buyer lands on Overview, sees what to resume, and can jump to Courses / Files / Tracks / Orders through the same sidebar used on every section.

## 2. Scope (Slice 1 only)

**In**

- Portal shell layout: sidebar + main column
- Section routing via `?section=` (`overview` default)
- Sidebar nav + counts (where data exists)
- Overview content: greeting, continue-learning card, three jump cards, recent orders
- Empty / loading / error states for Overview
- Rebuild nav pieces with `@shadcn/*` + Linket tokens (`Trans`, semantic colors)

**Out (later slices)**

- Full Downloads list/detail (Nova-style pack page)
- Audio library list + pack player page
- Orders full table page beyond the Overview “recent” strip
- Account settings form save / notification prefs
- Course player / curriculum chrome redesign
- New backend entitlements, multi-email, or payment changes

Non-overview sections stay navigable in Slice 1 by embedding **existing** library UI where it already exists (courses grid, downloads list, purchases/orders). **Audio library** shows a short empty state until Slice 3. **Settings** does not get a new form yet (auth → `/account-settings`; guest → create account / switch email). Do not block Overview on new APIs.

## 3. Approach

**Section shell (Approach A)** — single `/my-portal` page; `PortalShell` holds `active` section state synced to `?section=`. Matches the v0 `app/my-portal/page.tsx` + `portal-shell.tsx` pattern.

Rejected for Slice 1: separate routes per section (more routing churn); hash-only scroll (cannot express Overview IA).

## 4. Information architecture

| Section id | Label | Slice 1 behavior |
| --- | --- | --- |
| `overview` | Overview | Full Overview UI (this slice) |
| `courses` | My courses | Existing course filters/grid (`my-portal-library-ui`) in the main column |
| `downloads` | Downloads | Existing download list in the main column |
| `audio` | Audio library | Empty state only until Slice 3 |
| `orders` | Orders | Existing purchases/orders list in the main column |
| `settings` | Account settings | Auth → navigate to `/account-settings`; guest → create account / switch email (no settings form in Slice 1) |

Invalid or missing `section` → `overview`. Changing section updates the query string and scrolls main content to top.

## 5. Layout & visual system

- **Page chrome:** keep `MyPortalShell` brand header/footer; widen content to match library (`max-w-6xl` / `max-w-7xl` as today).
- **Grid:** `lg:grid-cols-[260px_minmax(0,1fr)]` — sidebar sticky on desktop; horizontal nav strip or sheet on small screens (reuse existing mobile pattern in `PortalAccountLayout`).
- **Sidebar card:** `Card` + `Avatar` + name/email + `Item`/`Button` nav rows + `Badge` counts + `Separator` before account actions. Active row = muted/selected token (`bg-accent` / `bg-secondary`), not a custom color.
- **Overview blocks:** `Card` for continue learning; three jump cards in a responsive grid; recent orders as `Table` or existing order rows.
- Tokens only: `bg-background`, `bg-card`, `text-muted-foreground`, `ring-1 ring-foreground/10` / card edge — no hex, no purple glow, no second component system.
- Copy: static `<Trans message="..." />` strings.
- Icons: `lucide-react` via existing button/`Item` conventions.

Reference composition (v0): `components/portal/portal-shell.tsx`, `portal-sidebar.tsx`, `OverviewSection` in `portal-sections.tsx`. Rebuild with Linket primitives; do not import the Next mock.

## 6. Data

Reuse existing portal APIs (no new endpoints in Slice 1):

- Guest/portal cookie: `/api/v1/public/my-portal/library` (and existing purchases endpoints already used by `order-lookup-page`)
- Auth: `/api/v1/my-courses` + purchases endpoints already wired

**Overview mapping**

| UI | Source |
| --- | --- |
| Greeting name | Auth user name, else email local-part / “there” |
| Member since | Auth `created_at` if available; omit line for guest if unknown |
| Continue learning | First in-progress course from library/courses payload |
| Courses count | Count of enrolled courses |
| Files count | Count of non-course file purchases / entitlements |
| Tracks count | Count of purchases with `product_type === 'audio'` when the field is present; otherwise show `0` and a muted “No tracks yet” note |
| Recent orders | Last 3 paid purchases; “View all” → `orders` section |

Demo data (`my-portal-demo-data`) may fill empty guest demos only if that path already exists; do not invent a second demo layer.

## 7. Components (frontend units)

| Unit | Responsibility |
| --- | --- |
| `MyPortalShell` | Brand header/footer (keep; widen if needed) |
| `PortalShell` | Section state + `?section=` sync; renders sidebar + active panel |
| `PortalSidebar` | Profile + nav + counts + account actions |
| `PortalOverview` | Greeting, continue card, jump cards, recent orders |
| `PortalSectionHeader` | Title + description (+ optional action) |
| Existing `my-portal-library-ui` pieces | Courses/downloads content for non-overview sections |

Prefer extracting from `order-lookup-page.tsx` rather than growing it further. Recovery OTP UI stays on the same route when forced / unverified.

## 8. States

| State | Behavior |
| --- | --- |
| Loading | Spinner in main column; sidebar skeleton or static chrome |
| Empty library | Overview still shows greeting; continue card hidden; jump cards show `0`; recent orders empty with one muted line |
| No in-progress course | Hide continue card (do not show a hollow placeholder) |
| API error | `Alert` destructive/subtle in main; keep sidebar usable |
| Guest unverified | Existing recovery flow (unchanged access model) |

## 9. Accessibility

- Sidebar is a `nav` with `aria-current="page"` on the active section control.
- Continue CTA is a real link/button to the lesson/course URL already used by the library.
- Progress uses a labeled progressbar (shadcn `Progress`).
- Jump cards are buttons that change section (not dead decorative cards).

## 10. Testing

- Client tests: `?section=` default and switch; Overview hides continue when no in-progress course; invalid section falls back to overview.
- Keep existing portal recovery / library API wiring tests green.
- Manual: desktop + ~360px — sidebar/nav usable; Overview matches reference structure without cloning Next CSS.

## 11. Rollout order after Slice 1

1. Shell + Overview (this spec)  
2. My courses polish + course player  
3. Downloads + Audio library  
4. Orders + Account settings  

## 12. Non-goals reminder

No waveform work on the product storefront player. No seller dashboard changes. No new payment providers. No paste of v0 `components/ui/*` into Linket.
