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
        $order->loadMissing(['store', 'biolink']);

        $path = self::productSuccessPath($order);
        if ($path === null) {
            return self::recoveryUrl($order);
        }

        return url($path).'?'.http_build_query([
            'tx_ref' => (string) $order->chapa_tx_ref,
        ]);
    }

    private static function productSuccessPath(StorefrontOrder $order): ?string
    {
        $slug = self::storefrontSlug($order);
        if ($slug === null) {
            return null;
        }

        $productId = (int) $order->digital_product_id;
        if ($productId < 1) {
            return null;
        }

        $orderUuid = (string) $order->uuid;
        if ($orderUuid === '') {
            return null;
        }

        return "{$slug}/products/{$productId}/orders/{$orderUuid}/success";
    }

    private static function storefrontSlug(StorefrontOrder $order): ?string
    {
        $slug = self::slugFrom($order->store);
        if ($slug !== null) {
            return $slug;
        }

        return self::slugFrom($order->biolink);
    }

    private static function slugFrom(mixed $linkeable): ?string
    {
        if ($linkeable instanceof Store) {
            return self::filledSlug($linkeable->back_half);
        }

        if ($linkeable instanceof Biolink) {
            return self::filledSlug($linkeable->back_half);
        }

        return null;
    }

    private static function filledSlug(mixed $slug): ?string
    {
        $value = trim((string) $slug);
        if ($value === '') {
            return null;
        }

        return $value;
    }

    private static function recoveryUrl(StorefrontOrder $order): string
    {
        return url('/find-my-purchase/orders?highlight='.rawurlencode((string) $order->uuid));
    }
}
