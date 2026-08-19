# Migrate linket from Laragon to Herd

Date: 2026-08-14

## Goal

Move the linket Laravel project from Laragon to Laravel Herd (served at `http://linket.test`), migrating its MySQL database (`belink`) to a standalone official MySQL Community Server 8.4 install, then remove the old Laragon copy after verification.

## Current State

- Project location: `C:\laragon\www\linket`
- Laravel 12, PHP >=8.2, git repo with working tree changes (7143 modified lines in .agents/skills — uncommitted)
- Has a populated git submodule: `common` (git@github.com:RamunasO/common-new.git) — will be copied as-is
- Database: MySQL 8.4 (`belink` DB) in Laragon's data dir at `C:\laragon\data\mysql-8.4\belink` — not currently running
- `.env`: `APP_URL=http://127.0.0.1:8000`, `DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=belink`, `DB_USERNAME=root`
- Herd 1.29.0 running; Herd Pro NOT installed (services unavailable)
- **PLAN DEVIATION (user-approved):** dbngin was originally chosen but is non-functional on this machine (dbngin-go 2.0.4 Windows build never spawns mysqld, persists no engine state — upstream bug). Replaced with **official MySQL Community Server 8.4.3** (noinstall archive) at `C:\Users\Nate\.local\mysql\mysql-8.4.3`, standalone, port 3306.
- MySQL 8.4.3 installed and running (PID 14116, port 3306, root/empty password); `belink` imported (81 tables)
- Destination `C:\Users\Nate\Herd\linket` does not exist yet

## Decisions (confirmed with user)

1. Database handled via **official MySQL Community Server 8.4** (standalone install; dbngin rejected — broken on this machine)
2. Database migration approach: **mysqldump → MySQL import** (Option A)
3. Project moves to `C:\Users\Nate\Herd\linket`
4. Old copy kept as backup, deleted only after Herd setup is verified by user in browser

## Approach

1. Dump `belink` from Laragon's MySQL 8.4 via `mysqldump --databases belink` (starting the binary directly, not the full Laragon stack)
2. Install official MySQL Community Server 8.4.3 (`C:\Users\Nate\.local\mysql\mysql-8.4.3`), initialize, run on 3306, import the dump, verify table/row counts
3. Robocopy project to `C:\Users\Nate\Herd\linket` — exclude `vendor`, `node_modules`, `.env`; include `.git` and populated `common` submodule
4. Update `.env`: `APP_URL=http://linket.test` (DB: 127.0.0.1, port 3306, belink, root, no password)
5. `composer install`, `npm install`, `npm run build`, `php artisan storage:link`
6. Verify: `php artisan migrate:status` (all Ran), site loads at `http://linket.test`, DB queries work
7. On user browser confirmation: delete `C:\laragon\www\linket` backup, commit `.env`-adjacent config fixes (opencode.json if present)

## Risks / Notes

- MySQL runs standalone on port 3306 (root/no password) at `C:\Users\Nate\.local\mysql\mysql-8.4.3`; it is started manually and does NOT auto-start on reboot — register a Windows service or document the manual start command
- Laragon MySQL data dir is version-sensitive — we do NOT copy it raw (Option B rejected)
- The `common` submodule is copied as a plain directory; if submodule state matters (`.git` file inside), the copy keeps it intact — verify submodule works after copy (`git submodule status`)
- Uncommitted working-tree changes in linket are copied along (fine — we copy the working tree)
- Herd auto-serves `~/Herd/linket` as `http://linket.test`

## Out of Scope

- Migrating other databases in Laragon's data dir (only `belink` is needed)
- Laragon uninstall
- Production deployment changes