# Linket — Production Deployment Architecture

> **Source of truth for:** GitHub → CI → CD → cPanel production.
> **Derivation rule:** every decision below is traced to an actual file/config in this repository at `a6fb0e1d` (harden) + post-integration state. No generic Laravel assumptions.
> **Companion doc:** `docs/production-operations.md` (runtime operations, mail, Chapa sandbox) — not duplicated here except where deployment touches it.

---

## 1. Current Linket Production Architecture

### 1.1 Runtime stack (verified from repo)

| Layer | Evidence | Value |
|---|---|---|
| PHP | `composer.json:11` `php >=8.2` ; `.ddev/config.yaml` php_version 8.4 ; `ddev exec php -v` 8.4.22 | **Require >=8.2, CI pins 8.4** |
| Laravel | `composer.json:34` `laravel/framework ^12.0`; `php artisan --version` 12.67.0 | **12.x** |
| Node | `.ddev/config.yaml` nodejs_version 24; `package.json` engines `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`, vite 8 | **Node 24, Vite 8, `npm ci` + `vite build`** (jsdom 30 requires >=22.22.2) |
| DB | `common/foundation/config/database.php` mysql/mariadb, migrations 81 files under `database/migrations` | MySQL 8.0, `DB_PREFIX` empty by default |
| Cache / Queue | `env.example:32-42` `CACHE_STORE=file`, `QUEUE_CONNECTION=sync` locally ; `docs/production-operations.md:25-37` production `redis` + `HORIZON_PREFIX=linket_horizon:` ; `config/horizon.php:5-48` | Production must be `redis`; local sync is dev-only |
| Session | `env.example:34` file | Production `redis` or `database` recommended; file not safe across atomic releases |
| Filesystem | `common/foundation/config/filesystems.php` disks `local` (root `storage/app`, `serve:false`) + `public` (root `public/storage`, `serve:false`); `config/filesystems.php` upload_types `digitalProductFiles` visibility `private`, prefix `digital-products`, `dont_clean:true`, accept `pdf/zip/txt/epub` max 100 MB (plan limits enforced in `App\Entitlements\Entitlements` + `UploadType`); `storage/tus` via `TusServiceProvider::uploadDir()` | Private uploads must never be web-exposed |
| TUS | `common/foundation/src/Files/Tus/TusServer.php` resumable uploads at `api/v1/tus/upload/{any?}`, temp dir `storage/tus`, cleanup `tus:abort_expired` daily 02:30 | Survives releases via shared `storage/tus` |
| Scheduler | `routes/console.php` + `CommonServiceProvider::registerCommands()` — `ArchiveExpiredLinkeables` / `DisableExpiredLeapLinks` every 15 min, `DeleteOldWebhookDeliveries` 03:30, `horizon:snapshot` every 5 min when queue != sync, `schedule:be-health` every minute, `ProcessChapaSubscriptionRenewals` hourly with `withoutOverlapping`+`onOneServer`, plus daily cleanup jobs at 02:00-03:10 | Single cron entry `* * * * * cd <release> && php artisan schedule:run` |
| Horizon | `config/horizon.php` supervisor-1 `redis` queues `mail,default` balance auto, timeout 90, tries 3, `fast_termination:true`, prod `maxProcesses 5` | Production needs persistent process manager (Supervisor/systemd) |
| Broadcasting | `common/foundation/config/broadcasting.php` connections `reverb/pusher/ably/log/null`; default `log` locally | Not on deploy critical path unless `WEBSOCKETS_INTEGRATED` |
| Scout / Meilisearch | `common/foundation/config/scout.php` — `tntsearch` storage `storage/tntsearch` + `mysql` fallback | Not deployment-blocking; index rebuild is manual (`artisan scout:import`) |
| Health | `common/foundation/src/Core/Application.php:26` `health: '/up'` (Laravel 11+ health endpoint); `ScheduleHealthCommand` signature `schedule:be-health` | `/up` checks boot only; custom deploy health must check DB+storage |
| Build tool | `vite.config.ts` laravel-vite-plugin input `resources/client/main.tsx`, output `public/build` + `manifest.json`, sourcemaps, rolldown code-splitting | `npm run build` is deterministic and must run before release |
| API generation | `composer.json:155-158` `php artisan scramble:export` → `resources/client/api.json` + `api-public.json` then `npx orval` → `resources/client/gen/` | Generated clients are committed; build does **not** need `orval` — option to enforce drift check in CI |

### 1.2 Commerce / payment sensitivity

- **Chapa** — `config/services.php:chapa` (`CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`), `chapa/chapa-laravel dev-main`, gateway `App\Payments\ChapaGateway`, fulfillment `App\Payments\ChapaPaymentFulfillment::fulfill()` is **atomic** (`DB::transaction` + `lockForUpdate`, idempotent on `status==='paid'`, verifies `amount`/`currency`/`tx_ref` with `hash_equals`), controllers `ChapaCallbackController` (`billing/chapa/callback/{txRef}` GET|POST) + `ChapaWebhookController` (`billing/chapa/webhook` POST, HMAC `signatureIsValid`, `ChapaWebhookDeliveryLogger`). Webhook must never be blocked by maintenance mode.
- **Digital products** — `app/Storefront/Models/DigitalProduct`, `StorefrontOrder` (immutable snapshots `commission_bps`, `platform_fee_cents`, `creator_earnings_cents`), `DownloadEntitlement` (signed URL `storefront.download` with `URL::temporarySignedRoute`, `download_count` not consumed on missing file — `ProductionHardeningTest::testMissingProtectedFileDoesNotConsumeDownloadAttempt`), private files in `storage/app/digital-products` or S3 prefix `digital-products` with `USE_PRESIGNED_S3_URLS=true`.

### 1.3 Current verified quality gates

```
php artisan test                129 passed, 434 assertions (79s, ddev)  — 0 failures is the gate, count grows
php artisan config:cache        OK
php artisan route:cache         OK
php artisan event:cache         OK
php artisan view:cache          OK
php artisan optimize            OK (caches config+events+routes+views)
php artisan schedule:list       OK (verified by required job names, not hardcoded count — currently 13 entries: csvExports, s3:abort_expired, tus:abort_expired, pagination:optimize, bans:deleteExpired, otp:deleteExpired, app-logs:clean, schedule:be-health, uploading:count-files, billing:process-chapa-renewals, linkeables:archive_expired, leapLinks:disable, webhooks:delete-old-deliveries)
npm run build                   OK (vite 8, 14.96s, public/build/manifest.json 247k)
composer audit                  0 advisories (offline-safe)
npm audit (prod)                0 vulnerabilities expected; dev audit allowed to warn on storybook
routes count                    441 unique names, no duplicates (verified via route:list)
```

---

## 2. Current Deployment-Relevant Repository State

### 2.1 Already exists and WILL be reused

