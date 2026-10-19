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

        // The index renders cards: a cover, a category, a package count and
        // the public URL (built from the storefront). Loading galleries, FAQs
        // and packages for every listed service is work the index never uses —
        // the client shows a handful of cards.
        return CreatorService::query()
            ->where('store_id', $store->id)
            ->where('status', 'published')
            ->with(['store.domain', 'cover'])
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
