<?php

namespace App\Biolinks\Resources;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkAppearance;
use App\Biolinks\Models\BiolinkLink;
use App\Biolinks\Models\BiolinkWidget;
use App\Links\Linkeable\LinkeableResource;
use Dedoc\Scramble\Attributes\SchemaName;

/**
 * @mixin Biolink
 */
#[SchemaName('Biolink')]
class BiolinkResource extends LinkeableResource
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

            /** @var 'biolink' */
            'model_type' => $this->model_type,

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
                        fn(BiolinkLink $link) => new BiolinkLinkResource($link),
                    );
                    $widgets = $this->widgets->map(
                        fn(BiolinkWidget $widget) => new BiolinkWidgetResource(
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
                fn(
                    BiolinkAppearance $appearance,
                ) => new BiolinkAppearanceResource($appearance),
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
            'model_type' => $this->model_type,
        ];
    }
}