| Artifact | Path | Reuse |
|---|---|---|
| Production ops runbook | `docs/production-operations.md` | Secrets policy, Horizon/Scheduler/Backup/Rollback, smoke list — referenced, not duplicated |
| Horizon supervisor template | `deploy/supervisor/linket-horizon.conf.example` | Copied to `/etc/supervisor/conf.d/linket-horizon.conf` with path/user replaced |
| Env template | `env.example` | Documents required keys; CI uses synthetic `.env` (see §7) |
| Vite build → `public/build` | `vite.config.ts` + `public/.htaccess` | `FilesMatch` denies php in `public/build`, rewrite routes to `public/index.php` |
| Health endpoint | `bootstrap/app.php` `health: '/up'` | Deployment post-check hits `GET /up` + custom `php artisan deploy:health` |
| Scheduler heartbeat | `ScheduleHealthCommand` every minute via `MonitorsSchedule` | Cron verifies it; deploys must not remove `schedule:run` entry |
| Trust proxy | `config/trustedproxy.php` `TRUSTED_PROXIES` (do not use `*` in prod) | Set correctly before `config:cache` |
| .gitignore | `public/build` is currently ignored? **No** — `.gitignore:27` ignores `public/build` BUT repo has `public/build` committed (manifest tracked, assets churn noted in `docs/superpowers/backlog-2026-08-19-post-integration.md` P3-7). Decision: **treat `public/build` as artifact, not source**; CI rebuilds it; artifact deployment uploads rebuilt build (see §5). |

### 2.2 Gaps this architecture closes

- No `.github/workflows/` existed.
- No atomic release directory layout, no artifact, no `current` symlink.
- No deploy/rollback scripts, no cPanel discovery checklist, no pinned SHA deploy.
- No CI security-audit gates enforced in automation (manual `composer audit` / `npm audit` only).

### 2.3 Build contract (evidence-derived, not assumed)

A working Linket production release **requires**:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
# + artisan package:discover (post-autoload, composer.json:138)

npm ci                      # from package-lock.json (npm 11)
npm run build               # vite build → public/build/manifest.json + public/build/assets/*
# NOTE: npx orval is NOT required for a runnable release; scramble json is fallback.
#       Optional CI drift check: php artisan scramble:export + npx orval --check
php artisan migrate --force --no-interaction   # 81 migrations, some data migrations (e.g. 2026_05_26_125109_move_biolinks_to_biolinks_table)
php artisan storage:link    # only for public disk; private product files do NOT use public/storage
php artisan optimize        # config:cache + route:cache + view:cache + event:cache (all verified working)
php artisan horizon:terminate  # after new code is live (supervisor restarts)
php artisan schedule:run    # via cron every minute (scheduler itself, not per-task cron)
```

Static assets that change build-to-build: `public/build/manifest.json` + hash-named `public/build/assets/*`. **A release must contain its own matching manifest+assets**; deploying PHP from release A with assets from release B breaks Vite `__viteManifest`.

---

## 3. cPanel Capability Requirements

| Capability | Required / Preferred / Optional | Why for Linket | How to verify (read-only, no mutation) |
|---|---|---|---|
| **SSH access (key auth, non-standard port allowed)** | **REQUIRED** | Artifact upload (`scp`/`rsync`), running `deploy.sh` remotely | `ssh -p $CPANEL_SSH_PORT $CPANEL_SSH_USER@$CPANEL_SSH_HOST 'echo ok; id; pwd'` |
| **PHP CLI matching `>=8.2` (8.4 preferred)** | **REQUIRED** | `composer install`, `artisan migrate`, `artisan optimize`, Horizon | `php -v` ; `php -m | grep -i -E 'pdo_mysql|redis|mbstring|openssl|fileinfo|gd|curl|zip'` ; `which php` |
| **Correct `php` binary in PATH (or absolute path via `PHP_BINARY` env)** | REQUIRED | cPanel often exposes `ea-php84`, `alt-php84`; cron must use same binary as web | `ls -l /opt/alt/php*/*/usr/bin/php /usr/bin/php /usr/local/bin/php 2>/dev/null; crontab -l 2>&1 | head` |
| **Composer available (2.x)** | REQUIRED for hybrid fallback; **PREFERRED** for artifact mode (not needed if artifact pre-built) | Fallback when artifact not used | `composer --version 2>&1; which composer` |
| **Symlink + atomic `mv -Tf` switch (`ln -s tmp && mv -Tf tmp current` on same filesystem)** | **REQUIRED** for atomic deploy (Strategy D) | Near-zero-downtime; POSIX rename is atomic; `ln -sfn` is **not** atomic on all kernels | `rm -rf /tmp/linket-a /tmp/linket-l*; mkdir -p /tmp/linket-a; ln -s /tmp/linket-a /tmp/linket-l.next && mv -Tf /tmp/linket-l.next /tmp/linket-l && ls -l /tmp/linket-l; rm -rf /tmp/linket-a /tmp/linket-l*` |
| **Ability to change domain DocumentRoot to `<app>/current/public`** | **REQUIRED** for secure docroot (only `public/` exposed) | Prevents exposure of `.env`, `vendor`, `storage/app/private`, `bootstrap/cache` | cPanel → Domains → Document Root field editable; or `grep -R DocumentRoot ~/ 2>&1 | head`; ask host |
| **Cron (cPanel Cron Jobs)** | **REQUIRED** | `* * * * * cd <app>/current && php artisan schedule:run` | cPanel → Cron Jobs UI exists; `crontab -l 2>&1` |
| **Writable home + persistent `shared/` (storage/.env)** | REQUIRED | Private product files must survive releases | `mkdir -p ~/linket/shared && touch ~/linket/shared/.test && ls -ld ~/linket/shared ~/linket 2>&1; rm ~/linket/shared/.test` |
| **Disk: ~3-5 releases worth (≈ 1.2 GB vendor + 80 MB public/build per release)** | REQUIRED | Retention of 3-5 releases for rollback | `df -h ~ 2>&1 | head; du -sh ~/linket 2>&1 | head; du -sh vendor public/build storage 2>&1 | head` |
| **PHP extensions:** `pdo_mysql, mbstring, openssl, fileinfo, gd, curl, zip, bcmath, redis (or predis fallback), exif` | REQUIRED (redis extension preferred; `predis/predis` pure-php fallback exists but slower) | Migrations, image handling (`intervention/image`), encryption, zip, Chapa (guzzle/curl) | `php -m` |
| **MySQL CLI (`mysql`/`mysqldump`)** | PREFERRED | Pre-migration backup (`mysqldump`) + restore drill | `which mysqldump; mysqldump --version 2>&1 | head` |
| **Node 20 + npm 11 on server** | OPTIONAL (not needed if artifact pre-built) | Only if building `public/build` on cPanel (hybrid) | `node -v 2>&1; npm -v 2>&1; which node` |
| **Supervisor / systemd (or cPanel persistent-process feature) for Horizon** | **REQUIRED** if `QUEUE_CONNECTION=redis` + Horizon in production (see §11.2); else use flocked `queue:work --stop-when-empty` fallback — **never** `artisan horizon` from cron | Horizon is persistent; without supervision `mail`/`default` queues stall or fork-bomb | `which supervisord 2>&1; supervisorctl status 2>&1 | head; ps aux | grep horizon 2>&1 | head` |
| **OPcache control (php-fpm reload or `opcache.validate_timestamps=1`)** | PREFERRED | Symlink switch must be visible to FPM; otherwise stale opcode | `php -i | grep -i opcache 2>&1 | head -20; ls /opt/alt/php*/etc/php.d/*opcache* 2>&1 | head` |
| **Object storage (S3/R2) for private product files** | OPTIONAL (local `storage/app/digital-products` works but must be shared & backed up) | Local storage ties product files to host disk; S3 is more robust for CDNs | `env | grep -i STORAGE 2>&1 | sed 's/=.*/=***/'` (never print secrets) |

