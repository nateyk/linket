<?php

namespace Common\Workspaces\Models;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Auth\Traits\HasAvatarAttribute;
use Common\Auth\Traits\HasDisplayNameAttribute;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class WorkspaceMember extends Model
{
    use HasAvatarAttribute, HasDisplayNameAttribute;

    protected $table = 'workspace_user';
    protected $guarded = [];
    protected $appends = ['model_type'];
    protected $casts = ['is_owner' => 'boolean'];

    // For workspace permissions we only check if user has that permission through workspace role.
    // Permissions attached directly to user, through subscriptions, or regular roles should not count.
    public function permissions()
    {
        return $this->belongsToMany(
            Permission::class,
            'permissionables',
            'permissionable_id',
            'permission_id',
            'role_id',
        )
            ->where('permissionable_type', Role::MODEL_TYPE)
            ->select(['permissions.id', 'permissions.name']);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public static function getModelTypeAttribute(): string
    {
        return 'member';
    }

    public function hasPermission(string $name): bool
    {
        return $this->is_owner || !is_null($this->getPermission($name));
    }

    public function getPermission(string $name): ?Permission
    {
        return $this->permissions->first(function (Permission $permission) use (
            $name,
        ) {
            return $permission->name === $name;
        });
    }

    public function getRestrictionValue(
        string $permissionName,
        string $restriction,
    ): int|bool|null {
        $permission = $this->getPermission($permissionName);
        return $permission?->getRestrictionValue($restriction);
    }
}
