<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/**
 * Durable, per-creator request quotas + global per-provider monthly budgets.
 *
 * A generation must reserve BEFORE any external provider call, then settle
 * its actual cost or release the hold only after a CONFIRMED non-billable
 * failure. An uncertain provider outcome must remain reserved for review.
 * No prompts, buyer records, tokens or provider credentials are stored.
 */
final class CreatorAiUsageService
{
    public function __construct(
        private readonly CreatorAiAccess $access,
        private readonly CreatorAiSettings $settings,
    ) {}

    /** @return array{request_id:string,status:string,reserved_microusd:int} */
    public function reserve(User $creator, int $workspaceId, string $feature, string $requestId): array
    {
        if (! Str::isUuid($requestId)) {
            throw new InvalidArgumentException('A UUID request ID is required for idempotent AI generation.');
        }

        // Pure Laravel analytics and MCP reads never enter this method.
        abort_unless(in_array($feature, ['writing_basic', 'writing_advanced', 'storefront_drafts'], true), 403);
        $this->access->authorize($creator, $workspaceId, $feature);

        $policy = $this->settings->policy();
        abort_unless(
            $policy['enabled'] && $policy['api_key_configured'] && $policy['provider'] === 'openai',
            503,
            'AI generation is not enabled by an administrator.'
        );

        $pro = $this->access->verifiedPro($creator);
        $limit = $pro ? $policy['pro_monthly_limit'] : $policy['free_monthly_limit'];
        $hold = $policy['per_request_reservation_microusd'];
        $budget = $policy['provider_monthly_budget_microusd'];
        abort_unless($hold > 0 && $budget >= $hold, 503, 'AI spending limits are not configured.');
        $month = $this->month();

        return DB::transaction(function () use (
            $creator, $workspaceId, $feature, $requestId, $limit,
            $hold, $budget, $month, $policy
        ): array {
            // This row lock serializes ALL reservations for a creator, across
            // workspaces and workers, before reading their monthly counters.
            $owner = DB::table('users')->where('id', $creator->getKey())->lockForUpdate()->first(['id']);
            abort_unless($owner, 403);

            $previous = DB::table('creator_ai_generation_attempts')
                ->where('request_id', $requestId)->first();
            if ($previous !== null) {
                abort_unless(
                    (int) $previous->creator_id === (int) $creator->getKey()
                    && (int) $previous->workspace_id === $workspaceId
                    && $previous->feature === $feature,
                    409,
                    'The AI request ID belongs to a different operation.'
                );

                return [
                    'request_id' => $requestId,
                    'status' => $previous->status,
                    'reserved_microusd' => (int) $previous->reserved_microusd,
                ];
            }

            $now = now();
            DB::table('creator_ai_usage_months')->insertOrIgnore([
                'creator_id' => $creator->getKey(),
                'month' => $month,
                'reserved_requests' => 0,
                'completed_requests' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $usage = DB::table('creator_ai_usage_months')
                ->where('creator_id', $creator->getKey())
                ->where('month', $month)
                ->lockForUpdate()->first();

            if (! $usage || (int) $usage->reserved_requests + (int) $usage->completed_requests >= $limit) {
                abort(429, 'Monthly Linket AI generation quota exhausted.');
            }

            $provider = $policy['provider'];
            DB::table('creator_ai_provider_usage_months')->insertOrIgnore([
                'provider' => $provider,
                'month' => $month,
                'reserved_microusd' => 0,
                'spent_microusd' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Global provider lock prevents two creators from reserving the
            // same remaining budget on different PHP workers.
            $providerUsage = DB::table('creator_ai_provider_usage_months')
                ->where('provider', $provider)->where('month', $month)
                ->lockForUpdate()->first();

            if (! $providerUsage ||
                (int) $providerUsage->reserved_microusd + (int) $providerUsage->spent_microusd + $hold > $budget) {
                abort(429, 'Linket AI provider monthly spending budget exhausted.');
            }

            DB::table('creator_ai_usage_months')->where('id', $usage->id)->update([
                'reserved_requests' => (int) $usage->reserved_requests + 1,
                'updated_at' => $now,
            ]);
            DB::table('creator_ai_provider_usage_months')->where('id', $providerUsage->id)->update([
                'reserved_microusd' => (int) $providerUsage->reserved_microusd + $hold,
                'updated_at' => $now,
            ]);
            DB::table('creator_ai_generation_attempts')->insert([
                'request_id' => $requestId,
                'creator_id' => $creator->getKey(),
                'workspace_id' => $workspaceId,
                'feature' => $feature,
                'provider' => $provider,
                'month' => $month,
                'status' => 'reserved',
                'reserved_microusd' => $hold,
                'charged_microusd' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'request_id' => $requestId,
                'status' => 'reserved',
                'reserved_microusd' => $hold,
            ];
        }, 3);
    }

    /** @return array{request_id:string,status:string} */
    public function complete(User $creator, string $requestId, int $actualCostMicrousd): array
    {
        if ($actualCostMicrousd < 0) {
            throw new InvalidArgumentException('Provider cost cannot be negative.');
        }

        return $this->settle($creator, $requestId, $actualCostMicrousd);
    }

    /**
     * Call ONLY after confirmed non-billable failure. Uncertain outcomes
     * must stay reserved until investigated; never auto-refund on timeout.
     *
     * @return array{request_id:string,status:string}
     */
    public function fail(User $creator, string $requestId): array
    {
        return $this->settle($creator, $requestId, null);
    }

    /** @return array{request_id:string,status:string} */
    private function settle(User $creator, string $requestId, ?int $actual): array
    {
        return DB::transaction(function () use ($creator, $requestId, $actual): array {
            $owner = DB::table('users')->where('id', $creator->getKey())->lockForUpdate()->first(['id']);
            abort_unless($owner, 404);

            $attempt = DB::table('creator_ai_generation_attempts')
                ->where('request_id', $requestId)
                ->lockForUpdate()->first();

            abort_unless($attempt && (int) $attempt->creator_id === (int) $creator->getKey(), 404);

            if ($attempt->status !== 'reserved') {
                // An idempotent retry must report the exact original charge.
                // Quietly accepting a different cost would hide discrepancies
                // from the provider ledger and make reconciliation unreliable.
                abort_unless(
                    ($attempt->status === 'completed'
                        && $actual !== null
                        && (int) $attempt->charged_microusd === $actual)
                    || ($attempt->status === 'failed' && $actual === null),
                    409,
                    'This request is already settled with a different outcome or cost.'
                );

                return ['request_id' => $requestId, 'status' => $attempt->status];
            }

            $held = (int) $attempt->reserved_microusd;
            if ($actual !== null && $actual > $held) {
                // Never silently undercount provider spending. A provider
                // overage requires manual investigation and a budget policy
                // change; keep the attempt RESERVED.
                throw new InvalidArgumentException('Actual provider cost exceeds the reserved maximum.');
            }

            $usage = DB::table('creator_ai_usage_months')
                ->where('creator_id', $creator->getKey())
                ->where('month', $attempt->month)
                ->lockForUpdate()->first();
            $providerUsage = DB::table('creator_ai_provider_usage_months')
                ->where('provider', $attempt->provider)
                ->where('month', $attempt->month)
                ->lockForUpdate()->first();

            if (! $usage || ! $providerUsage ||
                (int) $usage->reserved_requests < 1 ||
                (int) $providerUsage->reserved_microusd < $held) {
                throw new RuntimeException('Inconsistent AI usage ledger; settlement refused.');
            }

            $done = $actual !== null;
            DB::table('creator_ai_usage_months')->where('id', $usage->id)->update([
                'reserved_requests' => (int) $usage->reserved_requests - 1,
                'completed_requests' => (int) $usage->completed_requests + ($done ? 1 : 0),
                'updated_at' => now(),
            ]);
            DB::table('creator_ai_provider_usage_months')->where('id', $providerUsage->id)->update([
                'reserved_microusd' => (int) $providerUsage->reserved_microusd - $held,
                'spent_microusd' => (int) $providerUsage->spent_microusd + ($actual ?? 0),
                'updated_at' => now(),
            ]);
            DB::table('creator_ai_generation_attempts')->where('request_id', $requestId)->update([
                'status' => $done ? 'completed' : 'failed',
                'charged_microusd' => $actual ?? 0,
                'updated_at' => now(),
            ]);

            return ['request_id' => $requestId, 'status' => $done ? 'completed' : 'failed'];
        }, 3);
    }

    /** @return array{plan:string,limit:int,completed:int,reserved:int,remaining:int,month:string} */
    public function summary(User $creator): array
    {
        abort_unless($creator->exists, 403);

        $policy = $this->settings->policy();
        $pro = $this->access->verifiedPro($creator);
        $limit = $pro ? $policy['pro_monthly_limit'] : $policy['free_monthly_limit'];
        $month = $this->month();

        $usage = DB::table('creator_ai_usage_months')
            ->where('creator_id', $creator->getKey())
            ->where('month', $month)->first();

        $completed = (int) ($usage?->completed_requests ?? 0);
        $reserved = (int) ($usage?->reserved_requests ?? 0);

        return [
            'plan' => $pro ? 'pro' : 'free',
            'limit' => $limit,
            'completed' => $completed,
            'reserved' => $reserved,
            'remaining' => max(0, $limit - $completed - $reserved),
            'month' => $month,
        ];
    }

    private function month(): string
    {
        // UTC calendar month is explicit until Addis Ababa metering is tested.
        return CarbonImmutable::now('UTC')->startOfMonth()->toDateString();
    }
}
