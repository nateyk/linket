<?php

namespace App\Storefront\Services;

use App\Payments\Chapa\LinketChapaManager;
use App\Models\User;
use App\Storefront\Models\CreatorChapaGateway;
use Common\Workspaces\Models\Workspace;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use Illuminate\Support\Collection;

final class CheckoutAvailability
{
    public function creatorBlocker(User $creator, ?int $workspaceId = null): ?string
    {
        $chapaEnabled = app(LinketChapaManager::class)->isEnabled();

        if (!$chapaEnabled && $workspaceId !== null) {
            $chapaEnabled = app(CreatorVerificationAllowance::class)->isPro($creator)
                && Workspace::query()->whereKey($workspaceId)
                    ->where('active_payment_collector', 'chapa')->exists()
                && CreatorChapaGateway::query()->where('workspace_id', $workspaceId)
                    ->where('user_id', $creator->id)->exists();
        }

        if (!$chapaEnabled) {
            return 'verification_unavailable';
        }

        return app(AccountMonetizationStatus::class)->canSell($creator)
            ? null
            : 'creator_restricted';
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
