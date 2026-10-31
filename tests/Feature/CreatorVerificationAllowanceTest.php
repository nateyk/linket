<?php

use App\Models\User;
use App\Storefront\Services\CreatorVerificationAllowance;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('a new creator has ten lifetime allowances without modifying financial history', function (): void {
    $creator = User::factory()->create();
    expect(app(CreatorVerificationAllowance::class)->usage($creator))->toBe([
        'consumed' => 0, 'reserved' => 0, 'remaining' => 10,
    ]);
});
