<?php

namespace App\LinkOverlays\Resources;

use App\LinkOverlays\Models\LinkOverlay;
use App\Models\User;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LinkOverlay
 */
#[SchemaName('LinkOverlay')]
class LinkOverlayResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
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
            'name' => $this->name,
            /**
             * @var 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
             */
            'position' => $this->position,
            'message' => $this->message,
            'label' => $this->label,
            'btn_link' => $this->btn_link,
            'btn_text' => $this->btn_text,
            /**
             * @var array{
             *   bg-image?: string,
             *   bg-color?: string,
             *   text-color?: string,
             *   btn-bg-color?: string,
             *   btn-text-color?: string,
             *   label-bg-color?: string,
             *   label-color?: string
             * }
             */
            'colors' => $this->colors,
            /**
             * @var 'default' | 'full-width' | 'rounded' | 'pill'
             */
            'theme' => $this->theme,
            'image' => $this->image,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
            /** @var "linkOverlay" */
            'model_type' => $this->model_type,
        ];
    }
}
