<?php

namespace App\Storefront\Controllers;

use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductSample;
use App\Storefront\ProductSamplePolicy;
use App\Storefront\PublicDigitalProducts;
use Common\Files\Response\FileResponseFactory;
use Illuminate\Routing\Controller;

class PublicDigitalProductSampleController extends Controller
{
    /**
     * Stream one buyer-facing preview. The signature expires, and the
     * product must still be publicly visible on this store.
     */
    public function stream(Biolink|Store $biolink, DigitalProduct $digitalProduct, DigitalProductSample $sample)
    {
        abort_unless(
            request()->hasValidSignature(),
            403,
            __('This preview link is invalid or has expired.'),
        );
        abort_unless((int) $sample->digital_product_id === (int) $digitalProduct->id, 404);

        app(PublicDigitalProducts::class)->product($biolink, $digitalProduct);

        $file = $sample->file()->first();
        abort_unless(
            $file && $file->upload_type === ProductSamplePolicy::UPLOAD_TYPE,
            404,
        );
        abort_unless(
            $file->getDisk()->exists($file->getStoragePath()),
            410,
            __('This preview is no longer available.'),
        );

        try {
            return app(FileResponseFactory::class)->create($file);
        } catch (\Illuminate\Contracts\Filesystem\FileNotFoundException) {
            abort(404);
        }
    }
}
