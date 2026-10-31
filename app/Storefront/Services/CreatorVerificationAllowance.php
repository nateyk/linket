<?php

namespace App\Storefront\Services;

use App\Models\User;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CreatorVerificationAllowance
{
    public const FREE_POLICY = 'verified_sales_free_v1';
    public const PRO_POLICY = 'verified_sales_pro_v1';

    public function isPro(User $creator): bool
    {
        $creator->unsetRelation('subscriptions');
        $creator->load('subscriptions');
        $plan = app(\App\Entitlements\Entitlements::class)->planFor($creator);
        return $plan !== null && !$plan->free && !$plan->is_default;
    }

    public function limit(): int
    {
        $plan = \Common\Billing\Models\Product::query()->where('system_key', 'free')->first()
            ?? \Common\Billing\Models\Product::query()->where('free', true)->orderByDesc('is_default')->first();
        return max(0, (int) data_get($plan?->storefront_benefits, 'free_verified_sales', config('storefront.free_verified_sales_default', 10)));
    }

    /** @return array<string, mixed> */
    public function summary(User $creator): array
    {
        $pro = $this->isPro($creator);
        $usage = $this->usage($creator, $this->limit());

        return [
            ...$usage,
            'limit' => $this->limit(),
            'is_pro' => $pro,
            'renews_at' => $pro
                ? $creator->subscriptions->first()?->renews_at?->toIso8601String()
                : null,
            'can_start_checkout' => $pro || $usage['remaining'] > 0,
        ];
    }

    /**
     * An expired or cancelled free checkout may be verified after its slot was
     * reallocated. Reclaim it only under the creator's shared reservation lock.
     * The provider evidence is retained by the gateway if capacity is unavailable.
     */
    public function acquireForVerifiedPayment(StorefrontOrder $order): bool
    {
        if ($order->monetization_policy !== self::FREE_POLICY) {
            return true;
        }

        $creator = User::query()->whereKey($order->creator_id)->lockForUpdate()->firstOrFail();
        $row = DB::table('creator_verification_allowances')
            ->where('storefront_order_id', $order->id)->lockForUpdate()->first();
        abort_unless($row && (int) $row->creator_id === (int) $creator->id, 409);

        if ($row->status === 'consumed' || $row->status === 'reserved') {
            return true;
        }
        abort_unless($row->status === 'released', 409);

        // Verified Pro activation can recover a late payment without spending
        // or reallocating a lifetime free-sale allowance.
        if ($this->isPro($creator)) {
            $order->update(['monetization_policy' => self::PRO_POLICY]);
            return true;
        }

        $occupied = DB::table('creator_verification_allowances')
            ->where('creator_id', $creator->id)
            ->whereIn('status', ['reserved', 'consumed'])
            ->count();
        if ($occupied >= $this->limit()) {
            return false;
        }

        DB::table('creator_verification_allowances')->where('id', $row->id)
            ->where('status', 'released')->update([
                'status' => 'reserved', 'released_at' => null,
                'release_reason' => null, 'updated_at' => now(),
            ]);

        return true;
    }

    public function consume(StorefrontOrder $order): void
    {
        if ($order->monetization_policy !== self::FREE_POLICY) {
            return;
        }
        // Called inside the validated fulfillment transaction; never from a browser action.
        $row = DB::table('creator_verification_allowances')->where('storefront_order_id', $order->id)->lockForUpdate()->first();
        abort_unless($row && (int) $row->creator_id === (int) $order->creator_id, 409);
        if ($row->consumed_at !== null) {
            return;
        }
        // A released reservation must never be consumed without the creator lock.
        abort_unless($row->status === 'reserved', 409);
        DB::table('creator_verification_allowances')->where('id', $row->id)->update([
            'status' => 'consumed', 'consumed_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function release(StorefrontOrder $order, string $reason): void
    {
        DB::table('creator_verification_allowances')->where('storefront_order_id', $order->id)
            ->where('status', 'reserved')->update([
                'status' => 'released', 'released_at' => now(), 'release_reason' => $reason, 'updated_at' => now(),
            ]);
    }

    public function expireAbandoned(): void
    {
        StorefrontOrder::query()->where('monetization_policy', self::FREE_POLICY)
            ->where('status', 'pending_payment')->where('payment_expires_at', '<', now())
            ->whereDoesntHave('directPaymentVerifications')->chunkById(100, function ($orders): void {
                foreach ($orders as $candidate) {
                    DB::transaction(function () use ($candidate): void {
                        $order = StorefrontOrder::query()->whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                        if ($order->status !== 'pending_payment' || $order->directPaymentVerifications()->exists()) {
                            return;
                        }
                        $order->update(['status' => 'expired']);
                        $this->release($order, 'abandoned_without_submitted_reference');
                    }, 3);
                }
            });
    }

    /** @return array{consumed: int, reserved: int, remaining: int} */
    public function usage(User $creator, ?int $limit = null): array
    {
        $limit ??= $this->limit();
        $counts = DB::table('creator_verification_allowances')->where('creator_id', $creator->id)
            ->selectRaw('status, count(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status');
        $consumed = (int) ($counts['consumed'] ?? 0);
        $reserved = (int) ($counts['reserved'] ?? 0);

        return ['consumed' => $consumed, 'reserved' => $reserved, 'remaining' => max(0, $limit - $consumed - $reserved)];
    }

    public function reserve(StorefrontOrder $order, ?int $limit = null): void
    {
        $limit ??= $this->limit();
        DB::transaction(function () use ($order, $limit): void {
            $creator = User::query()->whereKey($order->creator_id)->lockForUpdate()->firstOrFail();
            $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_unless($order->creator_id === $creator->id, 409);
            abort_unless($order->payment_gateway === 'verify_et' && $order->gross_amount_cents > 0 && $order->status === 'pending_payment', 409);
            $existing = DB::table('creator_verification_allowances')->where('storefront_order_id', $order->id)->first();
            if ($existing) {
                abort_unless($existing->status === 'reserved', 409);
                return;
            }
            $occupied = DB::table('creator_verification_allowances')->where('creator_id', $creator->id)
                ->whereIn('status', ['reserved', 'consumed'])->lockForUpdate()->get(['id'])->count();
            if ($occupied >= $limit) {
                throw ValidationException::withMessages(['payment' => __('All free verified-sale allowances are used or reserved. Upgrade to Pro to continue.')]);
            }
            DB::table('creator_verification_allowances')->insert([
                'creator_id' => $creator->id, 'storefront_order_id' => $order->id,
                'status' => 'reserved', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }, 3);
    }
}
