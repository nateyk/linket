# BeDesk Native Support Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port BeDesk Help Center + conversations/tickets + agent inbox + email into Linket as native Support; retire Linket `Common\Help`; migrate articles; add `support_owner_id` for later per-creator tenancy.

**Architecture:** Selective copy of BeDesk `app/{Conversations,HelpCenter,Team,Contacts}` (+ email pipeline) and matching client UI into Linket. Greenfield migrations matching BeDesk v3 final schema (do not replay 2016→2025 history). Keep Linket `common/foundation`; do not overwrite with BeDesk foundation.

**Tech Stack:** Laravel 13, PHP 8.4, React 19, Vite, Fortify/Sanctum, existing Common tags/files/auth, DDEV for artisan/tests.

**Spec:** `docs/superpowers/specs/2026-10-24-bedesk-native-support-design.md`

**BeDesk source (read-only):**  
`/mnt/c/Users/Nate/Downloads/BeDesk v3.0.8/BeDesk v3.0.8/codecanyon-20484131-bedesk-customer-support-software-helpdesk-ticketing-system/website`

## Global Constraints

- Linket remains the only deployable app; never copy BeDesk `website/` wholesale.
- Do not replace Linket `common/foundation` with BeDesk’s copy.
- Visible copy uses `<Trans message="..." />` with static strings; semantic Tailwind tokens.
- PHPUnit feature tests via `ddev artisan test --compact` (not Pest unless file already uses Pest).
- Phase 1 ships: HC + tickets + agent inbox + customer tickets + email; not LiveChat/AI/triggers/canned/reports UI.
- `conversations.support_owner_id` nullable FK; Phase 1 always null.
- Retire Linket Help UI/routes after HC migrate command.

---

## File map (Phase 1)

| Area | Create / modify |
|------|-----------------|
| Schema | `database/migrations/2026_10_24_*_create_support_*.php` |
| Backend | `app/Conversations/**`, `app/HelpCenter/**`, `app/Team/**`, `app/Contacts/**` (ported) |
| User | `app/Models/User.php` — `CanBeAgent` |
| Boot | `app/Providers/AppServiceProvider.php` — policies, morph map, events |
| Routes | `routes/api.php`, `routes/web.php` |
| Permissions | `resources/defaults/permissions.php` |
| Frontend | `resources/client/help-center/**`, `resources/client/dashboard/{conversations,agents,views,contacts}/**`, router wiring |
| Cutover | Remove/redirect Linket Help; `app/Console/Commands/MigrateLinketHelpToHc.php` |
| Config | `config/app.php` or settings for `incoming_email.integrated` |
| Tests | `tests/Feature/Support/**` |

---

### Task 1: Greenfield support schema + support_owner_id

**Files:**
- Create: `database/migrations/2026_10_24_140000_create_support_core_tables.php` (groups, group_user, conversation_statuses, conversations, conversation_items, conversation_views, agent_settings, agent_invites)
- Create: `database/migrations/2026_10_24_140001_create_support_help_center_tables.php` (articles, categories, category_article, article_feedback, search_terms — BeDesk HC names)
- Create: `database/migrations/2026_10_24_140002_add_agents_flag_to_roles_and_taggables_user_id.php`
- Test: `tests/Feature/Support/SupportSchemaTest.php`

**Interfaces:**
- Produces: tables matching BeDesk v3 Conversation/HcArticle models + `conversations.support_owner_id` nullable FK → users

- [ ] Write failing schema test asserting tables/columns exist
- [ ] Create migrations from BeDesk final column sets (read BeDesk models + latest alter migrations)
- [ ] Run `ddev artisan migrate --no-interaction` and `ddev artisan test --compact tests/Feature/Support/SupportSchemaTest.php`
- [ ] Commit

---

### Task 2: Port backend domains

**Files:**
- Copy from BeDesk: `app/Conversations`, `app/HelpCenter`, `app/Team`, `app/Contacts` (and email classes under Conversations/Email if present)
- Modify: `app/Models/User.php` — use `CanBeAgent`
- Modify: `app/Providers/AppServiceProvider.php` — Gate policies, morph map entries, conversation events (minimal Phase 1; skip TriggersCycle if Triggers not ported)
- Modify: `routes/api.php`, `routes/web.php` — helpdesk + hc routes from BeDesk
- Modify: `resources/defaults/permissions.php` — agent/ticket/hc permissions from BeDesk

- [ ] Copy PHP domains; fix namespace imports that reference missing Phase 2 modules (stub or guard)
- [ ] Wire User + AppServiceProvider + routes + permissions
- [ ] Smoke: `ddev artisan route:list --path=helpdesk` and `--path=hc`
- [ ] Feature tests: create ticket, agent reply, 403 non-agent
- [ ] Commit

---

### Task 3: Port frontend HC + agent inbox + customer tickets

**Files:**
- Copy BeDesk `resources/client/help-center`, dashboard conversation/agent/views pieces
- Modify: `resources/client/app-router.tsx`, `admin-routes.tsx`, `dashboard-routes.tsx`, `common-routes.tsx`
- Adapt imports to Linket aliases (`@common`, `@/`)

- [ ] Copy and wire routes/menus
- [ ] Fix build errors until `npm run build` or tsc passes for new entry points
- [ ] Commit

---

### Task 4: Retire Linket Help + migrate articles

**Files:**
- Create: `app/Console/Commands/MigrateLinketHelpToHcCommand.php`
- Modify: remove Help routes from `routes/api.php`, `common-routes.tsx`, `admin-routes.tsx`
- Add redirects for `/help/*` → `/hc/*`
- Test: migrate command + redirect tests

- [ ] Implement migrate command (slug conflict → `-linket-{id}`)
- [ ] Remove Linket Help UI registration
- [ ] Tests pass
- [ ] Commit

---

### Task 5: Email channels + coverage

**Files:**
- Port BeDesk inbound email pipeline; enable `incoming_email.integrated`
- Tests: faked email → ticket/reply

- [ ] Wire IMAP/pipe/webhook routes and jobs
- [ ] Feature test with Mail fake / stub importer
- [ ] Playwright smoke optional if time
- [ ] Commit

---

## Done when

- Schema + `support_owner_id` migrated
- Agents can use inbox; customers my-tickets; HC public/admin works
- Linket Help retired; articles migrated via command
- Email creates/replies to tickets
- Feature tests green for schema, ticket CRUD, permissions, migrate command, email

---

## Phase 1 status (2026-10-24)

- Migrations `2026_10_24_140000`–`150000` ran (incl. profile/`user_details` align).
- Support feature tests: **10 passed**.
- Agent UI mounted at `/agent` via `agentRoutes`; `npm run build` succeeds.
- Foundation shims kept Linket APIs intact (`ArticleEditor` vs BeDesk `ArticleEditorPage`, `@common/http/errors/*`, Envato stub module, BeDesk `dashboard-layout` + lucide icons copied selectively).

## Phase 2 entry (next)

Spec roadmap row 2: **canned replies, triggers, custom attributes, reports, webhooks**.

Start here:

1. Backend already has attribute/canned/trigger tables from greenfield — wire PHP controllers if stubbed, then enable agent routes under `/agent/saved-replies`, `/agent` attributes, triggers admin.
2. Frontend clients already copied under `resources/client/{canned-replies,triggers,attributes}` + report pages — harden against Linket foundation APIs (same export/path drift pattern as Phase 1).
3. Add feature tests per domain before turning on menu items in `dashboard-sidebar`.
4. Defer LiveChat/AI PHP + per-creator `support_owner_id` filtering to Phase 3+.
