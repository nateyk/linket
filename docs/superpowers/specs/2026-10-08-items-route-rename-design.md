# Product Routes Rename to Marketbob-Style `items` — Design

Date: 2026-10-08
Status: approved (in-chat design approved by owner, 2026-10-08)
Path: architectural (alters URLs other parts depend on)

## 1. Intent

Rename Linket's product URLs to marketbob naming so the brand reads
"Items" / "My Items" everywhere users look:

- Admin `admin/digital-products/...` → `admin/items/...`
  (including the reserved `admin/items/updated` queue path, NOT built here).
- Creator `dashboard/my-products/...` → `dashboard/items/...`
  (`dashboard/items/new` is the "New Item" flow, "My Items" sidebar label).

Success: no user-facing `digital-products` / `my-products` path or label
remains; suites green; old URLs 404 (clean break, no aliases).

## 2. Non-goals

- No `admin/items/updated` page (rename only, per owner decision).
- No new product-structure features (changelogs, discount, history tabs,
  comments/Q&A, support pages). Q&A is the recommended next spec.
- No internal renames: `DigitalProduct` model, `digital-products/`
  folders, component names, DB tables, route parameter names
  (`{digitalProduct}`), and route names stay as-is.

## 3. Frontend route map

### 3.1 Admin (`resources/client/admin/admin-routes.tsx`)

| Old | New |
| --- | --- |
| `digital-products` | `items` |
| `digital-products/payouts` | `items/payouts` |
| `digital-products/:productId` | `items/:productId` |
| `digital-products/:productId/reviews` | `items/:productId/reviews` |
| `digital-products/delivery-history` | `items/delivery-history` |
| any other `digital-products/*` child | same suffix under `items/` |

- `admin-config.tsx` icon key `/admin/digital-products` → `/admin/items`.
- Update all in-app links to these paths (~25 files reference
  `admin/digital-products`).

### 3.2 Dashboard (`resources/client/dashboard/dashboard-routes.tsx`)

| Old | New |
| --- | --- |
| `my-products` | `items` |
| `my-products/new` | `items/new` |
| `my-products/new/details` | `items/new/details` |
| `my-products/new/course` | `items/new/course` |
| `my-products/:productId/edit` | `items/:productId/edit` |
| `my-products/:productId/course*` | `items/:productId/course*` |
| `my-products/:productId/statistics` | `items/:productId/statistics` |
| `my-products/:productId/reviews` | `items/:productId/reviews` |

- `sales-payouts` path unchanged (not product-scoped naming).
- `homepageRoutes`: value `/dashboard/my-products` → `/dashboard/items`;
  setting key `'digital-products'` → `'items'` WITH a fallback mapping the
  old stored value to the new path so existing installs keep working.
- Sidebar (`app-dashboard-sidebar.tsx`): link → `/dashboard/items`,
  label "Digital Products" → "My Items".
- Update all in-app links (~19 files reference `dashboard/my-products`).

### 3.3 Labels and headings

- Admin sidebar/menu label → "Items".
- Dashboard sidebar label → "My Items".
- Page titles and headings using "Digital Products" / "My Products"
  (`<Trans>`) → "Items" / "My Items" as context dictates.
- Email/notification templates and any other user-facing strings swept
  for the old names.

## 4. Backend API (`common/foundation/routes/api.php`)

- Every `digital-products` URI segment → `items`, in both the creator
  group and the `admin/digital-products/...` group.
- Parameter names (`{digitalProduct}`, `{productReview}`, …) and route
  names unchanged (internal only).
- Clean break: no deprecated aliases, no redirects.
- Update request URLs in ~20 backend test files.
- Regenerate API surface: `composer api-docs`
  (`api.json`, `api-public.json`, orval `gen/` client); verify no stale
  `digital-products` paths in generated output.

## 5. Testing

- Backend: `ddev exec php artisan test` — baseline 421 passed / 2 skipped.
  Frontends suites run alone (never concurrently with backend).
- Frontend: `npx tsc --noEmit`, full `npm test` (vitest), focused
  route-test files updated to new paths.
- Manual verification: old URLs return 404; new admin/creator URLs load;
  sidebar links land correctly; new-item flow redirects intact;
  grep confirms zero user-facing `my-products` / `digital-products`
  path strings.
- Rebuild frontend bundle (`npm run build`) so the served site picks up
  the new routes; leave `public/build/manifest.json` uncommitted.

## 6. Gaps vs marketbob (recommendation, separate work)

| Marketbob surface | Linket today | Recommendation |
| --- | --- | --- |
| Creator per-item Changelogs tab | missing | later spec |
| Creator per-item Discount tab | missing | later spec |
| Creator per-item History tab | missing (admin has History) | later spec |
| Public comments (Q&A) + replies | missing | **next spec (owner-named priority)** |
| Public support page per item | missing | later spec |
| Public changelogs page per item | missing | later spec |
| Admin comment moderation | missing | with Q&A spec |
| Admin `items/updated` queue | missing (`has_pending_update` tracked) | separate spec when wanted |

## 7. Risks

- External API consumers (mobile app, integrations) break on the prefix
  change — clean break was explicitly chosen; call out in release notes.
- Stored `dashboard.homepage = 'digital-products'` setting needs the
  Section 3.2 fallback.
- Hardcoded URLs in emails, notifications, docs, or seed data must be
  swept, not just `resources/client` and `routes/`.
