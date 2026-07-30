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

        $name = strtolower((string) $plan?->name);
        $tier = str_contains($name, 'business') ? 'business' : (str_contains($name, 'pro') ? 'pro' : 'free');
        return config("storefront.default_benefits.$tier");
    }
}
