# BeDesk → Native Linket Support — Design Specification

**Project:** Linket  
**Date:** 2026-10-24  
**Status:** Approved  
**Source:** BeDesk v3.0.8 (Vebto / CodeCanyon) selective native port

---

## 1. Overview

Integrate BeDesk (Customer Support Software & Helpdesk Ticketing System) into Linket as **native Support** — one application, shared users and foundation — not a side-by-side deploy and not a wholesale copy of the BeDesk `website/` tree.

Linket already ships a knowledge-base Help Center (`Common\Help`). BeDesk provides a fuller helpdesk: Help Center, conversations (tickets + chat), agent inbox, email channels, team/agents/groups, plus roadmap features (canned replies, triggers, attributes, reports, webhooks, LiveChat, AI). This design retires Linket’s Help module in favor of BeDesk’s Help Center and ports the helpdesk domains into Linket.

### 1.1 Goals

- Full BeDesk feature parity over time — nothing permanently cut
- Platform staff inbox first; leave room for per-creator multi-tenant support
- Single auth (Linket Fortify/Sanctum users); agents via roles + BeDesk agent patterns
- Keep Linket as the only deployable product shell (bio store, commerce, billing)

### 1.2 Non-Goals

- Running BeDesk as a separate app/subdomain with SSO
- Overwriting Linket `common/foundation` with BeDesk’s foundation copy
- Shipping LiveChat / AI / deep automation in Phase 1 (they remain on the roadmap)

---

## 2. Decisions

| Decision | Choice |
|----------|--------|
| Audience | Platform support first; per-creator later (design for both) |
| Parity | Full BeDesk set; staged delivery |
| Help Center | Retire `Common\Help`; adopt BeDesk HC; migrate articles |
| Method | Selective native port of BeDesk domains into Linket `app/` |

---

## 3. Reference source

**Read-only BeDesk tree:**

`/mnt/c/Users/Nate/Downloads/BeDesk v3.0.8/BeDesk v3.0.8/codecanyon-20484131-bedesk-customer-support-software-helpdesk-ticketing-system/website`

**Addon zips (Phases 3–4):** LiveChat and AI agent packages in Downloads.

Do not copy BeDesk `website/` wholesale into the Linket repo.

---

## 4. Architecture

```
Linket app
├── Bio store / commerce (existing)
├── Support (ported from BeDesk app domains)
│   ├── HelpCenter
│   ├── Conversations (tickets)
│   ├── Team (agents, groups)
│   ├── Contacts
│   ├── Email channels
│   └── Later: CannedReplies, Triggers, Attributes, Reports, Webhooks, LiveChat, AI
└── common/foundation (Linket’s copy — do not replace)
```

- Prefer BeDesk-aligned PHP namespaces under Linket `app/` to ease porting.
- Frontend: agent inbox, HC, customer tickets adapted to Linket routes, `<Trans message="..." />`, semantic tokens / `@shadcn/*`.
- Agents: existing users + `CanBeAgent` / permission pattern from BeDesk — no second auth system.

### 4.1 Tenancy hook (Phase 5 ready)

Every conversation has nullable `support_owner_id` (FK → users).

- `null` = platform support (Phase 1–4)
- Set = creator-owned inbox (Phase 5)

Policies and query scopes filter by owner; Phase 1 always writes `null`.

---

## 5. Phases

| Phase | Scope |
|-------|--------|
| **1** | BeDesk HC (replace Linket Help + migrate) + conversations/tickets + agent inbox + customer my-tickets + statuses/assign/groups basics + email in/out |
| **2** | Canned replies, triggers, custom attributes, reports, webhooks |
| **3** | LiveChat addon (`modules/livechat` from addon zip) |
| **4** | AI agent addon (`modules/ai` from addon zip) |
| **5** | Per-creator support (`support_owner_id` enforcement, creator agent roles, storefront entry) |

Phase 1 non-goals (still on roadmap): LiveChat, AI, deep reports/triggers/canned/attributes UI, per-creator inbox.

---

## 6. Phase 1 flows

1. Visitor/customer uses Help Center → article or “Contact support” → creates ticket.
2. Email to support address → IMAP/pipe/webhook → new conversation or threaded reply.
3. Agent inbox → assign / status / reply (public + internal note) → customer notified (email + My tickets).
4. Admin manages HC; old `/help/*` URLs 301 to new HC routes.

### 6.1 Surfaces

- Public: BeDesk-style HC + new-ticket / my-tickets for logged-in users
- Agent: staff dashboard inbox (agent permissions only)
- Admin: support settings (email channels, agent invites) in existing admin patterns

### 6.2 Errors / edge cases

- Unknown inbound email → create contact + ticket (BeDesk behavior)
- Failed outbound email → queue retry; surface failure on conversation
- Duplicate HC slug on migrate → suffix `-linket-{id}`
- Non-agents on agent routes → 403

---

## 7. Help Center cutover

1. Port BeDesk Help Center schema/models/UI (categories → sections → articles).
2. Artisan command migrates `help_categories` / `help_articles` → BeDesk HC tables.
3. Remove Linket `Common\Help` public/admin routes and UI.
4. Redirect `/help`, `/help/categories/:slug`, `/help/articles/:slug` → new HC URLs.

Historical `help_*` migrations remain; product code stops using those tables after cutover.

---

## 8. Testing (Phase 1)

- Pest: HC migrate command, create ticket, email→ticket (faked), agent reply, 403 non-agent, `support_owner_id` null scoping
- Playwright: HC + inbox smoke after UI lands

---

## 9. Risks

- Foundation drift (Linket Laravel 13 / shadcn vs BeDesk Laravel 12) — port domain code only
- Table name collisions (`articles` / `categories` vs `help_*`) — prefer BeDesk HC names with explicit migrate-off `help_*`
- LiveChat/AI PHP backends absent until addon zips installed in Phases 3–4

---

## 10. Success criteria (Phase 1)

- Platform agents can manage tickets in a native Linket inbox
- Customers can open/view tickets and browse the BeDesk-model Help Center
- Inbound email creates/replies to tickets
- Linket Help Center UI/routes gone; content migrated
- `support_owner_id` present and null for all Phase 1 conversations