> For every REQUIRED capability that fails, **do not proceed to production cutover** — follow `deploy/cpanel-discovery.sh` remediation notes instead.

---

## 4. Deployment Strategy Comparison

Scored 1 (worst) → 5 (best) for Linket on cPanel, weighted by Linket-specific risks (payment callbacks, private files, Horizon).

| Strategy | Downtime | Rollback | cPanel Compat | Migration Safety | Complexity | Security (only `public/` exposed) | Reliability | Disk | Operational Burden | **Score** |
|---|---|---|---|---|---|---|---|---|---|---|
| **A — Direct rsync into live dir** | 1 — files change mid-request; OPcache sees partial tree; Vite manifest mismatches | 1 — no previous release to switch to | 5 — works anywhere | 1 — migration runs against live code, failure leaves half-deployed | 2 — simple but risky | 2 — often `~/public_html` = repo root | 2 — frequent half-deploy failures | 5 — no extra copies | 2 — manual | **2.0** |
| **B — `git pull` in production** | 1 — same races as A + `.git` exposed | 2 — `git reset --hard HEAD~1` leaves DB diverged, untracked files remain | 4 — needs git + SSH, `.git` in docroot | 2 — same as A | 2 | 1 — `.git` exposure | 2 | 5 | 2 | **2.1** |
| **C — Artifact + release dirs, manual DocumentRoot** | 4 — short window, but first request may hit old `public/build` | 4 — `current` points to previous release dir, DB needs expand/contract | 4 — needs symlinks, safe if DocumentRoot is `current/public` | 4 — migration gates activation (script fails closed) | 3 | 5 — only `public` exposed | 4 | 3 — retains N releases | 3 | **4.0** |
| **D — Artifact + atomic `current` symlink switch + retained releases (recommended)** | 5 — atomic `ln -s tmp && mv -Tf tmp current` (POSIX same-filesystem rename is atomic on ext4); in-flight requests finish on old inode, new requests hit new dir; no `artisan down` | 5 — one-liner `ln -s releases/<prev> current.next && mv -Tf current.next current && horizon:terminate && health` | 4 — needs symlinks + DocumentRoot = `current/public` (verified via §3) | 5 — migration runs **before** symlink, on shared DB; failure aborts switch; expand→deploy→contract enforced | 3 — script is ~220 lines but fully logged | 5 | 5 — idempotent, concurrent-deploy lock, health-gated activation | 3 | 4 — one command + artifact | **4.6** |

**Winner: D (Artifact + atomic release switch).** Fallback if symlinks/DocumentRoot unavailable: **C** with `.htaccess` boot indirection (documented in §6 fallback).

> **Zero-downtime honesty:** Code switch is atomic (symlink). **Migrations are not** — a locking `ALTER` or incompatible schema change can still stall queries for seconds-minutes. §10's expand→deploy→contract + `migrate --force` before atomic `mv -Tf` + no `artisan down` keeps Chapa callbacks reachable throughout, but the team must still classify each migration.

---

## 5. Recommended Final Architecture

### 5.1 End-to-end flow

```
Developer
  │ push branch
  ▼
GitHub Pull Request
  │  CI workflow (.github/workflows/ci.yml)  ──► zero failures gate,
  │   PHP 8.4 + Node 24 + MySQL 8.0               composer audit, npm audit (prod),
  ▼   build public/build, cache checks            route/config/view/event cache
Merge to main
  │  CI (ci.yml) must be green for that SHA + uploads exact artifact `linket-ci-<sha>` (see §8.2 artifact step)
  ▼
Gated deploy trigger (`workflow_run` on CI success, §9.1) — deploy reuses **exact** CI artifact, not a rebuild
  │  concurrency: production-deploy (queued, not cancelled)
  ▼
Deploy job (environment: production, needs gated SHA)
  │  pinned SHA; composer install --no-dev --optimize-autoloader
  │  npm ci + npm run build + php artisan optimize (dry-run)
  │  tar -czf linket-<sha>-<ts>.tar.gz --exclude .git, node_modules, storage, bootstrap/cache/*.php
  │  upload artifact (actions/upload-artifact v4) + checksum
  ▼
GitHub Environment: production  (manual approvals, protection rules, deploy history)
  │  reviewer approves (initial launch) → workflow continues
  ▼
Deploy job (needs: build, environment: production)
  │  download artifact (exact SHA, not latest main)
  │  scp artifact → $DEPLOY_HOST:~/linket/releases/<id>.tar.gz
  │  ssh deploy: bash deploy/deploy.sh <id>
  │    1. concurrency file-lock (flock) — fail if another deploy in progress
  │    2. create      ~/linket/releases/<id>/, extract tarball
  │    3. link shared ~/linket/shared/.env              → releases/<id>/.env
  │              shared/storage                          → releases/<id>/storage
  │              shared/bootstrap/cache                  → bootstrap/cache (optional) or recreate per-release
  │              shared/storage/app/public              → releases/<id>/public/storage (after storage:link)
  │    4. pre-flight: php -v matches, php artisan health:check --pre-migration
  │    5. backup DB if mysqldump available (pre-migration snapshot)
  │    6. php artisan migrate --force   (fail → abort, do NOT switch current)
  │    7. php artisan optimize && php artisan event:cache && php artisan view:cache
  │    8. php artisan storage:link  (idempotent)
  │    9. atomic switch: ln -s releases/<id> current.next && mv -Tf current.next current
  │   10. php artisan horizon:terminate  (supervisor restarts with new code)  — or queue:restart if horizon absent
  │   11. health: curl -fsS https://$APP_URL/up + php artisan deploy:health --post
  │   12. on failure → auto-rollback via same atomic rename to previous release + horizon:terminate
  │   13. cleanup: keep last 5 releases, delete older (never delete current or rollback target)
  ▼
cPanel cron (shared, not per-release)
  * * * * * cd ~/linket/current && /opt/alt/php84/usr/bin/php artisan schedule:run >> /dev/null 2>&1
  Horizon supervised by Supervisor (or cron fallback, see §11)
```

**Pinning:** CD deploys the exact artifact SHA that CI validated. No race where CI passes on A and CD deploys newer B. CI uploads `linket-ci-<sha>.tar.gz` on `push` to `main` (`ci.yml:artifact` job gated on `verify` success). Deploy workflow triggers **only** via `workflow_run: workflows: [CI] types: [completed]` when `conclusion == success` (`deploy-production.yml:resolve` job), downloads that same artifact via `dawidd6/action-download-artifact` using `run_id`. `workflow_dispatch` builds a fresh verified artifact for emergency deploys but still runs the full verification (composer audit/npm audit/optimize). The `build` job uploads `linket-<sha>-<ts>.tar.gz`; the `deploy` job downloads `${{ needs.build.outputs.artifact }}` by SHA.

