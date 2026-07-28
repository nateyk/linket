<?php

namespace Common\Workspaces\Resources;

use Common\Permissions\Models\Permission;
use Common\Workspaces\Models\WorkspaceMember;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * @mixin WorkspaceMember
 */
#[SchemaName('WorkspaceMember')]
class WorkspaceMemberResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'member_id' => $this->member_id,
            'email' => $this->email,
            'role_name' => $this->role_name,
            'role_id' => $this->role_id,
            'image' => $this->image,
            'name' => $this->name,
            'model_type' => $this->model_type,
            'is_owner' => $this->is_owner,
            'permissions' => $this->whenLoaded(
                'permissions',
                fn(Collection $permissions) => $permissions->map(
                    fn(Permission $permission) => [
                        'id' => $permission->id,
                        'name' => $permission->name,
                    ],
                ),
            ),
        ];
    }
}
