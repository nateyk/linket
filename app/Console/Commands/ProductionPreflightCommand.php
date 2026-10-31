<?php

namespace App\Console\Commands;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\VerifyEtWebhookDelivery;
use Common\Logging\Schedule\ScheduleHealthCommand;
use Common\Logging\Schedule\ScheduleLogItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Laravel\Horizon\Contracts\MasterSupervisorRepository;
use Throwable;

class ProductionPreflightCommand extends Command
{
    protected $signature = 'linket:production-preflight
                            {--json : Output machine-readable JSON}
                            {--strict : Fail when optional local-only allowances are missing (use on production hosts)}';

    protected $description = 'Read-only production readiness preflight. Reports PASS/FAIL per requirement without printing secrets.';

    public function handle(): int
    {
        $checks = [];
        $failed = false;
        $strict = (bool) $this->option('strict') || app()->isProduction();

        $add = function (string $name, bool $ok, string $detail = '', bool $required = true) use (&$checks, &$failed): void {
            $checks[] = [
                'check' => $name,
                'status' => $ok ? 'PASS' : 'FAIL',
                'ok' => $ok,
                'required' => $required,
                'detail' => $detail,
            ];
            if (! $ok && $required) {
                $failed = true;
            }
        };

        $this->checkAppEnv($add, $strict);
        $this->checkDatabase($add);
        $this->checkRequiredMigrations($add);
        $this->checkRedisAndQueue($add, $strict);
        $this->checkHorizon($add, $strict);
        $this->checkScheduler($add, $strict);
        $this->checkVerifyEt($add, $strict);
        $this->checkStorage($add);
        $this->checkOperationalDiagnostics($add);

        if ($this->option('json')) {
            $this->line(json_encode([
                'ok' => ! $failed,
                'environment' => app()->environment(),
                'checks' => $checks,
            ], JSON_PRETTY_PRINT));
        } else {
            $this->info('Linket production preflight');
            foreach ($checks as $check) {
                $mark = $check['ok'] ? 'PASS' : 'FAIL';
                $req = $check['required'] ? 'required' : 'advisory';
                $this->line(sprintf(' [%s] %-36s (%s) %s', $mark, $check['check'], $req, $check['detail']));
            }
            $this->newLine();
            $this->line($failed ? 'Result: FAIL' : 'Result: PASS');
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkAppEnv(callable $add, bool $strict): void
    {
        $appKey = config('app.key');
        $add(
            'app_key_present',
            filled($appKey),
            filled($appKey) ? 'configured' : 'missing',
        );

        $add(
            'app_url_present',
            filled(config('app.url')),
            (string) config('app.url'),
        );

        if ($strict) {
            $add(
                'app_env_production',
                app()->environment('production'),
                'env='.app()->environment(),
            );
            $add(
                'app_debug_disabled',
                config('app.debug') === false,
                config('app.debug') ? 'APP_DEBUG must be false' : 'false',
            );
            $add(
                'app_url_https',
                str_starts_with((string) config('app.url'), 'https://'),
                (string) config('app.url'),
            );
            $add(
                'verify_et_mock_disabled',
                ! (bool) config('services.verify_et.mock'),
                config('services.verify_et.mock') ? 'VERIFY_ET_MOCK is enabled' : 'disabled',
            );
        } else {
            $add(
                'local_non_production_ok',
                ! app()->isProduction(),
                'env='.app()->environment().' (strict production rules skipped)',
                false,
            );
        }
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkDatabase(callable $add): void
    {
        try {
            DB::connection()->getPdo();
            DB::select('SELECT 1');
            $add('db_connect', true, DB::connection()->getDatabaseName() ?: 'connected');
        } catch (Throwable $e) {
            $add('db_connect', false, $this->sanitize($e->getMessage()));
        }
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkRequiredMigrations(callable $add): void
    {
        $required = [
            '2026_10_30_130933_create_storefront_payment_disputes_table',
            '2026_10_30_132249_add_lifecycle_and_events_to_storefront_payment_disputes',
        ];

        try {
            $ran = DB::table(config('database.migrations.table', 'migrations'))->pluck('migration')->all();
            $missing = array_values(array_diff($required, $ran));
            $add(
                'dispute_migrations_applied',
                $missing === [],
                $missing === [] ? 'dispute tables present' : 'missing: '.implode(', ', $missing),
            );

            $add(
                'dispute_schema',
                Schema::hasTable('storefront_payment_disputes')
                    && Schema::hasColumn('storefront_payment_disputes', 'lifecycle_status')
                    && Schema::hasTable('storefront_payment_dispute_events'),
                Schema::hasTable('storefront_payment_disputes') ? 'lifecycle + events ready' : 'tables missing',
            );

            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles(database_path('migrations'));
            if (is_dir(base_path('common/foundation/database/migrations'))) {
                $files = array_merge($files, $migrator->getMigrationFiles(base_path('common/foundation/database/migrations')));
            }
            $pending = count(array_diff(array_keys($files), $ran));
            $add('no_pending_migrations', $pending === 0, $pending === 0 ? 'none' : "{$pending} pending");
        } catch (Throwable $e) {
            $add('dispute_migrations_applied', false, $this->sanitize($e->getMessage()));
        }
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkRedisAndQueue(callable $add, bool $strict): void
    {
        $queue = (string) config('queue.default');
        $add(
            'queue_driver',
            $strict ? $queue === 'redis' : in_array($queue, ['redis', 'sync', 'database'], true),
            "QUEUE_CONNECTION={$queue}",
            $strict,
        );

        try {
            $pong = Redis::connection()->ping();
            $ok = $pong === true || $pong === 1 || str_contains(strtoupper((string) $pong), 'PONG');
            $add('redis_connect', $ok, $ok ? 'reachable' : 'unexpected ping response');
        } catch (Throwable $e) {
            $add('redis_connect', false, $this->sanitize($e->getMessage()), $strict || $queue === 'redis');
        }
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkHorizon(callable $add, bool $strict): void
    {
        if (config('queue.default') === 'sync') {
            $add('horizon_workers', ! $strict, 'queue is sync; Horizon not required', ! $strict);

            return;
        }

        try {
            $masters = app(MasterSupervisorRepository::class)->all();
            $status = empty($masters)
                ? 'inactive'
                : (collect($masters)->every(fn ($master) => $master->status === 'paused') ? 'paused' : 'running');
            $add(
                'horizon_workers',
                $status === 'running',
                $status,
                $strict,
            );
        } catch (Throwable $e) {
            $add('horizon_workers', false, $this->sanitize($e->getMessage()), $strict);
        }
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkScheduler(callable $add, bool $strict): void
    {
        try {
            $events = collect(app(\Illuminate\Console\Scheduling\Schedule::class)->events())
                ->map(fn ($event) => (string) ($event->command ?? $event->description ?? ''))
                ->implode("\n");

            $add(
                'scheduler_reconcile_registered',
                str_contains($events, 'billing:reconcile-pending-verifications'),
                'billing:reconcile-pending-verifications',
            );

            $heartbeatOk = ScheduleLogItem::scheduleRanInLast30Minutes();
            $add(
                'scheduler_heartbeat',
                $heartbeatOk,
                $heartbeatOk ? 'schedule health recent' : 'no recent schedule:be-health',
                $strict,
            );

            $heartbeat = ScheduleLogItem::query()
                ->whereIn('command', [ScheduleHealthCommand::class, (new ScheduleHealthCommand())->getName()])
                ->latest('ran_at')
                ->value('ran_at');
            $add(
                'scheduler_last_heartbeat',
                true,
                $heartbeat ? (string) $heartbeat : 'never',
                false,
            );
        } catch (Throwable $e) {
            $add('scheduler_reconcile_registered', false, $this->sanitize($e->getMessage()));
        }
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkVerifyEt(callable $add, bool $strict): void
    {
        $enabled = (bool) config('services.verify_et.enabled');
        $add('verify_et_enabled_flag', true, $enabled ? 'enabled' : 'disabled', false);

        $apiKeyPresent = filled(config('services.verify_et.api_key'));
        $webhookPresent = filled(config('services.verify_et.webhook_secret'));

        $add(
            'verify_et_api_key_configured',
            ! $enabled || $apiKeyPresent,
            $apiKeyPresent ? 'present' : 'missing',
            $strict && $enabled,
        );
        $add(
            'verify_et_webhook_signing_configured',
            ! $enabled || $webhookPresent,
            $webhookPresent ? 'present' : 'missing',
            $strict && $enabled,
        );

        // Never print secret values — only length buckets.
        if ($webhookPresent) {
            $len = strlen((string) config('services.verify_et.webhook_secret'));
            $add(
                'verify_et_webhook_secret_shape',
                $len >= 16,
                "length_bucket=".($len >= 64 ? '64+' : ($len >= 32 ? '32-63' : '16-31')),
                false,
            );
        }
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkStorage(callable $add): void
    {
        $storageProbe = storage_path('app/.production-preflight-probe');
        try {
            File::ensureDirectoryExists(dirname($storageProbe));
            File::put($storageProbe, (string) time());
            $ok = File::exists($storageProbe);
            File::delete($storageProbe);
            $add('storage_writable', $ok, storage_path('app'));
        } catch (Throwable $e) {
            $add('storage_writable', false, $this->sanitize($e->getMessage()));
        }

        $add(
            'private_product_storage_not_public',
            ! is_dir(public_path('digital-products')),
            public_path('digital-products'),
        );

        $manifest = public_path('build/manifest.json');
        $add(
            'vite_manifest',
            File::exists($manifest) && File::size($manifest) > 100,
            File::exists($manifest) ? 'present' : 'missing',
            false,
        );
    }

    /**
     * @param  callable(string, bool, string=, bool=): void  $add
     */
    private function checkOperationalDiagnostics(callable $add): void
    {
        $failedJobs = Schema::hasTable('failed_jobs')
            ? (int) DB::table('failed_jobs')->count()
            : 0;
        $add(
            'failed_jobs_count',
            true,
            (string) $failedJobs,
            false,
        );

        $stalePending = 0;
        if (Schema::hasTable('direct_payment_verifications')) {
            $stalePending = DirectPaymentVerification::query()
                ->whereIn('status', ['pending', 'verifying'])
                ->where('created_at', '<', now()->subMinutes(30))
                ->count();
        }
        $add(
            'stale_pending_verifications',
            true,
            (string) $stalePending,
            false,
        );

        $webhookFailures = 0;
        if (Schema::hasTable('verify_et_webhook_deliveries')) {
            $webhookFailures = VerifyEtWebhookDelivery::query()
                ->where('received_at', '>=', now()->subDay())
                ->whereIn('status', ['failed', 'rejected', 'unmatched'])
                ->count();
        }
        $add(
            'verify_et_webhook_failures_24h',
            true,
            (string) $webhookFailures,
            false,
        );
    }

    private function sanitize(string $msg): string
    {
        $msg = preg_replace('/password[^;]*=[^; ]+/i', 'password=***', $msg) ?? $msg;
        $msg = preg_replace('/APP_KEY[^ ]*/i', 'APP_KEY=***', $msg) ?? $msg;
        $msg = preg_replace('/VERIFY_ET_[A-Z_]+=\S+/i', 'VERIFY_ET_*=***', $msg) ?? $msg;
        $msg = preg_replace('/whsec_[A-Za-z0-9]+/', 'whsec_***', $msg) ?? $msg;

        return mb_strimwidth($msg, 0, 220, '…');
    }
}