**Concurrency:** `concurrency: group: production-deploy, cancel-in-progress: false` on both workflows queues deploys instead of interleaving them. `deploy.sh` also takes `flock ~/linket/.deploy.lock`.

### 5.2 Why artifact in CI vs. building on cPanel (Option A vs B vs hybrid)

- **Prefer artifact in CI (chosen).** Deterministic: the tarball that passed `php artisan test` + `composer audit` + `npm run build` + cache checks is exactly what goes live. Avoids cPanel resource limits (no Node, slow CPU, Composer memory 512M limit in `.ddev/php.ini`), avoids non-reproducible `npm ci` drift on server, keeps deploy SSH time short (upload 80-120 MB tarball vs. running `npm ci` 3 min on shared host). Matches `docs/production-operations.md` ideal but fixes its gap (it described building on server).
- **Hybrid fallback** (if artifact transfer impossible): `deploy.sh` detects missing `vendor/` in extracted release and runs `composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction` on server; attempts `npm ci && npm run build` only if `node` present else fails with guidance to pre-build. This path is slower and not recommended for production.

---

## 6. Directory Architecture

### 6.1 Recommended layout (Derived from cPanel home `~/linket`)

```
~/linket/                         # $DEPLOY_PATH (e.g. /home/<cpanel-user>/linket)
  current -> releases/20260820-143000-a6fb0e1d/   # atomic symlink — web traffic reads via this
  releases/
    20260820-143000-a6fb0e1d/       # <timestamp>-<short-sha>, holds full app + vendor + public/build
      .env          -> ../../shared/.env          # symlink (shared)
      storage       -> ../../shared/storage       # symlink (shared) — private product files survive
      public/storage -> ../../shared/storage/app/public
      bootstrap/cache  (per-release, recreated by optimize; optionally symlink to shared/bootstrap/cache)
      public/build/   (per-release, hash-named assets + manifest.json) — NEVER shared
      vendor/         (per-release)
    20260819-090000-bfbfd68/
    ...
  shared/                             # survives every release + rollback
    .env                              # Laravel env — never travels through CI (server-only)
    storage/                          # Laravel storage root (app/, framework/, logs/, tus/, tntsearch/)
      app/
        digital-products/             # private product files (prefix digital-products)
        uploads/                      # FileEntries generic uploads (see Uploads.php fallback)
        editable-views/seo-tags/
        tokens/gmail.json
      framework/
        cache/ sessions/ views/
      logs/
        laravel.log
      tus/                            # resumable uploads (TusServiceProvider::uploadDir)
      tntsearch/
      clockwork/
    bootstrap/cache/                  # optional shared; per-release cache regeneration preferred
  .deploy.lock                        # flock lock file
  backups/                            # optional local mysqldump snapshots before migrations (encrypted offline copy required per ops doc)

~/public_html  OR  domain DocumentRoot
  # IDEAL: cPanel Domain → DocumentRoot = ~/linket/current/public
  # Docroot contains only: index.php (from release), .htaccess, build/, storage symlink.
  # Nothing else exposed.
```

### 6.2 RELEASE-SPECIFIC vs SHARED

| Path | Scope | Reason |
|---|---|---|
| `app/`, `common/`, `config/`, `resources/client/gen/`, `routes/`, `database/migrations/`, `vendor/`, `public/build/`, `bootstrap/app.php` | **Release-specific** | Code & compiled assets; release N must see its own `manifest.json` + provider map |
| `.env` | **Shared** (`shared/.env` → `.env` symlink) | Secrets never in artifact; swapping release must not lose DB/Chapa keys |
| `storage/app/digital-products/`, `storage/app/uploads/`, `storage/tus/`, `storage/logs/`, `storage/framework/*`, `storage/app/tokens/`, `storage/tntsearch/` | **Shared** via `storage` symlink | Creator uploads, entitlements, TUS resumes, logs must survive rollback |
| `bootstrap/cache/config.php`, `packages.php`, `services.php`, `events.php` | **Per-release, release-specific (never symlinked to `shared/bootstrap/cache`)** | Each release caches its own config; sharing would leak old provider list and break atomic rollback — `shared/bootstrap/cache` dir exists only for `artisan optimize` temp writes, not for sharing |
| `public/storage` | Symlink to `shared/storage/app/public` inside each release (`storage:link`) | Public disk; idempotent per deploy |
| `public/build` | **Release-specific** | Hash-named Vite assets; sharing causes 404 on manifest mismatch |

### 6.3 DocumentRoot security

- **If cPanel allows custom DocumentRoot (REQUIRED capability):** set domain's DocumentRoot to `~/linket/current/public`. No other PHP files are web-reachable. `public/.htaccess` denies `*.php` except `index.php`.
- **Fallback if DocumentRoot is locked to `~/public_html`:** keep `~/public_html` as a symlink to `~/linket/current/public` **or** leave `~/public_html/index.php` as a one-line bootstrapper `require __DIR__.'/../linket/current/public/index.php';` and mirror `.htaccess`. The deploy script supports both (`LINK_PUBLIC_HTML=true` env). Never point DocumentRoot at repo root or at `~/linket/current`.

### 6.4 Permissions

```bash
chmod 750 ~/linket/shared/storage      # owner=rwx, group=rx, other=---
chmod 750 ~/linket/shared/storage/app
chmod 640 ~/linket/shared/.env
# deploy.sh enforces 775 on storage, 775 on bootstrap/cache per Laravel requirement,
# least-privilege otherwise, matching docs/production-operations.md § Deployment gate.
```

---

## 7. GitHub Secrets / Environment Model

### 7.1 GitHub Environment `production` (protection: required reviewers = 1, no bypass for admin during launch)

| Secret / Var | Location | Purpose | Never store as |
|---|---|---|---|
| `CPANEL_SSH_HOST` | Environment var `production` | Deploy target hostname | — |
| `CPANEL_SSH_PORT` | Env var | Custom SSH port (cPanel often 22/2222/21098) | — |
| `CPANEL_SSH_USER` | Env var | Deployment-only cPanel user (least privilege, jailed to `~/linket`) | — |
| `CPANEL_SSH_KEY` | **Environment secret** (not repo secret) | Dedicated deploy SSH private key (ed25519), no passphrase stored | Personal dev key |
| `CPANEL_SSH_KNOWN_HOSTS` | Env secret (**canonical**; `KNOWN_HOSTS` alias accepted for one-release transition) | `ssh-keyscan -p $PORT $HOST` output, pinned | `StrictHostKeyChecking=no` |
| `DEPLOY_PATH` | Env var | e.g. `/home/<user>/linket` | Hardcoded path in YAML |
| `APP_URL` | Env var | Health check target `https://linket.example` | — |
| `PHP_BINARY` | Env var | `php` or `/opt/alt/php84/usr/bin/php` (for cron + deploy.sh) | — |
| `HEALTHCHECK_TOKEN` | Optional env secret | If health endpoint is private (not `/up`) | — |

