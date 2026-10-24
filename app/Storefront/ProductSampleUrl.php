<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductSample;
use Illuminate\Support\Facades\URL;

final class ProductSampleUrl
{
    public static function temporary(Biolink|Store $store, DigitalProduct $product, DigitalProductSample $sample): string
    {
        return URL::temporarySignedRoute(
            'digital-products.samples.stream',
            now()->addMinutes(ProductSamplePolicy::URL_TTL_MINUTES),
            [
                'biolink' => $store->id,
                'digitalProduct' => $product->id,
                'sample' => $sample->id,
            ],
        );
    }
}
