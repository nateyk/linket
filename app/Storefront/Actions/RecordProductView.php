<?php

namespace App\Storefront\Actions;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\VisitorAttributes;
use Jenssegers\Agent\Agent;

class RecordProductView
{
    /**
     * Record a view of the given product, deduplicated per IP within 24h.
     *
     * @return bool true when a new row was inserted (and the counter bumped)
     */
    public function execute(DigitalProduct $product): bool
    {
        if (!$product->isApproved()) {
            return false;
        }
        if (app(Agent::class)->isRobot(request()->userAgent() ?? null)) {
            return false;
        }

        $ipHash = VisitorAttributes::ipHash();
        if (!$ipHash) {
            return false;
        }

        $latest = $product->views()
            ->where('ip_hash', $ipHash)
            ->latest('created_at')
            ->first();
        if ($latest && $latest->created_at->diffInHours(now()) < 24) {
            return false;
        }

        $product->views()->create([
            'ip_hash' => $ipHash,
            'country' => VisitorAttributes::country(),
            'referrer' => VisitorAttributes::normalizedReferrer(),
        ]);
        $product->increment('views_count');

        return true;
    }
}