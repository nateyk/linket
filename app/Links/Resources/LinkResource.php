<?php

namespace App\Links\Resources;

use App\LinkOverlays\Resources\LinkOverlayResource;
use App\Biolinks\Models\Biolink;
use App\LinkOverlays\Models\LinkOverlay;
use App\Links\Models\Link;
use App\LinkPages\Models\LinkPage;
use App\LinkPages\Resources\LinkPageResource;
use App\Links\Linkeable\LinkeableResource;
use Dedoc\Scramble\Attributes\SchemaName;

/**
 * @mixin Link
 */
#[SchemaName('Link')]
class LinkResource extends LinkeableResource
{
    public function __construct(
        mixed $resource,
        protected string|null $fieldsPreset = null,
    ) {
        parent::__construct($resource);
    }

    public function toArray($request): array
    {
        $fieldsPreset = $this->fieldsPreset ?? request()->input('fieldsPreset');

        return [
            'id' => $this->id,
            'back_half' => $this->back_half,
            'name' => $this->name,
            'image' => $this->image,
            'description' => $this->description,

            /**
             * @var "link"
             */
            'model_type' => $this->model_type,

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,

            'clicked_at' => $this->clicked_at,
            'clicks_count' => $this->clicks_count,

            'short_url' => $this->short_url,
            'long_url' => $this->long_url,
            'final_destination_url' => $this->resource->relationLoaded('rules')
                ? $this->getFinalDestinationUrl()
                : $this->long_url,

            ...$this->getExpirationFields($this->resource),
            ...$this->getTrackingFields($this->resource),
            ...$this->getPasswordFields($this->resource),
            ...$this->getDomainFields($this->resource),
            ...$this->getRetargetingFields($this->resource),
            ...$this->getTagsFields(),
            ...$this->getQrCodeFields(),
            ...$this->getUserFields(),

            /**
             * @var "direct" | "frame" | "overlay" | "splash" | "page"
             */
            'type' => $this->type,
            'type_id' => $this->type_id,

            'overlay' => $this->whenLoaded(
                'overlay',
                fn(LinkOverlay $overlay) => new LinkOverlayResource($overlay),
            ),

            /** @var LinkPageResource */
            'link_page' => $this->whenLoaded(
                'linkPage',
                fn(LinkPage $linkPage) => $fieldsPreset === 'render'
                    ? new LinkPageResource($linkPage, fieldsPreset: 'show')
                    : [
                        'id' => $linkPage->id,
                        'name' => $linkPage->name,
                    ],
            ),

            'folder_id' => $this->folder_id,
            'folder' => $this->whenLoaded(
                'folder',
                fn() => $this->folder
                    ? [
                        'id' => $this->folder->id,
                        'name' => $this->folder->name,
                    ]
                    : null,
            ),

            'biolinks' => $this->whenLoaded(
                'biolinks',
                fn() => $this->biolinks->map(
                    fn(Biolink $biolink) => [
                        'id' => $biolink->id,
                        'name' => $biolink->name,
                    ],
                ),
            ),
        ];
    }

    public function toWebhookArray(): array
    {
        return [
            'id' => $this->id,
            'back_half' => $this->back_half,
            'name' => $this->name,
            'short_url' => $this->short_url,
            'long_url' => $this->long_url,
            'type' => $this->type,
            'expires_at' => $this->expires_at,
            'activates_at' => $this->activates_at,
            'model_type' => $this->model_type,
        ];
    }
}
