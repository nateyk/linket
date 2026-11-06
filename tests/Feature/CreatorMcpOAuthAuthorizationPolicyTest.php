<?php

use App\CreatorAi\Auth\CreatorMcpOAuthAuthorizationPolicy;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

/** @param array<string, mixed> $overrides */
function mcpOauthTestClient(array $overrides = []): string
{
    $id = (string) Str::uuid();

    DB::table('oauth_clients')->insert(array_replace([
        'id' => $id,
        'owner_type' => null,
        'owner_id' => null,
        'name' => 'Synthetic MCP OAuth test client',
        'secret' => null,
        'provider' => 'creator_mcp_users',
        'redirect_uris' => json_encode(['https://client.example.test/oauth/callback']),
        'grant_types' => json_encode(['authorization_code', 'refresh_token']),
        'revoked' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides));

    return $id;
}

/** @return array<string, string> */
function mcpOauthValidAuthorization(string $clientId): array
{
    return [
        'client_id' => $clientId,
        'redirect_uri' => 'https://client.example.test/oauth/callback',
        'response_type' => 'code',
        'scope' => 'mcp:use',
        'state' => str_repeat('x', 40),
        'code_challenge' => str_repeat('A', 43),
        'code_challenge_method' => 'S256',
        'resource' => 'https://linket.example.test/mcp',
    ];
}

function mcpOauthEnablePolicy(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.mcp', true);
    config()->set('creator_ai.features.mcp_oauth', true);
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');
    config()->set('app.url', 'https://linket.example.test');
}

/** @param array<string, mixed> $authorization */
function mcpOauthAssertDenied(array $authorization, int $status): void
{
    $exception = null;

    try {
        app(CreatorMcpOAuthAuthorizationPolicy::class)->validate($authorization);
    } catch (HttpException $caught) {
        $exception = $caught;
    }

    expect($exception)->toBeInstanceOf(HttpException::class);
    expect($exception?->getStatusCode())->toBe($status);
}

test('MCP OAuth preflight accepts only a registered public client with S256 and an exact resource', function () {
    mcpOauthEnablePolicy();
    $clientId = mcpOauthTestClient();
    $request = mcpOauthValidAuthorization($clientId);

    $validated = app(CreatorMcpOAuthAuthorizationPolicy::class)->validate($request);

    expect($validated)->toBe($request);
});

test('MCP OAuth preflight fails closed if any one of the three feature gates is disabled', function () {
    mcpOauthEnablePolicy();
    $request = mcpOauthValidAuthorization(mcpOauthTestClient());

    foreach (['creator_ai.enabled', 'creator_ai.features.mcp', 'creator_ai.features.mcp_oauth'] as $feature) {
        config()->set($feature, false);
        mcpOauthAssertDenied($request, 404);
        config()->set($feature, true);
    }
});

test('MCP OAuth preflight rejects unknown, revoked, confidential, foreign-provider and unsafe-grant clients', function () {
    mcpOauthEnablePolicy();

    foreach ([
        ['revoked' => true],
        ['secret' => 'synthetic-secret-hash'],
        ['provider' => 'users'],
        ['provider' => null],
        ['grant_types' => json_encode(['client_credentials'])],
        ['grant_types' => json_encode(['authorization_code', 'password'])],
    ] as $overrides) {
        mcpOauthAssertDenied(mcpOauthValidAuthorization(mcpOauthTestClient($overrides)), 400);
    }

    mcpOauthAssertDenied(mcpOauthValidAuthorization((string) Str::uuid()), 400);
    mcpOauthAssertDenied(mcpOauthValidAuthorization('not-a-uuid'), 400);
});

test('MCP OAuth preflight rejects absent or weak PKCE challenge and forbids plain fallback', function () {
    mcpOauthEnablePolicy();
    $request = mcpOauthValidAuthorization(mcpOauthTestClient());

    foreach ([
        ['code_challenge_method' => 'plain'],
        ['code_challenge_method' => 's256'],
        ['code_challenge_method' => ''],
        ['code_challenge' => 'abc'],
        ['code_challenge' => str_repeat('A', 42)],
        ['code_challenge' => str_repeat('A', 42).'='],
        ['code_challenge' => str_repeat('A', 42).'+'],
        ['code_challenge' => null],
        ['code_challenge_method' => null],
    ] as $change) {
        mcpOauthAssertDenied(array_replace($request, $change), 400);
    }
});

test('MCP OAuth preflight requires exact registered HTTPS redirect and no wildcard or local callback', function () {
    mcpOauthEnablePolicy();
    $request = mcpOauthValidAuthorization(mcpOauthTestClient());

    foreach ([
        'https://client.example.test/oauth/callback/',
        'https://CLIENT.example.test/oauth/callback',
        'https://client.example.test:443/oauth/callback',
        'https://client.example.test/oauth/callback?next=1',
        'http://client.example.test/oauth/callback',
        'http://127.0.0.1:3000/callback',
        '',
    ] as $redirectUri) {
        mcpOauthAssertDenied(array_replace($request, ['redirect_uri' => $redirectUri]), 400);
    }
});

test('MCP OAuth preflight rejects wrong resource, insecure configuration or missing resource', function () {
    mcpOauthEnablePolicy();
    $request = mcpOauthValidAuthorization(mcpOauthTestClient());

    foreach ([
        'https://other.example.test/mcp',
        'https://linket.example.test/other-mcp',
        'http://linket.example.test/mcp',
        'https://linket.example.test/mcp?token=secret',
        '',
    ] as $resource) {
        mcpOauthAssertDenied(array_replace($request, ['resource' => $resource]), 400);
    }

    config()->set('creator_ai.mcp_resource_url', null);
    mcpOauthAssertDenied($request, 503);
    config()->set('creator_ai.mcp_resource_url', 'http://linket.example.test/mcp');
    mcpOauthAssertDenied($request, 503);
    config()->set('creator_ai.mcp_resource_url', 'https://external.example.test/mcp');
    mcpOauthAssertDenied($request, 503);
});

test('MCP OAuth preflight rejects implicit flow, extra scopes, invalid state and silent consent', function () {
    mcpOauthEnablePolicy();
    $request = mcpOauthValidAuthorization(mcpOauthTestClient());

    foreach ([
        ['response_type' => 'token'],
        ['response_type' => ''],
        ['scope' => 'mcp:use payments:write'],
        ['scope' => ''],
        ['state' => 'short'],
        ['state' => ''],
        ['state' => str_repeat('x', 129)],
        ['state' => 'state with spaces'.str_repeat('x', 27)],
        ['prompt' => 'none'],
        ['prompt' => 'login consent'],
        ['prompt' => null],
    ] as $change) {
        mcpOauthAssertDenied(array_replace($request, $change), 400);
    }
});
