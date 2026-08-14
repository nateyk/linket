# Migrate linket from Laragon to Herd

Date: 2026-08-14

## Goal

Move the linket Laravel project from Laragon to Laravel Herd (served at `http://linket.test`), migrating its MySQL database (`belink`) to dbngin's MySQL instance, then remove the old Laragon copy after verification.

## Current State

- Project location: `C:\laragon\www\linket`
- Laravel 12, PHP >=8.2, git repo with working tree changes (7143 modified lines in .agents/skills — uncommitted)
- Has a populated git submodule: `common` (git@github.com:RamunasO/common-new.git) — will be copied as-is
- Database: MySQL 8.4 (`belink` DB) in Laragon's data dir at `C:\laragon\data\mysql-8.4\belink` — not currently running
- `.env`: `APP_URL=http://127.0.0.1:8000`, `DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=belink`, `DB_USERNAME=root`
- Herd 1.29.0 running; Herd Pro NOT installed (services unavailable); dbngin NOT installed
- Destination `C:\Users\Nate\Herd\linket` does not exist yet

## Decisions (confirmed with user)

1. Database handled via **dbngin** (free, Herd-team tool) with MySQL 8.4
2. Database migration approach: **mysqldump → dbngin import** (Option A)
3. Project moves to `C:\Users\Nate\Herd\linket`
4. Old copy kept as backup, deleted only after Herd setup is verified by user in browser

## Approach

1. Dump `belink` from Laragon's MySQL 8.4 via `mysqldump --databases belink` (starting the binary directly, not the full Laragon stack)
2. Install dbngin + MySQL 8.4, create `belink` database, import the dump, verify table/row counts
3. Robocopy project to `C:\Users\Nate\Herd\linket` — exclude `vendor`, `node_modules`, `.env`; include `.git` and populated `common` submodule
4. Update `.env`: `APP_URL=http://linket.test` (DB settings: dbngin default port is 3306, user root, no password — adjust if dbngin uses different defaults)
5. `composer install`, `npm install`, `npm run build`, `php artisan storage:link`
6. Verify: `php artisan migrate:status` (all Ran), site loads at `http://linket.test`, DB queries work
7. On user browser confirmation: delete `C:\laragon\www\linket` backup, commit `.env`-adjacent config fixes (opencode.json if present)

## Risks / Notes

- dbngin default MySQL port is 3306 with root/no password; if it conflicts with anything, note the actual port used
- Laragon MySQL data dir is version-sensitive — we do NOT copy it raw (Option B rejected)
- The `common` submodule is copied as a plain directory; if submodule state matters (`.git` file inside), the copy keeps it intact — verify submodule works after copy (`git submodule status`)
- Uncommitted working-tree changes in linket are copied along (fine — we copy the working tree)
- Herd auto-serves `~/Herd/linket` as `http://linket.test`

## Out of Scope

- Migrating other databases in Laragon's data dir (only `belink` is needed)
- Laragon uninstall
- Production deployment changes