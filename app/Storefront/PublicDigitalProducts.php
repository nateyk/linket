<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Links\Actions\LinkeablePublicPolicy;
use App\Storefront\Models\DigitalProduct;

class PublicDigitalProducts
{
    public function findBiolink(string $backHalf): Biolink
    {
        $biolink = Biolink::findForRendering($backHalf);
        abort_unless($biolink, 404);

        return $this->assertBiolink($biolink);
    }

    public function assertBiolink(Biolink $biolink): Biolink
    {
        $biolink->loadMissing(['user', 'domain', 'rules', 'pixels', 'appearance']);
        app(LinkeablePublicPolicy::class)->isAccessible($biolink);

        return $biolink;
    }

    public function products(Biolink $biolink)
    {
        $this->assertBiolink($biolink);

        return $biolink->digitalProducts()
            ->where('digital_products.status', 'approved')
            ->whereHas('files')
            ->with(['cover', 'creator'])
            ->withCount('files')
            ->latest('digital_products.approved_at');
    }

    public function product(Biolink $biolink, DigitalProduct $digitalProduct): DigitalProduct
    {
        return $this->products($biolink)
            ->whereKey($digitalProduct->id)
            ->firstOrFail();
    }

    public function productForOrder(Biolink $biolink, int $digitalProductId): DigitalProduct
    {
        $this->assertBiolink($biolink);

        return DigitalProduct::query()
            ->withTrashed()
            ->whereKey($digitalProductId)
            ->with(['cover', 'creator'])
            ->withCount('files')
            ->firstOrFail();
    }
}
