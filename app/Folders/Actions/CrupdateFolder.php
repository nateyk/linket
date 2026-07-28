<?php

namespace App\Folders\Actions;

use App\Folders\Models\Folder;
use App\Folders\Resources\FolderResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Linkeable\CrupdateLinkeable;
use App\Webhooks\Models\Webhook;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CrupdateFolder extends CrupdateLinkeable
{
    public function execute(
        array $specifiedData,
        Folder|null $folder = null,
    ): Folder {
        $isCreating = is_null($folder);

        $specifiedData = $this->filterOutDataBasedOnUserPermissions(
            $specifiedData,
        );

        $inlineData = [
            ...$this->getUtmInlineData($specifiedData),
            ...$this->getExpirationAndPasswordInlineData($specifiedData),
            ...Arr::only($specifiedData, [
                'name',
                'image',
                'description',
                'back_half',
                'domain_id',
                'rotator',
            ]),
        ];

        if ($isCreating) {
            $folder = Folder::query()->create([
                ...$inlineData,
                'user_id' => Auth::id(),
                'back_half' => $specifiedData['back_half'] ?? Str::random(5),
                'clicks_count' => 0,
            ]);
        } else {
            $folder->fill($inlineData)->save();
        }

        $this->saveLinkeableRules($folder, $specifiedData);
        $this->saveLinkeableTags($folder, $specifiedData);
        $this->saveLinkeableTrackingPixels($folder, $specifiedData);

        $this->saveQrCode($folder, $specifiedData);

        // dispatch webhooks
        DispatchWebhooksForEvent::dispatch(
            eventType: $isCreating
                ? Webhook::EVENT_CREATED
                : Webhook::EVENT_UPDATED,
            userId: Auth::id(),
            payload: (new FolderResource($folder))->toWebhookArray(),
        );

        return $folder;
    }
}
