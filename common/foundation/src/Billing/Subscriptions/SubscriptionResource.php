<?php

namespace Common\Billing\Subscriptions;

use Common\Billing\Subscription;
use Common\Users\Resources\UserResource;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * @mixin Subscription
 */
#[SchemaName('Subscription')]
class SubscriptionResource extends JsonResource
{
    /**
     * @var Subscription
     */
    public $resource;

    public function toArray($request): array
    {
        return [
            'id' => $this->resource->id,
            'price_id' => $this->resource->price_id,
            'product_id' => $this->resource->product_id,
            'user_id' => $this->resource->user_id,
            'on_grace_period' => $this->resource->on_grace_period,
            'gateway_name' => $this->resource->gateway_name,
            'gateway_id' => $this->resource->gateway_id,
            'gateway_status' => $this->resource->gateway_status,
            'valid' => $this->resource->valid,
            'past_due' => $this->resource->past_due,
            'active' => $this->resource->active,
            'cancelled' => $this->resource->cancelled,
            'on_trial' => $this->resource->on_trial,
            'trial_ends_at' => $this->resource->trial_ends_at,
            'ends_at' => $this->resource->ends_at,
            'renews_at' => $this->resource->renews_at,
            'description' => $this->resource->description,
            'created_at' => $this->resource->created_at,
            'user' => $this->whenLoaded(
                'user',
                fn() => new UserResource($this->resource->user),
            ),
            'price' => $this->whenLoaded(
                'price',
                fn() => [
                    'id' => $this->resource->price->id,
                    'amount' => $this->resource->price->amount,
                    'currency' => $this->resource->price->currency,
                    'interval' => $this->resource->price->interval,
                    'interval_count' => $this->resource->price->interval_count,
                    'trial_days' => $this->resource->price->trial_days,
                    'name' => $this->resource->price->name,
                ],
            ),
            'product' => $this->whenLoaded(
                'product',
                fn() => [
                    'id' => $this->resource->product->id,
                    'name' => $this->resource->product->name,
                    'description' => $this->resource->product->description,
                    'position' => $this->resource->product->position,
                    'recommended' => $this->resource->product->recommended,
                    'prices' => $this->resource->product->prices,
                ],
            ),
            'invoices' => $this->whenLoaded(
                'invoices',
                fn(Collection $invoices) => $invoices->map(
                    fn($invoice) => [
                        'id' => $invoice->id,
                        'uuid' => $invoice->uuid,
                        'subscription_id' => $invoice->subscription_id,
                        'status' => $invoice->status,
                        'notes' => $invoice->notes,
                        /** @var integer */
                        'amount_paid' => $invoice->amount_paid,
                        'currency' => $invoice->currency,
                        'created_at' => $invoice->created_at,
                        'updated_at' => $invoice->updated_at,
                    ],
                ),
            ),
        ];
    }
}
