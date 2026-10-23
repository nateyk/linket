# My Portal — Download Detail + Audio Pack Player — Design

Date: 2026-10-23  
Status: approved in chat  
Mode: **Operate**  
Visual reference: v0 `download-center.tsx`, `audio-library-player.tsx`  
Isolation: no `@app/account-settings` imports

## 1. Intent

Add pack detail pages for file downloads and audio purchases, matching lesson-player chrome (detail header + main/aside grid), using existing portal purchase/download APIs.

## 2. Routes

| Path | Page |
| --- | --- |
| `/my-portal/downloads/:orderId` | Download center for one purchase |
| `/my-portal/audio/:orderId` | Audio pack player for one purchase |

`orderId` = storefront order uuid.

## 3. Scope

**In**

- Detail pages with back links to `?section=downloads` / `?section=audio`
- File list + download (signed URL POST); download-all where multiple files
- Audio: track list + `<audio>` when streamable signed URL; else download
- Aside: remaining downloads, purchased date, order id, resend receipt
- Open links from entitlement pack cards
- Demo order support (toast, no real download)
- Tests + build

**Out**

- License key / changelog / version / BPM / format toggles without API fields
- New backend entitlements endpoints
- Account-settings coupling

## 4. Data

Load via existing `/api/v1/public/my-portal/library` (auth/guest session). Find order by uuid. Download: `POST .../purchases/{id}/downloads/{entitlementId}` → `{ url }`.
