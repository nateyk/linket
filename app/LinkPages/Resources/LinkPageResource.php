<?php

namespace App\LinkPages\Resources;

use App\LinkPages\Models\LinkPage;
use App\Models\User;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * @mixin LinkPage
 */
#[SchemaName('LinkPage')]
class LinkPageResource extends JsonResource
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
            'title' => $this->title,
            'body' => $this->when($fieldsPreset === 'show', $this->body),
            'hide_footer' => $this->hide_footer,
            'hide_navbar' => $this->hide_navbar,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded(
                'user',
                fn(User $user) => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'image' => $user->image,
                ],
            ),
            'created_at' => $this->created_at,
            'deleted_at' => $this->deleted_at,
            /** @var "linkPage" */
            'model_type' => $this->model_type,
        ];
    }
}
