<?php

use Database\Seeders\LocalOrdersDemoSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('local orders demo seeder refuses the test environment', function () {
    expect(fn () => app(LocalOrdersDemoSeeder::class)->run())
        ->toThrow(RuntimeException::class, 'restricted to the local DDEV Linket database');
});
