<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Links\Actions\LinkeablePublicPolicy;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;

class PublicDigitalProducts
{
    public function findBiolink(string $backHalf): Biolink|Store
    {
        // Try Store first (new canonical), fallback to Biolink for BC
        $biolink = Store::findForRendering($backHalf);
        if (!$biolink) {
            $biolink = Biolink::findForRendering($backHalf);
        }
        abort_unless($biolink, 404);

        return $this->assertBiolink($biolink);
    }

    public function assertBiolink(Biolink|Store $biolink): Biolink|Store
    {
        $biolink->loadMissing(['user', 'domain', 'rules', 'pixels', 'appearance']);
        app(LinkeablePublicPolicy::class)->isAccessible($biolink);

        return $biolink;
    }

    public function products(Biolink|Store $biolink)
    {
        $this->assertBiolink($biolink);

        return $biolink->digitalProducts()
            ->where('digital_products.status', 'approved')
            ->where(function ($q) {
                $q->where(function ($qq) { $qq->where('digital_products.type', '!=', 'course')->whereHas('files'); })
                  ->orWhere(function ($qq) { $qq->where('digital_products.type', 'course')->whereHas('course', fn($c) => $c->whereNotNull('published_at')); });
            })
            ->with(['cover', 'creator', 'course'])
            ->withCount('files')
            ->latest('digital_products.approved_at');
    }

    public function product(Biolink|Store $biolink, DigitalProduct $digitalProduct): DigitalProduct
    {
        return $this->products($biolink)
            ->whereKey($digitalProduct->id)
            ->firstOrFail();
    }

    public function productForOrder(Biolink|Store $biolink, int $digitalProductId): DigitalProduct
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
