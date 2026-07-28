<?php

namespace App\QrCodes\Actions;

use App\Analytics\Models\TrackedEvent;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Models\LinkeableRule;
use App\QrCodes\Models\QrCode;
use App\QrCodes\Resources\QrCodeResource;
use App\Webhooks\Models\Webhook;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DeleteQrCodes
{
    public function execute(array $ids)
    {
        $qrCodes = QrCode::query()->whereIn('id', $ids)->get();

        QrCode::query()->whereIn('id', $ids)->forceDelete();

        // delete events
        TrackedEvent::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', QrCode::MODEL_TYPE)
            ->delete();

        // tags
        DB::table('taggables')
            ->whereIn('taggable_id', $ids)
            ->where('taggable_type', QrCode::MODEL_TYPE)
            ->delete();

        // delete rules
        LinkeableRule::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', QrCode::MODEL_TYPE)
            ->delete();

        // pixels
        DB::table('link_tracking_pixel')
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', QrCode::MODEL_TYPE)
            ->delete();

        $qrCodes->each(function (QrCode $qrCode) {
            DispatchWebhooksForEvent::dispatch(
                eventType: Webhook::EVENT_DELETED,
                userId: Auth::id(),
                payload: (new QrCodeResource($qrCode))->toWebhookArray(),
            );
        });
    }
}
