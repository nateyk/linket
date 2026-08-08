<?php

namespace App\Biolinks\Actions;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Resources\BiolinkResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Linkeable\CrupdateLinkeable;
use App\Models\User;
use App\Webhooks\Models\Webhook;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CrupdateBiolink extends CrupdateLinkeable
{
    public function execute(
        array $specifiedData,
        Biolink|null $biolink = null,
    ): Biolink {
        $isCreating = is_null($biolink);

        $specifiedData = $this->filterOutDataBasedOnUserPermissions(
            $specifiedData,
        );

        $inlineData = [
            ...$this->getUtmInlineData($specifiedData),
            ...$this->getExpirationAndPasswordInlineData($specifiedData),
            ...Arr::only($specifiedData, [
                'name',
                'back_half',
                'domain_id',
                'user_id',
                'workspace_id',
            ]),
        ];

        if ($isCreating) {
            $creator = isset($inlineData['user_id'])
                ? User::query()->find($inlineData['user_id'])
                : Auth::user();
            $biolink = Biolink::query()->create([
                ...$inlineData,
                'user_id' => $inlineData['user_id'] ?? Auth::id(),
                'back_half' => $inlineData['back_half'] ?? Str::random(5),
                'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
                'profile_config' => [
                    'display_name' => $creator?->name ?? $inlineData['name'],
                    'profile_title' => '',
                    'bio' => '',
                    'about_html' => '',
                    'avatar_url' => $creator?->image,
                    'cover_url' => null,
                    'available_for_work' => false,
                    'skills' => [],
                    'follow_url' => null,
                    'contact_url' => null,
                    'social_links' => [],
                ],
            ]);
        } else {
            $biolink->fill($inlineData)->save();
        }

        $this->saveLinkeableRules($biolink, $specifiedData);
        $this->saveLinkeableTags($biolink, $specifiedData);
        $this->saveLinkeableTrackingPixels($biolink, $specifiedData);

        $this->saveQrCode($biolink, $specifiedData);

        // dispatch webhooks
        DispatchWebhooksForEvent::dispatch(
            eventType: $isCreating
                ? Webhook::EVENT_CREATED
                : Webhook::EVENT_UPDATED,
            userId: $biolink->user_id,
            payload: (new BiolinkResource($biolink))->toWebhookArray(),
        );

        return $biolink;
    }
}
