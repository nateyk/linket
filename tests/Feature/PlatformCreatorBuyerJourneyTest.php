<?php

use App\Models\User;
use App\Stores\Models\Store;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

test('registration still creates a storefront when the guest role is missing', function () {
    expect(strtolower((string) DB::connection()->getDatabaseName()))->toContain('test');
    \Common\Roles\Models\Role::query()->where('guests', true)->delete();
    settings()->save(['registration.disable' => false, 'require_email_confirmation' => false]);
    $email = 'guest-role-missing-'.substr(md5((string) microtime(true)), 0, 8).'@example.test';

    $this->withHeader('Referer', config('app.url'))->postJson('/auth/register', [
        'email' => $email,
        'password' => 'JourneyPassword123!',
        'password_confirmation' => 'JourneyPassword123!',
    ])->assertOk();

    $user = User::query()->where('email', $email)->firstOrFail();
    expect(Store::query()->where('user_id', $user->id)->exists())->toBeTrue();
});
