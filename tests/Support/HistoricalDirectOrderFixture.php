<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Services\DirectStorefrontCheckout;
use App\Stores\Models\Store;

/**
 * Creates synthetic legacy order rows for historical verification regression tests.
 * No public route or production code calls this test-only helper.
 */
final class HistoricalDirectOrderFixture
{
    /** @param array{name: string, email: string} $buyer
     * @return array<string, string>
     */
    public static function create(
        DigitalProduct $product,
        Store $store,
        array $buyer,
        int $methodId,
    ): array {
        $order = app(DirectStorefrontCheckout::class)->create(
            $product->fresh('creator'), $store, $buyer, $methodId,
        );
        $endpoint = '/api/v1/public/direct-orders/'.$order->uuid;

        return [
            'order_id' => (string) $order->uuid,
            'access_token' => (string) $order->getAttribute('paymentAccessToken'),
            'instructions_endpoint' => $endpoint.'/payment-instructions',
            'status_endpoint' => $endpoint,
            'reference_endpoint' => $endpoint.'/reference',
        ];
    }
}
