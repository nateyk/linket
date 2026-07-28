<?php

namespace App\Folders\Resources;

use App\Folders\Models\Folder;
use App\Links\Linkeable\LinkeableResource;
use Dedoc\Scramble\Attributes\SchemaName;

/**
 * @mixin Folder
 */
#[SchemaName('Folder')]
class FolderResource extends LinkeableResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'back_half' => $this->back_half,
            'name' => $this->name,
            'user_id' => $this->user_id,
            'image' => $this->image,
            'rotator' => $this->rotator,
            'description' => $this->description,

            /** @var 'folder' */
            'model_type' => $this->model_type,

            'created_at' => $this->created_at,
            'deleted_at' => $this->deleted_at,

            'clicks_count' => $this->clicks_count,

            'links_count' => $this->whenCounted('links'),

            'short_url' => $this->getDestinationUrlBeforeApplyingMutations(),

            ...$this->getDomainFields($this->resource),
            ...$this->getExpirationFields($this->resource),
            ...$this->getTrackingFields($this->resource),
            ...$this->getPasswordFields($this->resource),
            ...$this->getRetargetingFields($this->resource),
            ...$this->getTagsFields(),
            ...$this->getQrCodeFields(),
            ...$this->getUserFields(),
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
