<?php

namespace App\Storefront;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductReviewEvent;

final class ProductReviewHistory
{
    public function record(
        DigitalProduct $product,
        string $event,
        ?string $from,
        ?string $to,
        ?User $actor,
        string $actorRole,
        ?string $reason = null,
        array $meta = [],
    ): DigitalProductReviewEvent {
        return $product->reviewEvents()->create([
            'actor_id' => $actor?->id,
            'actor_role' => $actor === null ? 'system' : $actorRole,
            'event' => $event,
            'from_status' => $from,
            'to_status' => $to,
            'reason' => $reason,
            'meta' => $meta === [] ? null : $meta,
        ]);
    }
}
