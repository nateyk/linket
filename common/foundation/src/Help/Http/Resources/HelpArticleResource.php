<?php

namespace Common\Help\Http\Resources;

use Common\Help\Models\HelpArticle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin HelpArticle
 */
class HelpArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'body' => $this->when($request->routeIs('help.article'), $this->body),
            'short_description' => $this->short_description,
            'views' => $this->views,
            'likes' => $this->likes,
            'dislikes' => $this->dislikes,
            'help_category_id' => $this->help_category_id,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
