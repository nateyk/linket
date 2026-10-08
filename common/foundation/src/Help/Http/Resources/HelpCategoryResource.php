<?php

namespace Common\Help\Http\Resources;

use Common\Help\Models\HelpCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin HelpCategory
 */
class HelpCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'views' => $this->views,
            'articles' => HelpArticleResource::collection($this->whenLoaded('articles')),
        ];
    }
}
