<?php

namespace Common\Billing\Products;

use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Permissions\Models\Permission;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * @mixin Product
 */
#[SchemaName('Product')]
class ProductResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'uuid' => $this->uuid,
            /** @var array<string> */
            'feature_list' => $this->feature_list,
            'position' => $this->position,
            'recommended' => $this->recommended,
            'free' => $this->free,
            'is_default' => $this->is_default ?? false,
            'active' => $this->active,
            'hidden' => $this->hidden,
            'trial_period_days' => $this->trial_period_days,
            /**
             * @var array{
             *     platform_fee_percent?: int|null,
             *     commission_bps?: int|null,
             *     max_products?: int|null,
             *     max_free_products?: int|null,
             *     max_paid_products?: int|null,
             *     max_upload_bytes?: int|null,
             *     max_storefronts?: int|null,
             *     max_workspaces?: int|null,
             *     tracking_pixels_enabled?: bool|null,
             *     advanced_analytics_enabled?: bool|null,
             * }|null
             */
            'storefront_benefits' => $this->storefront_benefits,
            'pricing_features' => $this->pricingFeatures(),
            'created_at' => $this->created_at,
            'permissions' => $this->whenLoaded(
                'permissions',
                fn(Collection $permissions) => $permissions->map(
                    fn(Permission $permission) => [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        /**
                         * Additional restrictions applied to product for this permission.
                         * @example [['name' => 'count', 'value' => 10]]
                         * @var array<array{name: string, value: string}>
                         */
                        'restrictions' => $permission->restrictions,
                    ],
                ),
            ),
            'prices' => $this->whenLoaded(
                'prices',
                fn(Collection $prices) => $prices->map(
                    fn(Price $price) => [
                        'id' => $price->id,
                        'amount' => $price->amount,
                        'currency' => $price->currency,
                        'interval' => $price->interval,
                        'interval_count' => $price->interval_count,
                        'subscriptions_count' =>
                            $price->subscriptions_count ?? null,
                        'stripe_id' => $price->stripe_id ?? null,
                        'paypal_id' => $price->paypal_id ?? null,
                    ],
                ),
            ),
        ];
    }

    private function pricingFeatures(): array
    {
        $benefits = app(\App\Entitlements\Entitlements::class)
            ->benefitsFor($this->resource);
        $features = [];

        $free = $benefits['max_free_products'] ?? null;
        $paid = $benefits['max_paid_products'] ?? null;
        if ($free === null && $paid === null) {
            $features[] = 'Unlimited products';
        } else {
            $features[] = $free === null
                ? 'Unlimited free products'
                : "$free free products";
            $features[] = $paid === null
                ? 'Unlimited paid products'
                : "$paid paid products";
        }

        $bytes = $benefits['max_upload_bytes'] ?? null;
        $features[] = $bytes === null
            ? 'Unlimited storage'
            : \App\Entitlements\Entitlements::formatBytes($bytes) . ' storage';

        $storefronts = $benefits['max_storefronts'] ?? null;
        $features[] = $storefronts === null
            ? 'Unlimited storefronts'
            : "$storefronts storefronts";

        $workspaces = $benefits['max_workspaces'] ?? null;
        $features[] = $workspaces === null
            ? 'Unlimited workspaces'
            : "$workspaces workspaces";

        $fee = (float) ($benefits['platform_fee_percent'] ?? 0);
        $features[] = $fee > 0
            ? rtrim(rtrim(number_format($fee, 2), '0'), '.') . '% Linket transaction fee'
            : 'No Linket transaction fee';

        if (!empty($benefits['tracking_pixels_enabled'])) {
            $features[] = 'Tracking pixels';
        }

        return $features;
    }
}
