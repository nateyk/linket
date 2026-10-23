# My Portal — Orders Table + Account Settings Panel — Design

Date: 2026-10-23  
Status: approved in chat  
Mode: **Operate**  
Visual reference: v0 `OrdersSection` / `SettingsSection`  
Isolation: no `@app/account-settings` imports; settings CTA links out only

## 1. Intent

Polish `?section=orders` to a compact order history table with receipt/review actions, and give `?section=settings` a real in-portal panel (read-only identity + link out for auth; guest CTAs) without coupling to the producer account-settings app.

## 2. Scope

**In**

- Orders table: id, product (+ type), date, Paid status, amount, Resend receipt + Review
- Settings panel: auth name/email + Open account settings; guest Create account / Switch email
- Sidebar Account settings → `?section=settings` (not direct `/account-settings`)
- Tests + build

**Out**

- Notification prefs / fake Save without API
- Sharing account-settings modules or routes
- Overview recent-orders table rewrite (optional later)

## 3. Components

| Unit | Role |
| --- | --- |
| `PortalOrdersTable` | Table + row actions wired to existing download/resend/review handlers |
| Settings block in `order-lookup-page` or `portal-settings-panel.tsx` | Card chrome for auth/guest |
| `PortalSidebar` | Account settings uses `section: 'settings'` |

## 4. Testing

- Source asserts: orders table markup, settings link-out, no `@app/account-settings` import for forms
- Existing portal tests stay green