> Historical mistake this fixes: previous guidance used `GITHUB_TOKEN=ghp_...` inside `.env` (`cat .env` last line). Production `.env` must never traverse CI. CI uses synthetic env from `env.example` mapping, not production secrets (§8).

### 7.2 Server-only `shared/.env` (never in git, never in CI, never in artifact)

`APP_KEY`, `DB_*`, `REDIS_*`, `CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`, `MAIL_*`, `SENTRY_DSN`, `TRUSTED_PROXIES`, `SESSION_SECURE_COOKIE`, `HORIZON_PREFIX`, `STORAGE_S3_*` / `PUBLIC_DISK_DRIVER`, etc. Backed up encrypted offline per `docs/production-operations.md:65-76`. Rotation is manual on server + supervisor reload.

### 7.3 SSH security

- Create dedicated deploy key: `ssh-keygen -t ed25519 -f linket-deploy -C linket-cpanel-deploy`.
- Authorized on cPanel side via **SSH Access → Manage SSH Keys → Import** or `~/.ssh/authorized_keys` (mode 600) restricted with `command="bash ~/linket/deploy/deploy.sh"` if provider supports.
- CI writes key to `~/.ssh/id_ed25519` with `chmod 600`, builds `known_hosts` from `CPANEL_SSH_KNOWN_HOSTS`. Never `StrictHostKeyChecking=no` except explicit bootstrap step guarded by `ALLOW_INSECURE_HOSTKEY=false`.

---

## 8. CI Design (`.github/workflows/ci.yml`)

### 8.1 Triggers & concurrency

```yaml
on:
  pull_request: { branches: [main] }
  push:         { branches: [main] }   # validates main after merge, also supplies deploy artifact SHA
  workflow_dispatch:
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true   # PR pushes cancel stale runs; production-deploy group is separate (queued)
```

### 8.2 Jobs (must match actual repo, no invented linters)

| Step | Command | Why (repo evidence) |
|---|---|---|
| Checkout | `actions/checkout@v4` | — |
| PHP 8.4 | `shivammathur/setup-php@v2` php 8.4, exts `mbstring, pdo_mysql, gd, zip, bcmath, exif, redis, curl, openssl, fileinfo`, coverage none | `composer.json php >=8.2`, `.ddev/php_version 8.4`, required exts from §3 |
| Composer | `actions/cache@v4` + `composer install --prefer-dist --no-interaction` | `composer.lock` present, `composer audit` needs full install |
| Synthetic env | `cp env.example .env && php artisan key:generate --ansi` then patch `DB_*` to CI MySQL, `CACHE_STORE=array, SESSION_DRIVER=array, QUEUE_CONNECTION=sync, SCOUT_DRIVER=null` for tests | Never use production secrets; `env.example` lacks `APP_KEY` so generate one |
| DB service | `mysql:8.0` with `DB_DATABASE=belink_test` | Matches `.ddev` MySQL 8.0 |
| Migrate | `php artisan migrate --force --no-interaction` | 81 migrations must apply cleanly |
| Tests | `php artisan test --compact` (no custom filter) — **gate: 0 failures** | Current `129 passed` baseline; do not hardcode count, only `exit 0` matters |
| Config cache | `php artisan config:cache && php artisan config:clear` | `docs/production-operations.md:99-122` gate; proves prod config caching works (TrustProxies etc.) |
| Route / view / event cache | `php artisan route:cache` + `php artisan event:cache` + `php artisan view:cache` | Verified working in hardening; failure here blocks deploy |
| Security | `composer audit --no-interaction` (prod advisories) | Gate: must be 0; network failures are **not** ignored — workflow retries with `COMPOSER_DISABLE_NETWORK=0` |
| Node 24 | `actions/setup-node@v4` node 24.19.0, `cache: npm` | Lockfile present; `package.json` engines enforces the floor |
| npm ci | `npm ci` | Deterministic, uses `package-lock.json` |
| Lint | `npm run lint` (`oxlint`) — **allowed to warn, not fail** unless project enforces zero warnings | Repo has `oxlint` script, no `typecheck` — do not invent `tsc --noEmit` as gate |
| Build | `npm run build` (vite) — validates `public/build/manifest.json` generation | Must succeed for artifact |
| JS audit | `npm audit --omit=dev --audit-level=moderate` → fail on **production** vulnerabilities only | `docs/production-operations.md` says `npm audit`; dev-only (storybook) CVEs with `dev:true` in lockfile are ignored via `--omit=dev` |
| Artifact (on `main` push only) | `tar -czf linket-${SHA}.tar.gz --exclude=.git --exclude=node_modules --exclude=storage --exclude=public/hot … && php artisan optimize --dry-run` | Produces pinned artifact for CD; upload via `actions/upload-artifact@v4` |

Permissions: `contents: read` only. No `write` needed for CI.

---

## 9. CD Design (`.github/workflows/deploy-production.yml` + `deploy/deploy.sh`)

### 9.1 Triggers (gated on CI success — no independent push race)

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]                 # triggers only when CI completes on main
  workflow_dispatch:
    inputs:
      deploy_sha: { description: "SHA to deploy (empty = head_sha)", required: false, type: string }
concurrency:
  group: production-deploy
  cancel-in-progress: false          # queued, not cancelled — never interleave
# Gate: deploy job runs only if github.event.workflow_run.conclusion == 'success'
# (enforced in jobs.resolve — see deploy-production.yml:resolve)
```

### 9.2 Chain (strong: SHA-pinned, CI-gated, approval-gated)

```
commit SHA @main
  → ci.yml on push(main) must be green for that SHA (required status check)
  → deploy-production.yml job `build` re-validates SHA (or reuses ci artifact via needs)
  → GitHub Environment `production` requires 1 reviewer approval (launch) + protection rules
  → deploy job downloads artifact linket-<SHA>.tar.gz (not latest main)
  → scp to server, run deploy.sh with that SHA
