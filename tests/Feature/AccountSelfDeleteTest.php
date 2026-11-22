<?php

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('authenticated user can delete their own account via users/me', function () {
    $user = User::factory()->create();

    statefulAccount()
        ->actingAs($user)
        ->deleteJson('/api/v1/users/me')
        ->assertNoContent();

    $this->assertDatabaseMissing('users', ['id' => $user->id]);
});

test('users/me only deletes the authenticated user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    statefulAccount()
        ->actingAs($user)
        ->deleteJson('/api/v1/users/me')
        ->assertNoContent();

    $this->assertDatabaseMissing('users', ['id' => $user->id]);
    $this->assertDatabaseHas('users', ['id' => $other->id]);
});

test('guests cannot delete users/me', function () {
    statefulAccount()
        ->deleteJson('/api/v1/users/me')
        ->assertUnauthorized();
});

function statefulAccount()
{
    $csrfToken = 'test-csrf-token';
    test()->flushSession();

    return test()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}
