<?php

namespace App\Storefront;

use App\Storefront\Jobs\ConvertProductCoverToWebp;
use App\Storefront\Models\DigitalProduct;

final class ProductCoverWebp
{
    public function dispatchFor(DigitalProduct $product): void
    {
        if (!app(ProductSettings::class)->convertsCoversToWebp() || !$product->cover_file_entry_id) {
            return;
        }

        ConvertProductCoverToWebp::dispatch($product->id, $product->cover_file_entry_id);
    }
}
