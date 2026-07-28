<?php

namespace Common\Domains\Resources;

use App\Models\User;
use Common\Domains\CustomDomain;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CustomDomain
 */
#[SchemaName('CustomDomain')]
class CustomDomainResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'host' => $this->host,
            'global' => $this->global,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
            'user' => $this->whenLoaded(
                'user',
                fn(User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'image' => $user->avatar,
                ],
            ),
        ];
    }
}
