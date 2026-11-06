<?php

use App\CreatorAi\Auth\PassportCreatorIdentity;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Route;
use Laravel\Passport\Contracts\OAuthenticatable;
use Laravel\Passport\HasApiTokens as PassportHasApiTokens;
use Laravel\Sanctum\HasApiTokens as SanctumHasApiTokens;

uses(DatabaseTransactions::class);

test('Passport uses an isolated OAuth user provider without replacing Linket Sanctum login', function () {
    $creator = User::factory()->create(['email_verified_at' => now()]);

    expect(config('auth.defaults.guard'))->toBe('web');
    expect(config('auth.providers.users.model'))->toBe(User::class);

    expect(config('auth.providers.creator_mcp_users.model'))
        ->toBe(PassportCreatorIdentity::class);
    expect(config('auth.guards.creator_mcp.driver'))->toBe('passport')
        ->and(config('auth.guards.creator_mcp.provider'))->toBe('creator_mcp_users');

    $oauthIdentity = PassportCreatorIdentity::query()->findOrFail($creator->getKey());
    expect($oauthIdentity)->toBeInstanceOf(OAuthenticatable::class)
        ->and((int) $oauthIdentity->getKey())->toBe((int) $creator->getKey())
        ->and($oauthIdentity->email)->toBe($creator->email);
});

test('Sanctum and Passport token relationships remain distinct and never share bearer-token methods', function () {
    $creator = User::factory()->create();
    $oauthIdentity = PassportCreatorIdentity::query()->findOrFail($creator->getKey());

    expect(class_uses_recursive($creator))->toContain(SanctumHasApiTokens::class);
    expect(class_uses_recursive($creator))->not->toContain(PassportHasApiTokens::class);

    expect($creator->tokens())->toBeInstanceOf(MorphMany::class);
    expect($oauthIdentity->tokens())->toBeInstanceOf(HasMany::class);
    expect($oauthIdentity->getProviderName())->toBe('creator_mcp_users');
});

test('OAuth MCP registration remains unavailable until the deployment feature flags are explicitly enabled', function () {
    expect(config('creator_ai.features.mcp'))->toBeFalse();
    expect(config('creator_ai.features.mcp_oauth', false))->toBeFalse();

    // Public discovery and MCP routes must not be registered from the
    // mere presence of a Composer package.
    expect(Route::has('linket.mcp'))->toBeFalse()
        ->and(Route::has('mcp.oauth.register'))->toBeFalse()
        ->and(Route::has('mcp.oauth.protected-resource'))->toBeFalse()
        ->and(Route::has('passport.authorizations.authorize'))->toBeFalse()
        ->and(Route::has('passport.token'))->toBeFalse();
});
