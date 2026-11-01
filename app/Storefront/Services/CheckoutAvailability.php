<?php

namespace App\Storefront\Services;

use App\Payments\VerifyEt\VerifyEtSettings;
use App\Models\User;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use Illuminate\Support\Collection;

final class CheckoutAvailability
{
    public function creatorBlocker(User $creator): ?string
    {
        if (! VerifyEtSettings::get('enabled')) {
            return 'verification_unavailable';
        }
        if (! app(AccountMonetizationStatus::class)->canSell($creator)) {
            return 'creator_restricted';
        }
        if (! app(CreatorVerificationAllowance::class)->summary($creator)['can_start_checkout']) {
            return 'verification_quota_exhausted';
        }

        return null;
    }

    public function accountIsReady(CreatorPaymentMethod $method, ?DirectPaymentMethod $catalog): bool
    {
        return $method->isAvailable() && ($catalog?->isAvailableForCheckout() ?? false);
    }

    /** @return Collection<int, CreatorPaymentMethod> */
    public function eligibleAccounts(int $userId, int $workspaceId): Collection
    {
        $catalog = DirectPaymentMethod::query()->get()->keyBy('code');

        return CreatorPaymentMethod::query()->where('user_id', $userId)->where('workspace_id', $workspaceId)
            ->latest('id')->get()
            ->filter(fn (CreatorPaymentMethod $method): bool => $this->accountIsReady($method, $catalog->get($method->provider)))
            ->values();
    }
}
