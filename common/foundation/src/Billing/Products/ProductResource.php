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
            'hidden' => $this->hidden,
            'trial_period_days' => $this->trial_period_days,
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
}
