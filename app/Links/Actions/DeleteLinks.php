<?php

namespace App\Links\Actions;

use App\Links\Resources\LinkResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Models\Link;
use App\Analytics\Models\TrackedEvent;
use App\Links\Models\LinkeableRule;
use App\QrCodes\Models\QrCode;
use App\Webhooks\Models\Webhook;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DeleteLinks
{
    public function execute(array $ids)
    {
        $links = Link::query()->whereIn('id', $ids)->get();

        Link::query()->whereIn('id', $ids)->forceDelete();

        // delete events
        TrackedEvent::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Link::MODEL_TYPE)
            ->delete();

        // tags
        DB::table('taggables')
            ->whereIn('taggable_id', $ids)
            ->where('taggable_type', Link::MODEL_TYPE)
            ->delete();

        // delete rules
        LinkeableRule::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Link::MODEL_TYPE)
            ->delete();

        // pixels
        DB::table('link_tracking_pixel')
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Link::MODEL_TYPE)
            ->delete();

        // qr codes
        QrCode::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Link::MODEL_TYPE)
            ->delete();

        $links->each(function (Link $link) {
            DispatchWebhooksForEvent::dispatch(
                eventType: Webhook::EVENT_DELETED,
                userId: Auth::id(),
                payload: (new LinkResource($link))->toWebhookArray(),
            );
        });
    }
}
