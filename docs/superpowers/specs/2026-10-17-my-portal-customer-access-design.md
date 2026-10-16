# My Portal — Customer Purchase Access — Design

Date: 2026-10-17  
Status: approved in chat (portal-native learning = option A; rename `my-order` → `my-portal`)  
Path: product + architectural (public URLs, portal APIs, guest course access)

## 1. Intent

`/my-portal` is the **customer portal**: one place buyers use to access
**everything they purchased** — course learning, file downloads, receipts,
and reviews — not a “find / restore my files” recovery page.

Success criteria:

- Buyer verifies email with a one-time code → portal session (30 days).
- That session unlocks **downloads and course lessons** for paid orders
  matching the email (no Linket account required).
- Logged-in users with the same verified email see the same library;
  progress merges when they create/verify an account later.
- User-facing copy and routes say **My Portal** / `/my-portal` (not
  “My Order” / `/my-order`).
- UI reads as a purchase library / learning hub, not a support recovery
  tool.

## 2. Non-goals

- No seller dashboard changes.
- No new payment providers.
- No multi-email or household sharing.
- No renaming internal PHP classes/tables in this pass
  (`CustomerOrderPortalController`, `OrderRecoveryService`,
  `digital_product_order_recoveries`, etc. may keep technical names).
- No Mailtrap cloud; local mail stays **Mailpit**
  (`https://linket.ddev.site:8026`).

## 3. Access model (portal-native)

### 3.1 Session

Existing email OTP + HttpOnly cookie session remains the auth gate for
guests (`OrderRecoveryService` cookie, 30 days).

### 3.2 Entitlement check

A portal session may access a purchase when:

- order `status = paid`, and
- `LOWER(buyer_email)` matches the recovery email.

Applies to:

- download entitlements (existing)
- course curriculum, lesson content, progress write (new for guests)

### 3.3 Course access without Sanctum user

Today `EnrollmentService::grantFromOrder` requires a `user_id`. Portal
guests have none.

**Approach:** introduce **portal enrollments** (or a guest progress
binding) keyed by recovery identity + course, not only `user_id`.

Recommended shape (implementation may pick exact tables):

- On first portal open of a paid course order: ensure an enrollment row
  that can be owned by either:
  - `user_id` (logged-in), or
  - `portal_email_hash` / `order_recovery_id` (guest), with
    `storefront_order_id` set.
- Lesson progress rows for guests store the same portal key until claim.
- Lesson/video APIs accept **either** authenticated user enrollment
  **or** valid portal cookie + matching paid course order.

### 3.4 Claim on account

When the buyer registers / verifies email matching `buyer_email`:

- Existing `CourseClaimService::claimForUser` attaches `user_id`.
- Also merge any guest progress into that user and clear portal-only keys.
- Prefer listening on `Verified` (already wired) and also claim on login
  if already verified (idempotent).

### 3.5 Priority when both sessions exist

If Sanctum user is logged in **and** portal cookie is present:

- Prefer Sanctum for course APIs when user email matches purchases.
- Portal cookie still used for purchase list / downloads if needed.
- Hub UI for logged-in users is the same `/my-portal` shell (not a
  separate “dashboard learning” silo).

## 4. Rename: `my-order` → `my-portal`

### 4.1 Frontend routes

| Old | New |
| --- | --- |
| `/my-order` | `/my-portal` |
| `/my-order/purchases` | `/my-portal/purchases` (optional alias of library filter; may collapse into home) |
| `/my-order/courses/:courseId` | `/my-portal/courses/:courseId` |
| `/my-order/courses/:courseId/lessons/:lessonId` | `/my-portal/courses/:courseId/lessons/:lessonId` |

- SPA route modules, `Link`/`navigate` targets, shell component rename
  (`MyOrderShell` → `MyPortalShell`).
- Visible copy: “My orders & courses” → “My Portal”; recovery copy
  reframed as “Access your purchases”.

### 4.2 Backend HTTP API

Prefer new public paths with temporary redirects/aliases from old ones
during one release if cheap; otherwise clean break in local/dev is OK
(owner preference: **clean break** with in-app links updated).

| Old | New |
| --- | --- |
| `/api/v1/public/my-order/*` | `/api/v1/public/my-portal/*` |
| Web SPA fallbacks in `routes/web.php` | `my-portal…` |

