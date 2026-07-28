<?php

namespace App\Tags\Resources;

use App\Tags\Models\Tag;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Tag
 */
#[SchemaName('Tag')]
class TagResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'user_id' => $this->user_id,
        ];
    }
}
