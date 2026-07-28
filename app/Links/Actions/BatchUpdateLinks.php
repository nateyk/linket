<?php

namespace App\Links\Actions;

use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Models\Link;
use App\Links\Resources\LinkResource;
use App\Webhooks\Models\Webhook;
use App\Tags\Models\Tag;
use Illuminate\Support\Facades\Auth;

class BatchUpdateLinks
{
    public function execute(array $linkIds, array $data): void
    {
        $tagIds = isset($data['tags'])
            ? collect($data['tags'])->map(
                fn($tag) => is_scalar($tag) ? $tag : $tag['id'],
            )
            : null;

        Link::withTrashed()
            ->whereIn('id', $linkIds)
            ->get()
            ->each(function (Link $link) use ($data, $tagIds) {
                $eventType = Webhook::EVENT_UPDATED;

                if (isset($data['folder_id'])) {
                    $link->fill(['folder_id' => $data['folder_id']])->save();
                }

                if ($tagIds) {
                    $link->tags()->sync($tagIds);
                }

                if (!empty($data['archive']) && !$link->trashed()) {
                    $link->delete();
                    $eventType = Webhook::EVENT_DELETED;
                } elseif (!empty($data['unarchive']) && $link->trashed()) {
                    $link->restore();
                }

                DispatchWebhooksForEvent::dispatch(
                    eventType: $eventType,
                    userId: Auth::id(),
                    payload: (new LinkResource($link))->toWebhookArray(),
                );
            });
    }
}
