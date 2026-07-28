<?php

namespace Common\Workspaces\Models;

use App\Models\User;
use Common\Core\BaseModel;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

class Workspace extends BaseModel
{
    use HasFactory;

    const MODEL_TYPE = 'workspace';

    protected $guarded = [];

    protected $casts = [
        'id' => 'integer',
        'owner_id' => 'integer',
        'is_personal' => 'boolean',
    ];

    public function invites(): HasMany
    {
        return $this->hasMany(WorkspaceInvite::class)
            ->join('roles', 'roles.id', '=', 'workspace_invites.role_id')
            ->select([
                'workspace_invites.id',
                'workspace_invites.workspace_id',
                'roles.name as role_name',
                'workspace_invites.email',
                'workspace_invites.role_id',
                'email',
                'image',
            ]);
    }

    public function members()
    {
        return $this->hasMany(WorkspaceMember::class)
            ->join('roles', 'roles.id', '=', 'workspace_user.role_id', 'left')
            ->join('users', 'users.id', '=', 'workspace_user.user_id')
            ->select([
                'roles.name as role_name',
                'users.email',
                'workspace_user.workspace_id',
                'workspace_user.user_id',
                'workspace_user.created_at as joined_at',
                'workspace_user.role_id',
                'workspace_user.is_owner',
                'workspace_user.id as member_id',
                'users.id',
                'users.name',
                'users.image',
            ]);
    }

    public function isMember(User $user): bool
    {
        return ($this->is_personal && $this->isOwner($user)) ||
            $this->findMember($user);
    }

    public function findMember(User $user): WorkspaceMember
    {
        return $this->members->where('user_id', $user->id)->first();
    }

    public function isOwner(User $user): bool
    {
        return $this->owner_id === $user->id;
    }

    public function getOwnerUser(): User
    {
        $member = $this->members->where('is_owner', true)->first();

        if (!$member->relationLoaded('user')) {
            $member->user_id === Auth::id()
                ? $member->setRelation('user', Auth::user())
                : $member->loadMissing('user');
        }

        return $member->user;
    }

    /**
     * Load all worskapces user owns or is a member of.
     */
    #[Scope]
    protected function forUser(Builder $builder, int $userId): Builder
    {
        $model = $builder->getModel();
        $table = $model->getTable();

        $ownedWorkspaces = $model
            ->newQuery()
            ->where('owner_id', $userId)
            ->limit(50);

        $memberWorkspaces = $model
            ->newQuery()
            ->select("{$table}.*")
            ->join(
                'workspace_user',
                "{$table}.id",
                '=',
                'workspace_user.workspace_id',
            )
            ->where('workspace_user.user_id', $userId)
            ->limit(50);

        return $builder
            ->fromSub($ownedWorkspaces->union($memberWorkspaces), $table)
            ->select("{$table}.*");
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'model_type' => self::MODEL_TYPE,
        ];
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public static function filterableFields(): array
    {
        return ['id', 'created_at', 'updated_at'];
    }

    public static function sortableFields(): array
    {
        return ['id', 'name', 'created_at', 'updated_at'];
    }

    protected static function newFactory(): WorkspaceFactory
    {
        return WorkspaceFactory::new();
    }

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }
}
