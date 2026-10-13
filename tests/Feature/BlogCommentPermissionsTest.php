<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Roles\Models\Role;
use Common\Comments\Comment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class BlogCommentPermissionsTest extends TestCase
{
    use DatabaseTransactions;

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createUserWithDefaultRole(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'User '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $defaultRole = Role::where('default', true)->first();
        if ($defaultRole) {
            // First, ensure the role ONLY has create and view permissions
            // Remove any moderation permissions that might have been added by seeders
            $moderationPerms = \Common\Permissions\Models\Permission::whereIn(
                'name',
                ['comments.update', 'comments.delete'],
            )->get();
            $defaultRole->permissions()->detach($moderationPerms->pluck('id')->toArray());
            
            // Sync only create and view permissions
            $newCommentPerms = \Common\Permissions\Models\Permission::whereIn(
                'name',
                ['comments.create', 'comments.view'],
            )->get();
            $defaultRole->permissions()->syncWithoutDetaching($newCommentPerms->pluck('id')->toArray());
            
            $user->roles()->attach($defaultRole->id);
        }

        return $user;
    }

    public function test_regular_user_has_permission_to_comment(): void
    {
        $user = $this->createUserWithDefaultRole();

        $user->loadPermissions();

        $this->assertTrue($user->hasPermission('comments.create'));
        $this->assertTrue($user->hasPermission('comments.view'));
    }

    public function test_regular_user_is_not_granted_comment_moderation(): void
    {
        $user = $this->createUserWithDefaultRole();

        $this->assertFalse($user->hasExactPermission('comments.delete'));
    }
}