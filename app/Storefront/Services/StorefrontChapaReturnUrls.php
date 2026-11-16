<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Storefront\Models\StorefrontOrder;

final class StorefrontChapaReturnUrls
{
    public static function verificationHandler(string $merchantReference): string
    {
        return url('storefront/chapa/return/'.$merchantReference);
    }

    public static function browserSuccessUrl(StorefrontOrder $order): string
    {
        $order->loadMissing(['store', 'biolink', 'product']);

        $linkeable = $order->store ?? $order->biolink;
        $txRef = (string) $order->chapa_tx_ref;
        if ($linkeable instanceof Store || $linkeable instanceof Biolink) {
            $slug = (string) $linkeable->back_half;
            $productId = (int) $order->digital_product_id;
            $orderUuid = (string) $order->uuid;
            if ($slug !== '' && $productId > 0 && $orderUuid !== '') {
                return url("{$slug}/products/{$productId}/orders/{$orderUuid}/success")
                    .'?'.http_build_query(['tx_ref' => $txRef]);
            }
        }

        return url('/find-my-purchase/orders?highlight='.rawurlencode((string) $order->uuid));
    }
}