```

No local-source fallback — `actions/checkout` SHA must equal deployed artifact's SHA recorded in `releases/<id>/RELEASE_SHA`.

### 9.3 Job responsibilities

- **`build`** (reuses CI cache but produces deployable tarball) — `composer install --no-dev --prefer-dist --optimize-autoloader`, `npm ci && npm run build`, dry-run `php artisan optimize`, exclude `node_modules/.git/storage/.env/bootstrap/cache/*.php/public/hot`, `sha256sum` + `RELEASE_SHA` file.
- **`deploy`** — `needs: [build]`, `environment: production` (pins secrets), sets `DEPLOY_ID="$(date +%Y%m%d-%H%M%S)-${GITHUB_SHA::7}"`, `scp` tarball, `ssh` invoke:

```bash
bash ~/linket/deploy/deploy.sh \
  --release-id="$DEPLOY_ID" \
  --artifact="releases/$DEPLOY_ID.tar.gz" \
  --php-binary="$PHP_BINARY" \
  --health-url="$APP_URL/up" \
  --keep-releases=5
```

`deploy.sh` is idempotent and logs every step with `set -euo pipefail` + `trap 'rollback' ERR`.

### 9.4 `deploy/deploy.sh` safety gates (summary — full script in repo)

1. `flock -n .deploy.lock` or exit 1 (concurrent deploy lock).
2. Validate `php -v` ≥8.2, `php -m` has `pdo_mysql`, `.env` exists in `shared/.env`.
3. Create `releases/<id>/`, extract (verify `RELEASE_SHA` inside).
4. Symlink `shared/.env → .env`, `shared/storage → storage`, ensure `storage/{app,framework,logs,tus,tntsearch}` + `bootstrap/cache` writable.
5. `php artisan storage:link` (idempotent) and assert `public/storage` not a real directory.
6. **Pre-migration backup** if `mysqldump` + DB creds available: `mysqldump --single-transaction --quick | gzip > ~/linket/backups/pre-<id>.sql.gz` and record checksum.
7. `php artisan migrate --force` — on failure: abort, **do not** move `current`, exit 1 (operator sees MR log).
8. `php artisan optimize && php artisan event:cache` (inside new release dir, before switch) — verifies caches still build against new config.
9. **Activate atomically:** `ln -s releases/<id> current.next && mv -Tf current.next current` (POSIX same-filesystem atomic rename) + optional `ln -s ~/linket/current/public public_html.next && mv -Tf public_html.next ~/public_html` if `LINK_PUBLIC_HTML`.
10. `php artisan horizon:terminate` (or `php artisan queue:restart` fallback) — worker that was running old code restarts with new code on next Supervisor loop; `killasgroup=true` in supervisor conf ensures clean restart.
11. **Health:** `curl -fsS --retry 3 --max-time 10 "$HEALTH_URL"` (expects 200 from `/up`) **and** `php artisan deploy:health --post` (DB+storage writable, no pending migrations). On failure: auto-rollback via `ln -s releases/<prev> current.next && mv -Tf current.next current`, `horizon:terminate`, re-health, exit 1.
12. **Cleanup:** `ls -1t releases | tail -n +6 | xargs rm -rf` — never deletes `current` or previous rollback target (guarded).
13. Record `RELEASE_SHA`, `DEPLOYED_AT`, `DEPLOYED_BY` in `releases/<id>/DEPLOY_META`.

Failure mode is always **closed** (previous release stays live). No `artisan down`.

---

## 10. Migration Strategy

### 10.1 Classification (apply to every future PR before merge)

| Type | Example | Safe online? | Policy |
|---|---|---|---|
| **Safe** | add nullable column, new table not yet read, new index concurrently (`algorithm=inplace` on MySQL 8), add FK with `not valid` then validate | Yes | `php artisan migrate --force` before atomic `mv -Tf` |
| **Potentially locking** | add `NOT NULL` without default on large table, `ALTER` rewriting table, add unique index on hot table, change column type | Maybe (seconds-minutes lock on MySQL) | Schedule low-traffic window, or use `pt-online-schema-change` / `gh-ost`, or manual shadow-table; never on Friday afternoon |
| **Destructive** | drop column, drop table, rename column, change enum values | **No** for old code | **Expand→Deploy→Contract**: v1 adds new column (nullable), app reads both; v2 app stops reading old column; v3 drop old column in separate release after deploy confirmed |
| **Data migration** | backfill `commission_bps` into historical rows, hydrate `biolinks` from `link_groups` | Depends on row count | For >100k rows, batch with `chunkById(1000)` + progress, run in Horizon job, not bare `migrate` transaction; must be idempotent |
| **Large backfill** | >1M rows, full table scan | No | Run as queued job after deployment, with `withoutOverlapping` guard, resumable |

### 10.2 Expand → Deploy → Contract example (real Linket case: `2026_05_26_125109_move_biolinks_to_biolinks_table`)

- **Expand** (release N): migration creates `biolinks` + `biolink_link` tables, keeps `link_groups` intact; app writes to both.
- **Deploy** (release N+1): app switches reads to `biolinks`; `link_groups` read path removed behind feature flag.
- **Contract** (release N+2, after 1-2 successful deploys + backup): migration drops `link_groups` only after confirming no running worker still queries it (`queue:restart` after each contract-phase degrade).

### 10.3 Failure handling

```
release uploaded
migration starts
migration fails (non-zero exit)
→ deploy.sh aborts before atomic `mv -Tf`
→ current still points to previous release (= in-flight Chapa callbacks continue on old code)
→ CI logs show failing migration SQL; operator fixes migration, pushes new SHA
→ next deploy retries from clean state (failed release dir remains for forensics, not live)
```

Never run `migrate:rollback` automatically on deploy rollback — it would reverse schema the live DB already wrote as. Rollback is **code** only (symlink), then a forward-fix migration.

---

## 11. Queue / Scheduler Strategy

### 11.1 What Linket actually queues

- **Horizon queues `mail` + `default`** (config/horizon.php). Known producers: receipt emails (`mail`), `ProcessChapaSubscriptionRenewals` (hourly), webhook deliveries, and any job dispatched with `->onQueue('mail')`.
- **Not yet queued at scale:** no heavy media transcoding, no bulk TUS post-processing. `QUEUE_CONNECTION=sync` locally is intentional for dev; production `redis` is mandatory.

### 11.2 Production Horizon supervision

- **Preferred (if host offers Supervisor/systemd):** install `deploy/supervisor/linket-horizon.conf.example`:

```ini
[program:linket-horizon]
command=/opt/alt/php84/usr/bin/php /home/<user>/linket/current/artisan horizon
directory=/home/<user>/linket/current
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=<cpanel-user>
redirect_stderr=true
stdout_logfile=/home/<user>/linket/shared/storage/logs/horizon.log
```

Then `supervisorctl reread && update && restart linket-horizon && supervisorctl status linket-horizon`.

If the host **does not** allow Supervisor (common on cheap cPanel):

Horizon is a **persistent process** and must not be spawned from cron every minute — that creates overlapping workers and memory leaks. **Require a real process manager** (Supervisor, systemd, or cPanel's Application Manager / Node.js-style persistent process feature). If no process manager is available, **do not run Horizon**; instead run a **locked, bounded** queue worker under cron:

```cron
* * * * * /usr/bin/flock -n /tmp/linket-queue.lock /opt/alt/php84/usr/bin/php /home/<user>/linket/current/artisan queue:work --stop-when-empty --max-jobs=100 --max-time=55 --sleep=3 >> /dev/null 2>&1
```

This uses `flock -n` so only one `queue:work` runs at a time, `--stop-when-empty` exits when queues are drained, and `--max-time=55` guarantees exit before next minute. Monitor `failed_jobs`. This fallback is **not** Horizon — Horizon metrics/dashboard will not be available.

Detection: `which supervisord; supervisorctl status | grep horizon; ps aux | grep horizon`.

### 11.3 Deploying workers

Old workers are long-running and keep old code in memory. **Every** deploy must:

```bash
php artisan horizon:terminate   # preferred (reads Horizon prefix + redis state)
# fallback:
php artisan queue:restart       # sets cache key so workers exit after current job
```

Supervisor restarts them within seconds. Deploy script does this **after** atomic `mv -Tf`; jobs in flight finish on old code, next jobs run new code. No dropped Chapa callbacks because fulfillment is idempotent (see §1.2).

### 11.4 Scheduler

- **One cron entry** (shared): `* * * * * cd ~/linket/current && $PHP_BINARY artisan schedule:run >> /dev/null 2>&1` — uses `current` symlink so it follows deploys without editing cron.
- Timezone: `common/foundation/config/app.php` `APP_TIMEZONE=UTC` and `config/app.timezone`; cron runs in server timezone — keep both at `UTC` to avoid drift.
- Diagnostics: `php artisan schedule:list` in CI + `schedule:be-health` every minute (logged to `schedule_logs`), horizon:snapshot every 5 min.

---

## 12. Backup / Restore Strategy

Reuses `docs/production-operations.md:65-76` — extended here with operational detail.

### 12.1 What must be recoverable as a set

- **MySQL dump** + **private product files** (`shared/storage/app/digital-products`, S3 prefix `digital-products`) + **`shared/.env`** (encrypted offline) + **`storage/app/tokens`/`storage/tus`** (in-flight uploads).
- A DB backup without product files is **not sufficient** — entitlements would point to missing objects.

### 12.2 Frequency & retention

| Backup | Frequency | Retention | Verification |
|---|---|---|---|
| DB `mysqldump --single-transaction --quick` | Daily + **immediately before every `migrate`** (deploy.sh pre-step) | 30 days daily + 7 days pre-migration snapshots (oldest pruned after successful deploy health) | Check `file backup-*.sql.gz | head`, `gzip -t`, record size+sha256 |
| Object storage | Versioning enabled on bucket/prefix if S3; otherwise `rclone sync shared/storage/app/digital-products → encrypted offsite` nightly | Same as DB | List prefix count, sample signed download |
| `.env` + app secrets | Manual encrypted copy on change (1Password / Vault), never in artifact | Indefinite (versioned) | Decrypt + `php artisan config:cache --dry-run` |

### 12.3 Restore drill (before launch + quarterly)

1. Restore DB dump into isolated MySQL (not production host).
2. Restore object prefix into temp bucket/dir.
3. Boot Linket with restored `shared/.env` + `shared/storage` in staging (Docker or separate cPanel subdomain).
4. Assert: `php artisan migrate:status` shows no pending, `php artisan deploy:health --post` green.
5. Exercise private download: create test `DownloadEntitlement`, fetch signed URL (200), unfetch with expired/mangled token (403/410), expired link still blocked.
6. Reconcile: compare `paid` orders vs `paid` transactions vs `digital_product_earnings_ledger` vs entitlements counts; run `AdminCommerceInsightsTest`-style queries.
7. Document drill outcome, then **delete** staging restore.

> Backup is not considered verified until the drill's protected download succeeds (§ production-operations.md).

---

## 13. Rollback Strategy

### 13.1 Application rollback (fast, safe)

```bash
# list releases
ls -lt ~/linket/releases
# previous good release is second newest (most recent before failed one)
PREV="$(ls -1t ~/linket/releases | sed -n '2p')"
ln -s ~/linket/releases/$PREV ~/linket/current.next && mv -Tf ~/linket/current.next ~/linket/current
cd ~/linket/current && $PHP_BINARY artisan optimize
$PHP_BINARY artisan horizon:terminate   # or queue:restart
curl -fsS https://$APP_URL/up
$PHP_BINARY artisan deploy:health --post
```

`deploy.sh` does this **automatically** on post-deploy health failure (see §9.4 step 11). It never runs `migrate:rollback`.

### 13.2 Database rollback is a SEPARATE incident action

- Normal deploy: DB moves forward only (expand→deploy→contract). Rolling back **code** does not roll back DB; migrations must be written to keep old code compatible with new schema (nullable new columns, etc.).
- Emergency DB restore: only as coordinated action with matching **product files** restore (see §12), with site in maintenance mode during window. Decision owner: incident lead.

### 13.3 Retention

Keep `keep_releases=5` (configurable). Cleanup script refuses to delete `current` or `PREV` (second newest) — the rollback target — even if older than 5.

### 13.4 Release metadata (traceability)

Each `releases/<id>` contains:

- `RELEASE_SHA` (full git SHA)
- `RELEASE_TAR_SHA256`
- `DEPLOY_META` (`deployed_at`, `deployed_by`, `workflow_run_url`)
- Accessible via SSH: `cat ~/linket/current/RELEASE_SHA` answers "what exact version is production running?" — can also expose via `php artisan deploy:info` (not HTTP, to avoid leaking SHA to public).

---

## 14. Risks / Unknowns (must verify on server before cutover)

| # | Unknown | Why it matters | Exact verification | If unsupported |
|---|---|---|---|---|
| U1 | Atomic symlink swap (`ln -s tmp && mv -Tf tmp current` on same filesystem) | Core to zero-downtime | `deploy/cpanel-discovery.sh` atomic swap test (creates tmp symlink then `mv -Tf`) | Fall back to in-place deploy with maintenance window (document downtime) |
| U2 | Ability to set DocumentRoot to `~/linket/current/public` | Prevents exposure of `.env`/`vendor` | cPanel → Domains → DocumentRoot editable? ask host | Use `~/public_html → ~/linket/current/public` symlink fallback (documented) |
| U3 | PHP binary path & version for both web FPM and CLI/cron | Mismatch breaks `optimize` vs web runtime | `php -v` via SSH + `phpinfo()` via web `php -i` vs `GET /up` header `X-PHP-Version` | Pin `PHP_BINARY` env, add Cron with full path |
| U4 | OPcache `validate_timestamps` / FPM reload needed after atomic `mv -Tf` symlink swap | Stale opcode after swap can serve old code for minutes | `php -i | grep opcache` on CLI vs web; time a file change and curl | Add `opcache_reset()` via `php artisan opcache:clear` endpoint guarded by secret, or ask host to enable `validate_timestamps` |
| U5 | Redis available & php `ext-redis` vs `predis` | Horizon + cache require Redis in prod | `redis-cli -h $REDIS_HOST ping 2>&1` ; `php -m | grep redis` | Use `database` driver fallback + queue `database` (slower, not recommended for payouts) |
| U6 | Supervisor/systemd or equivalent persistent-process manager | Horizon supervision (REQUIRED for Horizon; see §11.2 bounded queue:work fallback) | `supervisorctl status` | Bounded flocked `queue:work --stop-when-empty` (§11.2) — never `artisan horizon` from cron |
| U7 | `mysqldump` present & DB user has `LOCK TABLES` | Pre-migration backup | `which mysqldump` + `mysqldump --no-data belink 2>&1 | head` | Manual snapshot before deploy (phpMyAdmin export) |
| U8 | Node 20 on server | Only matters if not using pre-built artifact | `node -v` | Always use CI-built artifact (recommended) |
| U9 | `TRUSTED_PROXIES` value (if behind Cloudflare/cPanel proxy) | Wrong value breaks `X-Forwarded-Proto`, forces http | `curl -I https://$APP_URL` check `Strict-Transport-Security` + `X-Forwarded-Proto` handling | Leave unset if no proxy, set to exact CIDR |
| U10 | Disk quota / inode quota | Release retention requires ~5× vendor+build | `quota -s 2>&1 | head; df -h ~` | Reduce `keep_releases` to 3, prune logs |

> **Do not mark cutover complete until every U1-U10 has an explicit PASS/FAIL entry in the cutover log.**

---

## 15. Production Cutover Checklist

### 15.1 Pre-deploy (read-only)

- [ ] Run `bash deploy/cpanel-discovery.sh` on cPanel — paste output to cutover log, resolve any REQUIRED FAIL.
- [ ] Confirm `shared/.env` on server matches `docs/production-operations.md` HTTPS/ trusted proxy / redis / horizon block; `TRUSTED_PROXIES` is exact, not `*`; `APP_DEBUG=false`.
- [ ] Verify `~/linket/shared/storage` is writable, `shared/storage/app/digital-products` exists, `bootstrap/cache` writable (least-privilege 775/640).
- [ ] Confirm Cron entry exists: `* * * * * cd ~/linket/current && $PHP_BINARY artisan schedule:run …` (check `crontab -l`).
- [ ] Confirm Supervisor (or cron fallback) shows `linket-horizon RUNNING` (`supervisorctl status` / `ps aux | grep horizon`).
- [ ] Record current production `RELEASE_SHA` (`cat ~/linket/current/RELEASE_SHA` or doc prior hash).

### 15.2 CI gate (must be green on `main` HEAD SHA)

- [ ] `php artisan test` — **0 failures** (count reported, not asserted).
- [ ] `php artisan config:cache` / `route:cache` / `event:cache` / `view:cache` — all OK.
- [ ] `composer audit` — 0 advisories.
- [ ] `npm audit --omit=dev` — 0 moderate+ production vulnerabilities.
- [ ] `npm run build` — OK, `public/build/manifest.json` present.
- [ ] `php artisan schedule:list` — heartbeat `schedule:be-health` present + all required jobs by name (not hardcoded count): `csvExports:delete`, `s3:abort_expired`, `tus:abort_expired`, `pagination:optimize`, `bans:deleteExpired`, `otp:deleteExpired`, `app-logs:clean`, `schedule:be-health` (every minute), `uploading:count-files`, `billing:process-chapa-renewals`, `linkeables:archive_expired`, `leapLinks:disable`, `webhooks:delete-old-deliveries`.

### 15.3 Deploy

- [ ] Push to `main` or `workflow_dispatch` with approved `production` environment reviewer.
- [ ] Watch `deploy-production.yml` logs — artifact SHA matches merged SHA, `deploy.sh` pre-checks PASS, backup created, `migrate --force` green, atomic `mv -Tf` + `horizon:terminate`, `GET /up` 200 + `deploy:health --post` green, cleanup kept 5 releases.
- [ ] Post-deploy: `curl -fsS https://$APP_URL/up` from operator laptop + incognito.

### 15.4 Smoke (real browser + mobile viewport — w/ `docs/production-operations.md:123-131`)

- [ ] Register new user → receives default **Free** plan.
- [ ] Create digital product + upload allowed private file (`digitalProductFiles`, e.g. pdf 1 MB) → succeeds, file stored under `shared/storage/app/digital-products` **not** `public/`.
- [ ] Approve product (admin), copy its sell link (`/{biolink}/products/{id}`).
- [ ] **Chapa sandbox**: complete checkout, follow `billing/chapa/callback/{txRef}` + webhook `billing/chapa/webhook` both idempotent — duplicate callback yields exactly one paid transaction, one fulfilled order, one earnings ledger credit, one entitlement, one receipt, one `Purchase` pixel event.
- [ ] Immutable fee snapshot persists after plan change (pro checkout re-checked).
- [ ] Signed download succeeds, expired/mangled link fails, underlying object URL (S3 or `public/storage`) is **not** directly reachable.
- [ ] Creator sees sale in **Home**, **Orders**, **Customers**, **Sales & Payouts** (ledger + availability).
- [ ] Other workspace cannot access the product/order/customer/payout/download (authorization 403).

### 15.5 Post-deploy hardening

- [ ] Confirm only `public/` is web-exposed: `curl https://$APP_URL/../.env` → 404, `curl https://$APP_URL/../vendor/laravel/framework/src/Illuminate/Foundation/Application.php` → 404.
- [ ] Horizon: `php artisan horizon:status` → running, queues `mail,default` with <60s waits.
- [ ] Scheduler: check `schedule_logs` has recent `schedule:be-health` `exit_code 0` within last 2 min.
- [ ] Backup verification: `mysqldump` backup exists, `sha256sum`, and offsite copy recorded.
- [ ] **Restore drill rehearsal** (isolated staging) → backup verified (see §12.3).
- [ ] **Rollback rehearsal**: `ln -s releases/<prev> current.next && mv -Tf current.next current` + health → back to previous, then redeploy current SHA → green.

### 15.6 Outstanding validation before calling production *operational* (per prompt)

- [ ] Real browser smoke (above) — **required, not yet rehearsed**.
- [ ] Mobile smoke — **required**.
- [ ] Chapa sandbox callback end-to-end — **required**.
- [ ] `TRUSTED_PROXIES` + HTTPS + HSTS confirmation on primary domain + custom domain paths.
- [ ] Queue supervision (Supervisor) confirmed on cPanel (not just ddev).
- [ ] Backup restore + rollback rehearsals — **required before traffic**.

---

## Appendix A — Build Contract Cheatsheet

```bash
# Local/dev (ddev)
ddev exec composer install --no-interaction
ddev exec npm ci && ddev exec npm run build
ddev exec php artisan migrate --force
ddev exec php artisan optimize        # config+events+routes+views
ddev exec php artisan schedule:list
ddev exec php artisan horizon:terminate # if using horizon locally

# CI (see ci.yml) — synthetic env, mysql:8.0 service, redis not needed for tests (sync driver)
composer install --prefer-dist --no-interaction
npm ci && npm run build
php artisan test                # 0 failures is gate
composer audit && npm audit --omit=dev
php artisan config:cache route:cache event:cache view:cache

# Production artifact (CD build job)
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
npm ci && npm run build
tar -czf linket-<sha>.tar.gz --exclude=.git --exclude=node_modules --exclude=storage --exclude=public/hot ...
# Server activation handled by deploy/deploy.sh (migrate → optimize → ln -s tmp && mv -Tf tmp current → horizon:terminate → health → cleanup)
```

---

## Appendix B — Document History

| Date | Change |
|---|---|
| 2026-08-20 | Initial architecture derived from repo at `a6fb0e1d` + post-integration migrations (81) + verified ddev runtime (PHP 8.4, MySQL 8.0, Node 20, Vite 8, 129 tests passing). |
