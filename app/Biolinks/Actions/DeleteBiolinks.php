<?php

namespace App\Biolinks\Actions;

use App\Analytics\Models\TrackedEvent;
use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkAppearance;
use App\Biolinks\Resources\BiolinkResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Models\LinkeableRule;
use App\QrCodes\Models\QrCode;
use App\Webhooks\Models\Webhook;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DeleteBiolinks
{
    /**
     * @param Collection|array $ids
     */
    public function execute($ids)
    {
        $biolinks = Biolink::query()->whereIn('id', $ids)->get();

        Biolink::query()->whereIn('id', $ids)->forceDelete();

        // events
        TrackedEvent::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Biolink::MODEL_TYPE)
            ->delete();

        // detach links from biolinks
        DB::table('biolink_link')->whereIn('biolink_id', $ids)->delete();

        // delete widgets
        DB::table('biolink_widgets')->whereIn('biolink_id', $ids)->delete();

        // delete appearances
        BiolinkAppearance::query()->whereIn('biolink_id', $ids)->delete();

        // rules
        LinkeableRule::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Biolink::MODEL_TYPE)
            ->delete();

        // pixels
        DB::table('link_tracking_pixel')
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Biolink::MODEL_TYPE)
            ->delete();

        // qr codes
        QrCode::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Biolink::MODEL_TYPE)
            ->delete();

        $biolinks->each(function (Biolink $biolink) {
            DispatchWebhooksForEvent::dispatch(
                eventType: Webhook::EVENT_DELETED,
                userId: Auth::id(),
                payload: (new BiolinkResource($biolink))->toWebhookArray(),
            );
        });
    }
}
