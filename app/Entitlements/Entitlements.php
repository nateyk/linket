<?php

namespace App\Entitlements;

use App\Models\User;
use Common\Billing\Models\Product;

final class Entitlements
{
    public function planFor(User $creator): ?Product
    {
        return $creator->getSubscriptionProduct();
    }

    public function benefitsFor(Product $plan): array
    {
        $configured = $plan->storefront_benefits;
        if (is_string($configured)) {
            $configured = json_decode($configured, true);
        }
        if (is_array($configured) && !empty($configured)) {
            return self::normalize($configured);
        }

        $defaultPlan = Product::where('is_default', true)
            ->where('id', '!=', $plan->id)
            ->first();
        if ($defaultPlan) {
            $defaultBenefits = $defaultPlan->storefront_benefits;
            if (is_string($defaultBenefits)) {
                $defaultBenefits = json_decode($defaultBenefits, true);
            }
            if (is_array($defaultBenefits) && !empty($defaultBenefits)) {
                return self::normalize($defaultBenefits);
            }
        }

        return self::normalize(config('store.default_benefits', config('storefront.default_benefits', [])));
    }

    public function limit(User $creator, string $key): ?int
    {
        $plan = $this->planFor($creator);
        $benefits = $plan
            ? $this->benefitsFor($plan)
            : self::normalize(config('store.default_benefits', config('storefront.default_benefits', [])));

        // Alias handling: max_stores <-> max_storefronts
        if (!array_key_exists($key, $benefits) || $benefits[$key] === null) {
            $alias = $key === 'max_stores' ? 'max_storefronts' : ($key === 'max_storefronts' ? 'max_stores' : null);
            if ($alias && isset($benefits[$alias])) {
                return $benefits[$alias];
            }
        }

        return $benefits[$key] ?? null;
    }

    public function enabled(User $creator, string $key): bool
    {
        $plan = $this->planFor($creator);
        $benefits = $plan
            ? $this->benefitsFor($plan)
            : self::normalize(config('store.default_benefits', config('storefront.default_benefits', [])));

        return (bool) ($benefits[$key] ?? false);
    }

    public function feeBps(User $creator): int
    {
        $plan = $this->planFor($creator);
        $benefits = $plan
            ? $this->benefitsFor($plan)
            : self::normalize(config('store.default_benefits', config('storefront.default_benefits', [])));

        return (int) ($benefits['commission_bps'] ?? 0);
    }

    public static function formatBytes(int $bytes): string
    {
        $gb = 1073741824;
        $mb = 1048576;

        return $bytes >= $gb
            ? rtrim(rtrim(number_format($bytes / $gb, 1), '0'), '.') . ' GB'
            : rtrim(rtrim(number_format($bytes / $mb, 1), '0'), '.') . ' MB';
    }

    public static function normalize(array $raw): array
    {
        $commissionBps = $raw['commission_bps'] ?? (int) round(($raw['platform_fee_percent'] ?? 0) * 100);

        $maxStores = $raw['max_stores'] ?? $raw['max_storefronts'] ?? null;
        $maxStorefronts = $raw['max_storefronts'] ?? $raw['max_stores'] ?? null;

        return [
            'platform_fee_percent' => (float) ($raw['platform_fee_percent'] ?? round($commissionBps / 100, 4)),
            'commission_bps' => (int) $commissionBps,
            'max_products' => $raw['max_products'] ?? null,
            'max_free_products' => $raw['max_free_products'] ?? $raw['max_products'] ?? null,
            'max_paid_products' => $raw['max_paid_products'] ?? $raw['max_products'] ?? null,
            'max_upload_bytes' => $raw['max_upload_bytes'] ?? null,
            'max_storefronts' => $maxStorefronts,
            'max_stores' => $maxStores,
            'max_workspaces' => $raw['max_workspaces'] ?? null,
            'tracking_pixels_enabled' => (bool) ($raw['tracking_pixels_enabled'] ?? false),
            'advanced_analytics_enabled' => (bool) ($raw['advanced_analytics_enabled'] ?? false),
        ];
    }
}
