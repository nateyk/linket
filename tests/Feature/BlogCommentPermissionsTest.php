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

        $defaultRole = Role::query()->where('default', true)->first();
        if ($defaultRole === null) {
            $defaultRole = Role::factory()->create([
                'name' => 'Test default role '.Str::random(6),
                'type' => 'users',
                'default' => true,
            ]);
        }

        $moderationPerms = \Common\Permissions\Models\Permission::query()->whereIn(
            'name',
            ['comments.update', 'comments.delete'],
        )->get();
        $defaultRole->permissions()->detach($moderationPerms->pluck('id')->toArray());

        $newCommentPerms = \Common\Permissions\Models\Permission::query()->whereIn(
            'name',
            ['comments.create', 'comments.view'],
        )->get();
        abort_unless($newCommentPerms->count() === 2, 500, 'Comment permissions missing from test database.');
        $defaultRole->permissions()->syncWithoutDetaching($newCommentPerms->pluck('id')->toArray());

        $user->roles()->attach($defaultRole->id);
        $user->load('roles');

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