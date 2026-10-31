# Linket production operations

## Required environment and HTTPS

Production must use a dedicated environment file or platform secret store. At minimum:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://linket.example
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SESSION_ENCRYPT=true
DISABLE_CSRF=false
IS_DEMO_SITE=false
```

Terminate TLS at the application server or a controlled reverse proxy, redirect HTTP to HTTPS, and enable HSTS only after HTTPS has been verified for the application and every supported custom domain.

Set `TRUSTED_PROXIES` to the exact proxy IPs or CIDR ranges allowed to supply forwarded headers. Do not use `*` in production. If the application is not behind a proxy, leave it unset. Ensure the origin server is not publicly reachable around the proxy.

## Queue and Horizon

Use Redis for queues and cache in production:

```dotenv
APP_ENV=production
APP_DEBUG=false
QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1
HORIZON_PREFIX=linket_horizon:
```

Install `deploy/supervisor/linket-horizon.conf.example` as a Supervisor program after replacing the application path and Unix user. Reload Supervisor, then verify `php artisan horizon:status` reports an active process. Horizon handles both the `mail` and `default` queues; receipt emails, Chapa renewal reminders, and payment-dispute notifications use those queues (`mail` for email channel, `default` for database channel). Dispute notification jobs must never refund, release files, or mark payments verified.

During deployment, run migrations (including `storefront_payment_disputes` lifecycle/events) and rebuild application caches, then run `php artisan horizon:terminate`. Supervisor starts Horizon again with the new code.

Safe local (DDEV) mirror — do not apply these host values to production:

```dotenv
QUEUE_CONNECTION=redis
REDIS_HOST=redis
REDIS_PORT=6379
HORIZON_PREFIX=linket_horizon:
MAIL_MAILER=smtp
```

Verify locally with `ddev redis-cli ping`, `ddev artisan horizon` (or `queue:work redis --queue=mail,default`), `ddev artisan queue:failed`, and `ddev artisan schedule:list` before promoting the same operational checks to the target environment.

## Scheduler

Install one cron entry for the web server user:

```cron
* * * * * cd /var/www/linket && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

The scheduler records a health heartbeat every minute. Chapa renewal reminders, grace-period transitions, and subscription expiry run hourly with overlap and single-server protection.

## Private product storage

Digital product uploads use the private `digitalProductFiles` upload type. In production:

- use a private filesystem disk; never expose the digital-product prefix through a public web root;
- for S3-compatible storage, block public bucket access and keep `USE_PRESIGNED_S3_URLS=true`;
- grant the application only the object operations it needs for its configured prefix;
- verify a signed Linket download succeeds, while the underlying object URL and an expired or modified Linket URL fail;
- alert on missing objects referenced by active download entitlements.

There is currently no automated orphan-product-upload pruning command. Do not run blanket storage deletion. Add a dry-run inventory and retention policy before enabling cleanup in production.

## Backup and restore

Back up the database and private product storage as one recovery set. Use encrypted, access-controlled backups outside the application host and enable object versioning when the storage provider supports it.

- Run database backups at least daily and before every schema deployment.
- Retain enough point-in-time history to recover delayed payment or deletion mistakes.
- Record backup timestamps, sizes, checksums, and completion status.
- Perform a restore drill into an isolated environment before launch and on a recurring schedule.
- After restore, reconcile paid orders, payment transactions, fee snapshots, earnings ledger entries, refunds, entitlements, and referenced product objects before reopening traffic.

A backup is not considered verified until an isolated restore boots, migrations report no unexpected pending work, and a protected test download can be completed.

## Outgoing mail

In **Admin → Settings → Email → Outgoing**, configure SMTP credentials and a sender address your provider has authorized. Then open **Admin → Transactions** and use **Send test email**. Confirm it is marked sent in **Admin → Logs → Outgoing email**.

## Payment checks

Use **Admin → Transactions** to check pending or failed Chapa attempts, Horizon state, failed jobs, scheduler heartbeat, and recent signed webhook outcomes. The Chapa signing secret remains configured only in **Admin → Settings → Subscriptions** or `CHAPA_WEBHOOK_SECRET`; never place it in source control or logs.

Before enabling live payments:

