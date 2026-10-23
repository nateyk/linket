# My Portal — Dashboard Shell + Courses List — Design

Date: 2026-10-23  
Status: approved in chat (Approach 1 — `DashboardLayout` floating shell; then horizontal courses rows)  
Mode: **Operate** (buyer library)  
Visual reference: Account Settings / producer floating `Sidebar` + `dashboard-section`; v0 `CoursesSection` / `CourseCard` for list rows  
Builds on: `2026-10-23-my-portal-shell-overview-design.md` (section IA + Overview content stay; **chrome implementation is superseded** by this spec)  
Access/session: `2026-10-17-my-portal-customer-access-design.md` remains in force

## 1. Intent

Make `/my-portal` use the **same floating two-column dashboard chrome** as Account Settings and seller create flows, so the buyer library feels like one Linket system—not a one-off Card sidebar. After the shell lands, restyle **My courses** to v0-style horizontal rows (filters + progress + CTAs). Leave the lesson player alone.

Success: guests (OTP) and logged-in buyers open the same floating shell; Overview and every `?section=` panel sit in `MainSection`; courses read as a list of resumeable rows.

## 2. Scope

**In**

1. Rebuild library chrome onto `DashboardLayout.Root` + floating `Sidebar.Root` + `DashboardLayout.MainSection`
2. Same shell for **auth and guest** library sessions (no seller dashboard navbar)
3. Sidebar identity: avatar + name + email
4. Keep `?section=` routing and Overview / downloads / audio empty / orders / settings **content** (moved into new chrome)
5. Restyle courses: horizontal list rows + existing All / In progress / Completed filters
6. Tests for shell wiring + course card layout helpers; build + manual check when DDEV is up

**Out**

- Lesson player / curriculum redesign
- API enrichment (creator, next-lesson title, exact lessons-done)
- Downloads / audio pack detail, orders table redesign, settings form save
- Seller dashboard nav items (products, analytics, etc.)

## 3. Approach

**Portal on `DashboardLayout` (approved)** — reuse the **same UI primitives** (`DashboardLayout`, `Sidebar`) for look and layout behavior only. Mirror structure of `app-account-settings-page.tsx` **as a pattern**, not as a shared module.

- `DashboardLayout.Root` with a **dedicated** name (e.g. `linket-my-portal`) — separate layout context from Account Settings (`linket-accunt-settings`) and seller dashboard
- Default section variant **floating** (same muted page gap as settings)
- `DashboardLayout.Content` → **portal-owned** `PortalSidebar` + main section for active `?section=`
- No `Navbar.AuthContent` / notifications strip (that is seller chrome)
- **Isolation (hard rule):** Do **not** import Account Settings sidebar, routes, or page layout. Do **not** nest portal under `/account-settings`. Do **not** share nav config, outlet context, or settings panels with the producer account app. Portal “Account settings” is a **link out** to `/account-settings` only.

Rejected: visual twin of floating styles without `DashboardLayout` (drifts); shell-only without courses (splits the approved slice); coupling portal into the account-settings route tree.

## 4. Layout & chrome

### Top level

| Piece | Behavior |
| --- | --- |
| Recovery OTP | Unchanged; shown **before** library shell when guest must verify |
| Library session | Auth or guest-with-cookie → floating shell |
| Brand | **Do not** mount seller `AppNavbar`. On compact/mobile, show site `Logo` in `Sidebar.Header` (same pattern as Account Settings). Desktop relies on floating sidebar identity + section title—no second top chrome strip |

### Sidebar (`Sidebar.Root`)

- Variant/classes aligned with Account Settings floating sidebar (`w-54`, translucent floating bg tokens)
- **Header:** centered or start-aligned avatar + display name + email (auth `user` or portal purchase email; guest fallback “Guest” / email local-part)
- **Library menu:** Overview, My courses, Downloads, Audio library, Orders — drive `onSectionChange` / `?section=` (not hash scroll). Counts as `Badge` / sidebar action where counts already exist
- **Account menu (below separator):**  
  - Auth: Account settings → `/account-settings`; Log out  
  - Guest: Create account; Login; Switch email (force recovery)
