<?php

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('local admin command refuses non-local environments', function () {
    $this->app['env'] = 'production';
    $this->artisan('linket:local-admin')->assertFailed();
    expect(User::where('email', 'admin@example.test')->exists())->toBeFalse();
});
