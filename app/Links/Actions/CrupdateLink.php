<?php

namespace App\Links\Actions;

use App\Links\Resources\LinkResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Linkeable\CrupdateLinkeable;
use App\Links\Models\Link;
use App\Webhooks\Models\Webhook;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CrupdateLink extends CrupdateLinkeable
{
    public function __construct(protected bool $fetchMetadata = true) {}

    public function execute(array $specifiedData, Link|null $link = null): Link
    {
        $isCreating = is_null($link);

        $specifiedData = $this->filterOutDataBasedOnUserPermissions(
            $specifiedData,
            extraFieldsToRemove: !settings('links.enable_type') ? ['type'] : [],
        );

        $inlineData = [
            ...$this->getUtmInlineData($specifiedData),
            ...$this->getExpirationAndPasswordInlineData($specifiedData),
            ...$this->getLongUrlInlineData($specifiedData),
            ...Arr::only($specifiedData, [
                'back_half',
                'name',
                'description',
                'image',
                'type',
                'type_id',
                'domain_id',
                'folder_id',
                'workspace_id',
                'user_id',
            ]),
        ];

        if ($isCreating) {
            $inlineData = [
                ...$inlineData,
                'user_id' => Arr::get($specifiedData, 'user_id') ?? Auth::id(),
                'back_half' => $inlineData['back_half'] ?? Str::random(5),
                'type' => $inlineData['type'] ?? 'direct',
            ];

            // only fetch metadata when creating a new link and no metadata was specified
            if (
                $this->fetchMetadata &&
                (!Arr::get($specifiedData, 'name') &&
                    !Arr::get($specifiedData, 'description') &&
                    !Arr::get($specifiedData, 'image'))
            ) {
                $inlineData = [
                    ...$inlineData,
                    ...(new GetMetadataFromUrl())->execute(
                        $specifiedData['long_url'],
                    ),
                ];
            }

            $link = Link::query()->create($inlineData);
        } else {
            $link->fill($inlineData)->save();
        }

        $this->saveLinkeableRules($link, $specifiedData);
        $this->saveLinkeableTags($link, $specifiedData);
        $this->saveLinkeableTrackingPixels($link, $specifiedData);

        $this->saveQrCode($link, $specifiedData);

        // dispatch webhooks
        DispatchWebhooksForEvent::dispatch(
            eventType: $isCreating
                ? Webhook::EVENT_CREATED
                : Webhook::EVENT_UPDATED,
            userId: $link->user_id,
            payload: (new LinkResource($link))->toWebhookArray(),
        );

        return $link;
    }
}
