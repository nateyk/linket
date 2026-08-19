<?php

namespace App\Storefront;

use App\Entitlements\Entitlements;
use App\Models\User;

class StorefrontBenefits
{
    public function forCreator(User $creator): array
    {
        $plan = $creator->getSubscriptionProduct();

        return $plan
            ? app(Entitlements::class)->benefitsFor($plan)
            : Entitlements::normalize(config('storefront.default_benefits', []));
    }
}