Keep `/api/v1/my-courses` working for logged-in users; add portal-scoped
course list/learn endpoints under `my-portal` for guests (or extend
existing controllers to accept portal auth).

### 4.3 Redirects

- Optional 301/302 from `/my-order*` → `/my-portal*` for bookmarks.
- Recommended: soft redirect for one cycle.

## 5. Information architecture & UI

### 5.1 Home = library

Single home at `/my-portal`:

- **Continue learning** strip (in-progress courses with next lesson).
- **Courses** section (Open / Continue).
- **Downloads** section (file products with remaining counts).
- Empty states that explain “Buy on a creator bio → access here”, not
  “request a recovery code” as the hero story.

Tabs/filters OK if secondary; default is one scrollable library.

### 5.2 Course detail & lesson player

Reuse current learn + lesson player pages under `/my-portal/courses/…`,
backed by portal-aware APIs. Guest users see the same learning chrome;
no “Sign in to start learning” dead-end when portal session is valid.

### 5.3 Optional account CTA

Secondary, not blocking: “Create a free account to keep progress on all
devices” when session is portal-only.

### 5.4 Visual direction

- One composition: library, not admin dashboard chrome.
- Semantic tokens only; reuse `@shadcn/*` + existing shell.
- Stronger hierarchy: product title + primary action (Continue / Download).
- Avoid recovery-tool aesthetics (shield-heavy, “session active 30 days”
  as the only subtitle — demote session meta).

## 6. API surface (target)

Portal cookie required unless noted:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/public/my-portal/request-code` | email OTP (existing behavior) |
| POST | `/api/v1/public/my-portal/verify-code` | set cookie |
| GET | `/api/v1/public/my-portal/library` | courses + download purchases in one payload |
| GET | `/api/v1/public/my-portal/courses/{id}` | course detail for portal |
| GET | `/api/v1/public/my-portal/courses/{id}/lessons/{lesson}` | lesson payload |
| POST | `/api/v1/public/my-portal/courses/{id}/lessons/{lesson}/progress` | guest progress |
| POST | `/api/v1/public/my-portal/purchases/{order}/downloads/{id}` | signed download URL |
| POST | `/api/v1/public/my-portal/purchases/{order}/resend-receipt` | receipt |
| POST | `/api/v1/public/my-portal/purchases/{order}/review` | review |

Logged-in Sanctum users may call the same library/learn routes **or**
existing `/api/v1/my-courses` — implementation should avoid divergent
JSON shapes where possible.

## 7. Data / migrations

Likely needed:

- Nullable `user_id` on enrollments **or** parallel
  `portal_email_hash` / `digital_product_order_recovery_id` column with
  uniqueness rules so one active enrollment per (course, identity).
- Progress table support for portal identity (same pattern).
- Backfill: none required for existing guest paid course orders beyond
  creating enrollment on first portal library load / course open.

Exact schema chosen in the implementation plan; must remain idempotent
with `EnrollmentService::grant` / claim.

## 8. Security

- Rate-limit OTP request/verify (existing).
- Portal session cannot access other emails’ orders.
- Lesson media URLs stay signed / entitlement-checked.
- Do not expose download tokens in list payloads beyond existing rules.
- Claim must not hijack orders already linked to another `buyer_user_id`.

## 9. Testing

- Feature: portal cookie can list course + open lesson for paid guest order.
- Feature: portal download still works for digital file products.
- Feature: after register+verify same email, enrollment/progress owned by user.
- Feature: rename routes resolve; old `/my-order` redirects or 404 per plan.
- Vitest: library hub renders course Continue without “Downloads unavailable”.
- Pest for mail unchanged; document Mailpit URL for local QA.

## 10. Rollout

1. Schema + portal course auth.
2. Library API + rename routes/copy.
3. Wire learn/lesson player to portal APIs for guests.
4. UI polish on hub.
5. Claim/merge progress.
6. Redirects + test sweep + `npm run build`.

## 11. Open decisions (resolved)

| Topic | Decision |
| --- | --- |
| Guest course unlock | Yes — portal session (A) |
| Product name | My Portal (`/my-portal`) |
| Architecture | Portal-native learning (not shadow accounts) |
| Scope this pass | Library + guest learn/download + rename + claim merge |