- Active row: `aria-current="page"` + sidebar accent tokens
- Mobile: dashboard sidebar collapse / sheet via `DashboardLayout.SidebarToggle`

### Main section

Pattern matches `AccountSettingsPageLayout`:

- `MainSection` → `SectionHeader` (`SidebarToggle` + `SectionTitle` as `h1`) → scroll body `max-w-6xl p-6`
- Title map: `overview` → Overview; `courses` → My courses; `downloads` → Downloads; `audio` → Audio library; `orders` → Orders; `settings` → Account settings
- Section body: existing panels (`PortalOverview`, courses, downloads, audio empty, orders, settings CTAs)

## 5. Courses list

Replace the 2-column cover-on-top grid with a **single-column stack of horizontal rows** (v0 `CourseCard` composition, Linket primitives):

| Region | Content |
| --- | --- |
| Media | Cover (or muted placeholder icon); fixed width on `sm+` (~`w-64`), full-bleed aspect-video on narrow |
| Meta | Status text (Completed with check / In progress / Not started) · “:count lessons” |
| Title | Course title |
| Progress | “:done/:total lessons” (see data) + percent + `Progress` |
| Footer | CTA: Continue (in progress) / Review course (complete) / Open (not started); demo rows stay disabled |

**Filters:** keep `PortalCourseFilters` (All / In progress / Completed); place under section intro copy (“Pick up right where you left off.”).

**Data (no new API):** use existing `PortalCourse`. Estimate `lessonsDone = round(percent/100 * total_lessons)` clamped to `[0, total_lessons]`. Omit creator and next-lesson lines until a later slice.

## 6. Components (units)

| Unit | Responsibility |
| --- | --- |
| `PortalLibraryLayout` (new) | `DashboardLayout.Root` + `Content`; wraps library session only |
| `PortalSidebar` (rewrite of Card sidebar in `my-portal-sidebar.tsx`) | Identity + library + account menus via `@common/ui/dashboard/sidebar` |
| `PortalSectionLayout` (new) | `MainSection` + header title + scroll children (mirror `AccountSettingsPageLayout`) |
| `PortalOverview` | Unchanged content; rendered inside section body |
| `PortalCourseCard` / `PortalCourseGrid` | Horizontal row list; grid becomes vertical stack |
| `MyPortalShell` | Keep for **recovery OTP** (and any non-library narrow pages) only—not the library chrome |
| `order-lookup-page` `MyPortalLibrary` | Data load + `?section=` + which panel; renders inside `PortalLibraryLayout` |

Prefer extracting from `my-portal-sidebar.tsx` rather than growing `order-lookup-page.tsx` further.

## 7. States

| State | Behavior |
| --- | --- |
| Loading | Spinner in main section body; sidebar may show static identity + nav |
| Empty courses filter | Existing empty / alert copy inside section body |
| Guest unverified | Recovery UI only (no floating library shell) |
| API error | Existing alerts in the active section; sidebar remains usable |

## 8. Accessibility

- Sidebar is a `nav` (or Sidebar menu semantics) with `aria-current` on the active section control
- Section `h1` is the sole page title for the active section
- Course progressbars keep accessible names (course title)
- Course CTAs are real links to existing `courseHref` targets

## 9. Testing

- Client: floating shell mounts for library mode; `?section=` still switches panels; course row renders Continue vs Review from percent/completed; estimated lessons-done helper
- Keep recovery / library API wiring tests green
- Manual (when Docker/DDEV up): desktop + ~360px — sidebar toggle, Overview, courses list rows

## 10. Rollout within this slice

1. Shell: `DashboardLayout` + floating `PortalSidebar` + `PortalSectionLayout`; wire all sections  
2. Courses: horizontal rows + filters  
3. Verify tests / build / browser when available  

## 11. Non-goals reminder

No waveform / storefront player work. No seller dashboard IA changes. Do not paste v0 `components/ui/*`. No commit of secrets.
