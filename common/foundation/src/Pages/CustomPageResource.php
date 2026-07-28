<?php

namespace Common\Pages;

use App\Models\User;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * @mixin CustomPage
 */
#[SchemaName('CustomPage')]
class CustomPageResource extends JsonResource
{
    public function __construct(
        CustomPage $resource,
        protected string|null $fieldsPreset = null,
    ) {
        parent::__construct($resource);
    }

    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'body' =>
                $this->fieldsPreset === 'show'
                    ? $this->body
                    : Str::limit(strip_tags($this->body), 100),
            'slug' => $this->slug,
            'type' => $this->type,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded(
                'user',
                fn(User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'avatar' => $user->avatar,
                ],
            ),
            'created_at' => $this->created_at,
            'model_type' => $this->model_type,
        ];
    }
}
