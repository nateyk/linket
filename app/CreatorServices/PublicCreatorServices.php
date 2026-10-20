<?php

namespace App\CreatorServices;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\Links\Actions\LinkeablePublicPolicy;
use App\Stores\Models\Store;

class PublicCreatorServices
{
    public function findStore(string $backHalf): Biolink|Store
    {
        $store = Store::findForRendering($backHalf);
        if (!$store) {
            $store = Biolink::findForRendering($backHalf);
        }
        abort_unless($store, 404);

        return $this->assertStore($store);
    }

    public function assertStore(Biolink|Store $store): Biolink|Store
    {
        $store->loadMissing(['user', 'domain', 'rules', 'pixels', 'appearance']);
        app(LinkeablePublicPolicy::class)->isAccessible($store);

        return $store;
    }

    public function services(Biolink|Store $store)
    {
        $this->assertStore($store);

        // The index renders cards: a cover, a category, a package count, the
        // lowest package price and the public URL (built from the storefront).
        // Only the columns a card needs are loaded — descriptions and features
        // belong to the detail page.
        return CreatorService::query()
            ->where('store_id', $store->id)
            ->where('status', 'published')
            ->with([
                'store.domain',
                'cover',
                'packages' => fn ($query) => $query->select(['id', 'creator_service_id', 'price_cents']),
            ])
            ->withCount('packages')
            ->latest('id')
            ->get();
    }

    public function service(Biolink|Store $store, string $slug): CreatorService
    {
        $this->assertStore($store);

        // The detail page renders everything, so it loads everything.
        $service = CreatorService::query()
            ->where('store_id', $store->id)
            ->where('status', 'published')
            ->where('slug', $slug)
            ->with(['store.domain', 'cover', 'images.file', 'packages', 'faqs'])
            ->latest('id')
            ->first();

        abort_unless($service, 404);

        return $service;
    }
}
