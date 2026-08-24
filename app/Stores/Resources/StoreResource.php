<?php

namespace App\Stores\Resources;

use App\Stores\Models\Store;
use App\Biolinks\Resources\BiolinkAppearanceResource;
use App\Biolinks\Resources\BiolinkLinkResource;
use App\Biolinks\Resources\BiolinkWidgetResource;
use App\Links\Linkeable\LinkeableResource;
use Dedoc\Scramble\Attributes\SchemaName;

/**
 * @mixin Store
 */
#[SchemaName('Store')]
class StoreResource extends LinkeableResource
{
    public function __construct(
        mixed $resource,
        protected string|null $fieldsPreset = null,
    ) {
        parent::__construct($resource);
    }

    public function toArray($request): array
    {
        $fieldsPreset =
            request()->input('fields_preset') ?? $this->fieldsPreset;

        return [
            'id' => $this->id,
            'back_half' => $this->back_half,
            'name' => $this->name,
            'workspace_id' => $this->workspace_id,
            /** @var 'legacy'|'creator_profile' */
            'builder_mode' => $this->builder_mode,
            /**
             * @var array{
             *   display_name?: string,
             *   profile_title?: string|null,
             *   bio?: string|null,
             *   about_html?: string|null,
             *   avatar_url?: string|null,
             *   cover_url?: string|null,
             *   available_for_work?: bool,
             *   skills?: array<string>,
             *   follow_url?: string|null,
             *   contact_url?: string|null,
             *   social_links?: array<string, string>,
             *   source_widget_ids?: array<int>
             * }
             */
            'profile_config' => $this->profile_config ?? [],
            'public_item_count' => $this->when(
                $this->relationLoaded('links') &&
                    $this->relationLoaded('widgets') &&
                    $this->relationLoaded('digitalProducts'),
                fn(): int => $this->publicItemCount(),
            ),
            'is_verified' => $this->when(
                $this->relationLoaded('user'),
                fn(): bool => settings('kyc.enabled', false)
                    ? $this->user?->isKycVerified()
                    : $this->user?->email_verified_at !== null,
            ),

            /** @var 'store' */
            'model_type' => 'store',

            'created_at' => $this->when(
                $fieldsPreset === 'show' || $fieldsPreset === 'datatable',
                $this->created_at,
            ),
            'deleted_at' => $this->when(
                $fieldsPreset === 'show',
                $this->deleted_at,
            ),

            'clicks_count' => $this->when(
                $fieldsPreset === 'show',
                $this->clicks_count,
            ),
            'clicked_at' => $this->when(
                $fieldsPreset === 'show',
                $this->clicked_at,
            ),

            'links_count' => $this->whenCounted('links'),

            'short_url' => $this->getDestinationUrlBeforeApplyingMutations(),

            ...$this->getExpirationFields(
                $this->resource,
                $fieldsPreset === 'show',
            ),
            ...$this->getTrackingFields(
                $this->resource,
                $fieldsPreset === 'show',
            ),
            ...$this->getPasswordFields(
                $this->resource,
                $fieldsPreset === 'show',
            ),

            ...$this->getDomainFields($this->resource),
            ...$this->getRetargetingFields($this->resource),
            ...$this->getTagsFields(),
            ...$this->getQrCodeFields(),
            ...$this->getUserFields(),

            /** @var array<BiolinkLinkResource|BiolinkWidgetResource> */
            'content' => $this->when(
                $this->relationLoaded('links') &&
                    $this->relationLoaded('widgets'),
                function () {
                    $links = $this->links->map(
                        fn($link) => new BiolinkLinkResource($link),
                    );
                    $widgets = $this->widgets->map(
                        fn($widget) => new BiolinkWidgetResource(
                            $widget,
                        ),
                    );
                    return $links
                        ->concat($widgets)
                        ->sortBy(
                            fn($item) => [
                                $item->pinned === 'top' ? 0 : 1,
                                $item->position,
                            ],
                        )
                        ->values();
                },
            ),

            'appearance' => $this->whenLoaded(
                'appearance',
                fn($appearance) => new BiolinkAppearanceResource($appearance),
            ),
        ];
    }

    public function toWebhookArray(): array
    {
        return [
            'id' => $this->id,
            'back_half' => $this->back_half,
            'name' => $this->name,
            'expires_at' => $this->expires_at,
            'activates_at' => $this->activates_at,
            'user_id' => $this->user_id,
            'model_type' => 'store',
        ];
    }
}
