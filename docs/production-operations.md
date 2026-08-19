# Linket production operations

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

Install `deploy/supervisor/linket-horizon.conf.example` as a Supervisor program after replacing the application path and Unix user. Reload Supervisor, then verify `php artisan horizon:status` reports an active process. Horizon handles both the `mail` and `default` queues; receipt emails and Chapa renewal reminders use `mail`.

During deployment, run migrations and rebuild application caches, then run `php artisan horizon:terminate`. Supervisor starts Horizon again with the new code.

## Scheduler

Install one cron entry for the web server user:

```cron
* * * * * cd /var/www/linket && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

The scheduler records a health heartbeat every minute. Chapa renewal reminders, grace-period transitions, and subscription expiry run hourly with overlap and single-server protection.

## Outgoing mail

In **Admin → Settings → Email → Outgoing**, configure SMTP credentials and a sender address your provider has authorized. Then open **Admin → Transactions** and use **Send test email**. Confirm it is marked sent in **Admin → Logs → Outgoing email**.

## Payment checks

Use **Admin → Transactions** to check pending or failed Chapa attempts, Horizon state, failed jobs, scheduler heartbeat, and recent signed webhook outcomes. The Chapa signing secret remains configured only in **Admin → Settings → Subscriptions** or `CHAPA_WEBHOOK_SECRET`; never place it in source control or logs.
