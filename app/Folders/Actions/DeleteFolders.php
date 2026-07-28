<?php

namespace App\Folders\Actions;

use App\Analytics\Models\TrackedEvent;
use App\Folders\Models\Folder;
use App\Folders\Resources\FolderResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Models\Link;
use App\Links\Models\LinkeableRule;
use App\QrCodes\Models\QrCode;
use App\Webhooks\Models\Webhook;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DeleteFolders
{
    /**
     * @param Collection|array $ids
     */
    public function execute($ids)
    {
        $folders = Folder::query()->whereIn('id', $ids)->get();

        Folder::query()->whereIn('id', $ids)->forceDelete();

        Link::query()->whereIn('folder_id', $ids)->update(['folder_id' => null]);

        // events
        TrackedEvent::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Folder::MODEL_TYPE)
            ->delete();

        // rules
        LinkeableRule::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Folder::MODEL_TYPE)
            ->delete();

        // pixels
        DB::table('link_tracking_pixel')
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Folder::MODEL_TYPE)
            ->delete();

        // qr codes
        QrCode::query()
            ->whereIn('linkeable_id', $ids)
            ->where('linkeable_type', Folder::MODEL_TYPE)
            ->delete();

        $folders->each(function (Folder $folder) {
            DispatchWebhooksForEvent::dispatch(
                eventType: Webhook::EVENT_DELETED,
                userId: Auth::id(),
                payload: (new FolderResource($folder))->toWebhookArray(),
            );
        });
    }
}
