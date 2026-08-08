<?php

namespace App\Storefront;

use App\Models\User;

class StorefrontBenefits
{
    public function forCreator(User $creator): array
    {
        $plan = $creator->getSubscriptionProduct();
        $configured = $plan?->storefront_benefits;
        if (is_string($configured)) {
            $configured = json_decode($configured, true);
        }
        if (is_array($configured) && isset($configured['commission_bps'])) {
            return $configured;
        }

        $tier = $plan?->free ? 'free' : 'pro';
        return config("storefront.default_benefits.$tier");
    }
}
