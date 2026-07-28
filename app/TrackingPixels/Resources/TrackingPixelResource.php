<?php

namespace App\TrackingPixels\Resources;

use App\Models\User;
use App\TrackingPixels\Models\TrackingPixel;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TrackingPixel
 */
#[SchemaName('TrackingPixel')]
class TrackingPixelResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'pixel_id' => $this->pixel_id,
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
            'head_code' => $this->head_code,
            'body_code' => $this->body_code,
            'created_at' => $this->created_at,
            'deleted_at' => $this->deleted_at,
            /** @var "trackingPixel" */
            'model_type' => $this->model_type,
        ];
    }
}
