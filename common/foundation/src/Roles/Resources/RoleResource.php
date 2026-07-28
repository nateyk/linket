<?php

namespace Common\Roles\Resources;

use Common\Permissions\Models\Permission;
use Dedoc\Scramble\Attributes\SchemaName;
use Common\Roles\Models\Role;
use Illuminate\Http\Resources\Json\JsonResource;
use Common\Permissions\Resources\PermissionResource;
use Illuminate\Support\Collection;

/**
 * @mixin Role
 */
#[SchemaName('Role')]
class RoleResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'description' => $this->description,
            'permissions' => $this->whenLoaded(
                'permissions',
                fn(Collection $permissions) => $permissions->map(
                    fn(Permission $permission) => [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        /**
                         * Additional restrictions applied to role for this permission.
                         * @example [['name' => 'count', 'value' => 10]]
                         * @var array<array{name: string, value: string}>
                         */
                        'restrictions' => $permission->restrictions,
                    ],
                ),
            ),
            'default' => $this->default,
            'guests' => $this->guests,
            'internal' => $this->internal,
            'created_at' => $this->created_at,
        ];
    }
}