- complete the full purchase journey in Chapa sandbox using success, pending, failed, cancelled, and duplicate callback scenarios;
- confirm webhook signatures are rejected when missing or invalid;
- confirm verified amount, currency, and returned transaction reference match the stored pending transaction;
- confirm duplicate callbacks produce one paid transaction, one fulfilled order, one earnings credit, one set of entitlements, one receipt dispatch, and one Purchase event per entitled pixel;
- confirm Free and Pro purchases persist the configured fee basis points at checkout and later plan changes do not alter historical orders;
- test partial and full refund snapshots, entitlement revocation, and payout availability reconciliation.

Logs may contain internal payout/order identifiers, gateway references, status, amount, currency, and safe failure codes. They must not contain webhook secrets, access tokens, buyer recovery tokens, bank or mobile destinations, full gateway payloads, or private file URLs.

## Executable deployment checklist

Run this sequence on the **target** host (or release candidate) before opening traffic. The preflight command is read-only and never prints secrets.

### 1. Backup (before migrate)

```bash
# Database dump — store encrypted off-host with timestamp + checksum
mysqldump --single-transaction --routines --triggers "$DB_DATABASE" \
  | gzip -c > "/backups/linket-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
sha256sum "/backups/linket-"*.sql.gz | tail -1

# Private product objects — sync or snapshot the private disk/prefix
# Keep this backup paired with the DB dump as one recovery set.
```

### 2. Build and install

```bash
composer install --prefer-dist --no-interaction
npm ci
php artisan test --compact --filter='PaymentDispute|VerifyEtDirectCheckout|BuyerDownload|ProductionPreflight|PaymentRecovery'
composer audit
npm audit
npm run build
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
```

### 3. Migrate and activate

```bash
php artisan down --retry=60 --secret="$DEPLOY_SECRET"
php artisan migrate --force --no-interaction
php artisan optimize
php artisan linket:production-preflight --strict --json
# Expect overall Result PASS (or ok:true). Investigate every required FAIL.
php artisan horizon:terminate
# Supervisor/systemd restarts Horizon workers for mail + default queues.
php artisan horizon:status
php artisan schedule:list
php artisan up
```

### 4. Smoke after traffic

```bash
php artisan linket:production-preflight --strict
php artisan queue:failed
# Confirm Admin → Transactions payment health: failed jobs, scheduler heartbeat,
# Verify.et webhook failures, stale pending verifications.
```

### 5. Rollback

Keep the previous release artifact and the pre-deployment database + private-storage backup until the gate passes.

```bash
php artisan down --retry=60 --secret="$DEPLOY_SECRET"
# Point the web root / symlink at the previous release artifact
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan optimize
php artisan horizon:terminate
php artisan horizon:status
php artisan linket:production-preflight --strict
php artisan up
```

Do not automatically roll back a migration after new production writes. Prefer a forward fix. Restore the database only as a coordinated incident action with matching private-storage state, because restoring one without the other can orphan entitlements or downloadable objects.

## Production preflight command

```bash
php artisan linket:production-preflight
php artisan linket:production-preflight --strict   # production hosts
php artisan linket:production-preflight --json
php artisan deploy:health --post                   # complementary deploy.sh checks
```

Required checks include dispute migrations, Redis connectivity, queue driver, Horizon workers (when not sync), scheduler registration/heartbeat, Verify.et API key + webhook signing configuration (presence only), storage writability, and advisory counts for failed jobs, stale pending verifications, and webhook failures.

## Deployment gate

Build and test the release candidate before removing development dependencies:

```bash
composer install --prefer-dist --no-interaction
npm ci
php artisan test
composer audit
npm audit
npm run build
```

Then deploy that source revision and its generated frontend assets:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan migrate --force --no-interaction
php artisan optimize
php artisan linket:production-preflight --strict
php artisan route:list
php artisan horizon:terminate
php artisan horizon:status
php artisan schedule:list
```

Also verify writable ownership and least-privilege permissions for `storage` and `bootstrap/cache`, confirm no development `.env` or generated secret is in the release, and run `composer audit` plus the project JavaScript audit used by CI.

The release is not approved until a real browser and mobile viewport complete:

1. register and receive the default Free plan;
2. create a product and upload an allowed private file;
3. approve and copy its sell link;
4. complete Chapa checkout and callback verification;
5. confirm the immutable fee snapshot, Purchase event, entitlement, receipt, and signed download;
6. confirm the creator sees the same sale in Home, Orders, Customers, and payout data;
7. confirm another workspace cannot access the product, order, customer, payout, or download.
