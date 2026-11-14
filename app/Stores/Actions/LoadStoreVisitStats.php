<?php

namespace App\Stores\Actions;

use App\Analytics\Models\TrackedEvent;
use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;

/**
 * Load distinct visitor IP counts alongside the existing lifetime visit counter.
 *
 * This uses the IPs already recorded by tracked_events. It never exposes an IP
 * address to the API or adds a second visitor tracking mechanism.
 */
class LoadStoreVisitStats
{
    public function forPage(AbstractPaginator $pagination): void
    {
        $this->forStores($pagination->getCollection());
    }

    public function forStore(Store $store): void
    {
        $this->forStores(collect([$store]));
    }

    /** @param Collection<int, Store> $stores */
    private function forStores(Collection $stores): void
    {
        if ($stores->isEmpty()) {
            return;
        }

        $counts = TrackedEvent::query()
            ->selectRaw('linkeable_id, COUNT(DISTINCT ip) AS unique_visitors_count')
            ->whereIn('linkeable_id', $stores->pluck('id')->all())
            ->whereIn('linkeable_type', [
                Biolink::MODEL_TYPE,
                Store::MODEL_TYPE,
                Biolink::class,
                Store::class,
            ])
            ->where('event_type', 'click')
            ->where('crawler', false)
            ->whereNotNull('ip')
            ->where('ip', '!=', '')
            ->groupBy('linkeable_id')
            ->pluck('unique_visitors_count', 'linkeable_id');

        foreach ($stores as $store) {
            $store->setAttribute(
                'unique_visitors_count',
                (int) $counts->get($store->id, 0),
            );
        }
    }
}
