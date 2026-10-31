<?php

namespace App\Payments\Controllers;

use App\Payments\Jobs\SendAdminMailTest;
use App\Payments\Models\ChapaWebhookDelivery;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\PaymentTransaction;
use App\Payments\Models\VerifyEtWebhookDelivery;
use Common\Logging\Schedule\ScheduleHealthCommand;
use Common\Logging\Schedule\ScheduleLogItem;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Laravel\Horizon\Contracts\MasterSupervisorRepository;
use Throwable;

class AdminPaymentHealthController extends Controller
{
    /**
     * @tags Admin, Payments
     * @operationId retrieveAdminPaymentHealth
     */
    public function index()
    {
        Gate::authorize('admin.access');

        return response()->json([
            'payments' => $this->paymentHealth(),
            'queue' => $this->queueHealth(),
            'scheduler' => $this->schedulerHealth(),
            'webhooks' => $this->webhookHealth(),
            'verify_et' => $this->verifyEtHealth(),
        ]);
    }

    /**
     * @tags Admin, Payments
     * @operationId sendAdminPaymentHealthTestEmail
     */
    public function sendTestEmail(Request $request)
    {
        Gate::authorize('admin.access');

        $user = $request->user();
        abort_unless(filled($user?->email), 422, __('Your administrator account needs an email address.'));

        SendAdminMailTest::dispatch($user->email, $user->name ?: $user->email);

        return response()->json([
            'message' => __('A test email was queued for :email.', ['email' => $user->email]),
        ], 202);
    }

    private function paymentHealth(): array
    {
        $payments = PaymentTransaction::query()->where('gateway', 'chapa');

        return [
            'pending_count' => (clone $payments)->where('status', 'pending')->count(),
            'failed_count' => (clone $payments)->where('status', 'failed')->count(),
            'oldest_pending_at' => (clone $payments)
                ->where('status', 'pending')
                ->oldest('created_at')
                ->value('created_at'),
        ];
    }

    private function queueHealth(): array
    {
        $failedJobs = $this->failedJobs();

        if (config('queue.default') === 'sync') {
            return [
                'status' => 'not_configured',
                'failed_jobs_count' => $failedJobs['count'],
                'latest_failed_job' => $failedJobs['latest'],
            ];
        }

        try {
            $masters = app(MasterSupervisorRepository::class)->all();
            $status = empty($masters)
                ? 'inactive'
                : (collect($masters)->every(fn($master) => $master->status === 'paused') ? 'paused' : 'running');
        } catch (Throwable) {
            $status = 'unavailable';
        }

        return [
            'status' => $status,
            'failed_jobs_count' => $failedJobs['count'],
            'latest_failed_job' => $failedJobs['latest'],
        ];
    }

    private function failedJobs(): array
    {
        if (!Schema::hasTable('failed_jobs')) {
            return ['count' => 0, 'latest' => null];
        }

        $latest = DB::table('failed_jobs')->latest('failed_at')->first(['queue', 'payload', 'failed_at']);
        if (!$latest) {
            return ['count' => 0, 'latest' => null];
        }

        $payload = json_decode($latest->payload, true);
        $jobClass = data_get($payload, 'displayName');
        $jobClass = is_string($jobClass) && preg_match('/^[A-Za-z0-9_\\\\]+$/', $jobClass)
            ? $jobClass
            : __('Unknown job');

        return [
            'count' => DB::table('failed_jobs')->count(),
            'latest' => [
                'queue' => $latest->queue,
                'job_class' => $jobClass,
                'failed_at' => $latest->failed_at,
                'summary' => __('The job exhausted its retry attempts. Open Horizon for details.'),
            ],
        ];
    }

    private function schedulerHealth(): array
    {
        $heartbeat = ScheduleLogItem::query()
            ->whereIn('command', [ScheduleHealthCommand::class, (new ScheduleHealthCommand())->getName()])
            ->latest('ran_at')
            ->first();
        $renewals = ScheduleLogItem::query()
            ->where('command', 'like', '%billing:process-chapa-renewals%')
            ->latest('ran_at')
            ->first();

        return [
            'status' => ScheduleLogItem::scheduleRanInLast30Minutes() ? 'running' : 'inactive',
            'last_heartbeat_at' => $heartbeat?->ran_at,
            'last_renewal_run_at' => $renewals?->ran_at,
            'last_renewal_exit_code' => $renewals?->exit_code,
        ];
    }

    private function webhookHealth(): array
    {
        $latest = ChapaWebhookDelivery::query()->latest('received_at')->first();

        return [
            'received_count_24h' => ChapaWebhookDelivery::query()
                ->where('received_at', '>=', now()->subDay())
                ->count(),
            'failed_count_24h' => ChapaWebhookDelivery::query()
                ->where('received_at', '>=', now()->subDay())
                ->whereIn('status', ['failed', 'rejected'])
                ->count(),
            'latest' => $latest ? [
                'tx_ref' => $latest->tx_ref,
                'signature_valid' => $latest->signature_valid,
                'status' => $latest->status,
                'failure_reason' => $latest->failure_reason,
                'received_at' => $latest->received_at,
            ] : null,
        ];
    }

    private function verifyEtHealth(): array
    {
        if (! Schema::hasTable('direct_payment_verifications')) {
            return [
                'stale_pending_count' => 0,
                'webhook_failures_24h' => 0,
                'oldest_stale_pending_at' => null,
            ];
        }

        $stale = DirectPaymentVerification::query()
            ->whereIn('status', ['pending', 'verifying'])
            ->where('created_at', '<', now()->subMinutes(30));

        return [
            'stale_pending_count' => (clone $stale)->count(),
            'oldest_stale_pending_at' => (clone $stale)->oldest('created_at')->value('created_at'),
            'webhook_failures_24h' => Schema::hasTable('verify_et_webhook_deliveries')
                ? VerifyEtWebhookDelivery::query()
                    ->where('received_at', '>=', now()->subDay())
                    ->whereIn('status', ['failed', 'rejected', 'unmatched'])
                    ->count()
                : 0,
        ];
    }
}
