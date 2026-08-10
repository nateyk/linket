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
        if (is_array($configured) && isset($configured['platform_fee_percent'])) {
            return $this->normalize($configured);
        }
        if (is_array($configured) && isset($configured['commission_bps'])) {
            $configured['platform_fee_percent'] = round(((int) $configured['commission_bps']) / 100, 4);
            return $this->normalize($configured);
        }

        $tier = $plan?->free ? 'free' : 'pro';
        return $this->normalize(config("storefront.default_benefits.$tier"));
    }

    private function normalize(array $raw): array
    {
        $commissionBps = $raw['commission_bps'] ?? (int) round(($raw['platform_fee_percent'] ?? 0) * 100);
        return [
            'platform_fee_percent' => (float) ($raw['platform_fee_percent'] ?? round($commissionBps / 100, 4)),
            'commission_bps' => (int) $commissionBps,
            'max_products' => $raw['max_products'] ?? null,
            'max_free_products' => $raw['max_free_products'] ?? $raw['max_products'] ?? null,
            'max_paid_products' => $raw['max_paid_products'] ?? $raw['max_products'] ?? null,
            'max_upload_bytes' => $raw['max_upload_bytes'] ?? null,
            'max_storefronts' => $raw['max_storefronts'] ?? null,
            'max_workspaces' => $raw['max_workspaces'] ?? null,
            'tracking_pixels_enabled' => (bool) ($raw['tracking_pixels_enabled'] ?? false),
            'advanced_analytics_enabled' => (bool) ($raw['advanced_analytics_enabled'] ?? false),
        ];
    }
}