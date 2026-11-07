<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

uses(DatabaseTransactions::class);

/**
 * OAuth infrastructure schema only. This must NOT expose authorization,
 * token issuance or remote MCP transport while its security gates are OFF.
 */
test('Passport 13.7.6 OAuth storage is migrated with client provider and revocation fields', function () {
    $required = [
        'oauth_auth_codes' => ['id', 'user_id', 'client_id', 'scopes', 'revoked', 'expires_at'],
        'oauth_access_tokens' => ['id', 'user_id', 'client_id', 'scopes', 'revoked', 'expires_at'],
        'oauth_refresh_tokens' => ['id', 'access_token_id', 'revoked', 'expires_at'],
        'oauth_clients' => ['id', 'name', 'secret', 'provider', 'redirect_uris', 'grant_types', 'revoked'],
        'oauth_device_codes' => ['id', 'user_id', 'client_id', 'user_code', 'scopes', 'revoked', 'expires_at'],
    ];

    foreach ($required as $table => $columns) {
        expect(Schema::hasTable($table))->toBeTrue("Missing Passport table: {$table}");
        expect(Schema::hasColumns($table, $columns))
            ->toBeTrue("Incomplete Passport table: {$table}");
    }
});

test('adding Passport OAuth storage alone cannot activate public OAuth routes', function () {
    expect(config('creator_ai.features.mcp_oauth', false))->toBeFalse();

    foreach ([
        'passport.authorizations.authorize',
        'passport.token',
        'mcp.oauth.register',
        'mcp.oauth.protected-resource',
        'linket.mcp',
    ] as $routeName) {
        expect(Route::has($routeName))->toBeFalse("Unexpected public OAuth route: {$routeName}");
    }
});
