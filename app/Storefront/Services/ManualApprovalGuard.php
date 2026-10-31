<?php

namespace App\Storefront\Services;

use App\Payments\VerifyEt\VerifyEtHealth;
use App\Storefront\Models\OrderManualApproval;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Validation\ValidationException;

final class ManualApprovalGuard
{
    public function assertAllowed(int $creatorId): bool
    {
        $degraded = app(VerifyEtHealth::class)->degraded();
        $volume = StorefrontOrder::query()
            ->where('creator_id', $creatorId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', now()->subHours(24))
            ->count();
        $limit = max($degraded ? 10 : 5, (int) ceil($volume * ($degraded ? 0.40 : 0.20)));
        $approvals = OrderManualApproval::query()
            ->where('creator_id', $creatorId)
            ->where('created_at', '>=', now()->subHours(24))
            ->count();

        if ($approvals >= $limit) {
            throw ValidationException::withMessages([
                'order' => __('Manual approval limit reached. Submit proof for administrator review.'),
            ]);
        }

        return $degraded;
    }
}
