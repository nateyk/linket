<?php

namespace Common\Roles\Resources;

use App\Models\User;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * @mixin User
 */
#[SchemaName('RoleUser')]
class RoleUserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'image' => $this->image,
            'assigned_at' => $this->assigned_at
                ? Carbon::parse($this->assigned_at)->toJSON()
                : null,
        ];
    }
}
