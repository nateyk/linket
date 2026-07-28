<?php

namespace Common\Workspaces;

use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class ActiveWorkspace
{
    /**
     * @var Collection<Workspace>|null
     */
    protected static Collection|null $cache = null;
    protected int|null $id = null;

    public static function shouldScopeToWorkspace(): bool
    {
        return request('workspace_id') !== 'all';
    }

    public static function get(
        int|null $id = null,
        bool $createIfNotFound = true,
    ): Workspace|null {
        $workspaces = self::getAll();

        $workspaceId = $id ?? self::getRequestedWorkspaceId();
        $workspace = null;

        if ($workspaceId && $workspaceId !== 'all') {
            $workspace = $workspaces->first(
                fn(Workspace $workspace) => $workspace->id ===
                    (int) $workspaceId,
            );
        }

        if (!$workspace && $createIfNotFound && Auth::check()) {
            $workspace = self::findOrCreatePersonalWorkspace();
        }

        return $workspace;
    }

    /**
     * @return Collection<Workspace>
     */
    public static function getAll()
    {
        if (!Auth::check()) {
            return new Collection();
        }

        if (self::$cache !== null) {
            return self::$cache;
        }

        self::$cache = Workspace::query()
            ->forUser(Auth::id())
            ->withCount(['members'])
            ->with([
                'members' => fn(HasMany $builder) => $builder
                    ->with('permissions')
                    // only load current user and owner, other members are not needed for global cache
                    ->where(
                        fn(Builder $builder) => $builder
                            ->where('workspace_user.user_id', Auth::id())
                            ->orWhere('workspace_user.is_owner', true),
                    ),
            ])
            ->limit(50)
            ->orderByDesc('is_personal')
            ->orderBy('id', 'desc')
            ->get();

        return self::$cache;
    }

    public static function clearCache(): void
    {
        self::$cache = null;
    }

    protected static function findOrCreatePersonalWorkspace(): Workspace
    {
        $workspaces = self::getAll();
        $workspace = $workspaces->first(
            fn(Workspace $workspace) => $workspace->is_personal,
        );

        if (!$workspace) {
            if (!Auth::user()) {
                throw new AuthenticationException();
            }

            (new CreateWorkspace())->createPersonalWorkspace(Auth::user());
            self::clearCache();
            $workspace = self::getAll()->first(
                fn(Workspace $workspace) => $workspace->is_personal,
            );
        }

        return $workspace;
    }

    protected static function getRequestedWorkspaceId(): int|string|null
    {
        if (request()->has('workspace_id')) {
            return request('workspace_id');
        }

        if (Auth::check()) {
            return $_COOKIE['workspace_id_' . Auth::id()] ?? null;
        }

        return null;
    }
}
