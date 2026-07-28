<?php

namespace App\Biolinks\Resources;

use App\Biolinks\Models\BiolinkWidget;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BiolinkWidget
 */
#[SchemaName('BiolinkWidget')]
class BiolinkWidgetResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'active' => $this->active,
            'position' => $this->position,
            'pinned' => $this->pinned,
            /** @var array<string, string> */
            'config' => $this->config,
            /** @var 'image' | 'text' | 'socials' | 'youtube' | 'soundcloud' | 'vimeo' | 'spotify' | 'twitch' | 'tiktok' */
            'type' => $this->type,
            /** @var 'biolinkWidget' */
            'model_type' => $this->model_type,
        ];
    }
}
