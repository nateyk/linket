<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Subscription;
use Common\Workspaces\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;

/**
 * Shared server-side authorization boundary for native Linket AI and future
 * read-only remote MCP tools. Never authorize from user-supplied tier labels.
 */
final class CreatorAiAccess
{
    private const BASIC = [
        'sales_summary', 'sales_trends', 'product_performance', 'writing_basic',
    ];

    private const PRO = [
        'order_insights', 'mcp', 'forecast', 'writing_advanced', 'storefront_drafts',
    ];

    public function allows(User $creator, int $workspaceId, string $ability): bool
    {
        if (
            ! $creator->exists
            || $workspaceId < 1
            || ! in_array($ability, [...self::BASIC, ...self::PRO], true)
            || ! (bool) config('creator_ai.enabled', false)
            || ! (bool) config('creator_ai.features.'.$ability, false)
        ) {
            return false;
        }

        if (! Workspace::query()->forUser((int) $creator->id)->whereKey($workspaceId)->exists()) {
            return false;
        }

        return in_array($ability, self::BASIC, true)
            || $this->hasCurrentVerifiedPro($creator);
    }

    /**
     * Reuse the same current, Verify.et-backed Pro proof for generation
     * accounting. A dashboard feature flag must not change the creator's
     * actual billing tier or the shared per-creator quota.
     */
    public function verifiedPro(User $creator): bool
    {
        return $creator->exists && $this->hasCurrentVerifiedPro($creator);
    }

    public function authorize(User $creator, int $workspaceId, string $ability): void
    {
        abort_unless($this->allows($creator, $workspaceId, $ability), 403);
    }

    private function hasCurrentVerifiedPro(User $creator): bool
    {
        // Only the Linket Pro plan activated by Verify.et qualifies. Chapa
        // remains historical and must not grant a new MCP connection.
        $subscription = Subscription::query()
            ->where('user_id', $creator->id)
            ->where('gateway_name', 'verify_et')
            ->where('gateway_status', 'active')
            ->whereHas('product', static fn (Builder $query): Builder => $query
                ->where('system_key', 'pro')
                ->where('free', false)
                ->where('is_default', false))
            ->where(static fn (Builder $query): Builder => $query
                ->where('renews_at', '>', now())
                ->orWhere('ends_at', '>', now()))
            ->where(static fn (Builder $query): Builder => $query
                ->whereNull('ends_at')
                ->orWhere('ends_at', '>', now()))
            ->latest('id')
            ->first(['id', 'product_id']);

        if (! $subscription) {
            return false;
        }

        // A subscription status string by itself is not payment evidence.
        // Require a paid, unexpired Pro term linked to a successful Verify.et
        // verification. These rows are written by the existing payment flow.
        $verifiedPaymentIds = DirectPaymentVerification::query()
            ->where('payable_type', ProSubscriptionPayment::class)
            ->where('status', 'success')
            ->where('currency', 'ETB')
            ->select('payable_id');

        return ProSubscriptionPayment::query()
            ->where('creator_id', $creator->id)
            ->where('product_id', $subscription->product_id)
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->where('subscription_period_end', '>', now())
            ->whereIn('id', $verifiedPaymentIds)
            ->exists();
    }
}
