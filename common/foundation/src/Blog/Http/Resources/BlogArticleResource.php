<?php

namespace Common\Blog\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BlogArticleResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'body' => $this->when(
                $request->routeIs('blog.admin.articles.*'),
                $this->body,
            ),
            'body_text' => $this->body_text,
            'cover_image' => $this->cover_image,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'status' => $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            'reading_time_minutes' => $this->reading_time_minutes,
            'views' => $this->views,
            'blog_category_id' => $this->blog_category_id,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
            'author' => $this->whenLoaded('author', fn () => $this->author ? [
                'id' => $this->author->id,
                'name' => $this->author->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}