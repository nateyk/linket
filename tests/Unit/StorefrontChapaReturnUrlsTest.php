<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Biolinks\Models\Biolink;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\StorefrontChapaReturnUrls;
use Tests\TestCase;

class StorefrontChapaReturnUrlsTest extends TestCase
{
    public function testBrowserSuccessUrlUsesPublicProductPageWhenStorefrontIsKnown(): void
    {
        $biolink = new Biolink(['back_half' => 'createshop']);
        $order = new StorefrontOrder([
            'uuid' => 'order-uuid-123',
            'digital_product_id' => 55,
            'chapa_tx_ref' => 'lkabcdefghijklmnop',
        ]);
        $order->setRelation('biolink', $biolink);

        $url = StorefrontChapaReturnUrls::browserSuccessUrl($order);

        $this->assertStringContainsString('/createshop/products/55/orders/order-uuid-123/success', $url);
        $this->assertStringContainsString('tx_ref=lkabcdefghijklmnop', $url);
    }

    public function testBrowserSuccessUrlFallsBackToOrderRecoveryWithoutStorefront(): void
    {
        $order = new StorefrontOrder([
            'uuid' => 'order-uuid-456',
            'chapa_tx_ref' => 'lkqrstuvwxyzabcdef',
        ]);

        $url = StorefrontChapaReturnUrls::browserSuccessUrl($order);

        $this->assertStringContainsString('/find-my-purchase/orders?highlight=order-uuid-456', $url);
    }
}