<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\InteractsWithCreatorMcpOAuth;

uses(DatabaseTransactions::class, InteractsWithCreatorMcpOAuth::class);

/**
 * Cache-Control may include additional safe directives (such as private).
 * Require no-store as a complete directive, never an exact header string.
 */
function assertMcpNoStoreCacheControl(\Illuminate\Testing\TestResponse $response): void
{
    $header = strtolower((string) $response->headers->get('Cache-Control'));
    $directives = array_map('trim', explode(',', $header));
    expect($directives)->toContain('no-store');
}

/**
 * Synthetic ChatGPT protocol rehearsal, NOT a connection to ChatGPT or to a
 * live staging/production host. Every request uses Laravel's test client,
 * db_test, fixture users/clients and an ephemeral RSA signing key.
 */
test('ChatGPT-style discovery and challenge advertise only the isolated read-only OAuth resource', function () {
    $this->enableMcpOAuth();

    $resourceMetadata = $this->get('https://linket.example.test/.well-known/oauth-protected-resource/mcp')
        ->assertOk()
        ->assertJsonPath('resource', 'https://linket.example.test/mcp')
        ->assertJsonPath('authorization_servers.0', 'https://linket.example.test')
        ->assertJsonPath('scopes_supported.0', 'mcp:use');
    assertMcpNoStoreCacheControl($resourceMetadata);

    $this->get('https://linket.example.test/.well-known/oauth-authorization-server')
        ->assertOk()
        ->assertJsonPath('issuer', 'https://linket.example.test')
        ->assertJsonPath('authorization_endpoint', 'https://linket.example.test/oauth/linket/authorize')
        ->assertJsonPath('token_endpoint', 'https://linket.example.test/oauth/linket/token')
        ->assertJsonPath('code_challenge_methods_supported.0', 'S256')
        ->assertJsonPath('token_endpoint_auth_methods_supported.0', 'none');

    // A ChatGPT-compatible OAuth challenge must identify the exact protected
    // resource metadata before any browser consent or token issuance.
    $response = $this->postJson('https://linket.example.test/mcp', [
        'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list', 'params' => (object) [],
    ], [
        'MCP-Protocol-Version' => '2026-07-28',
        'Mcp-Method' => 'tools/list',
        'Accept' => 'application/json, text/event-stream',
    ])->assertUnauthorized()->assertExactJson(['error' => 'invalid_token']);

    expect($response->headers->get('WWW-Authenticate'))
        ->toContain('Bearer realm="linket-mcp"')
        ->toContain('resource_metadata="https://linket.example.test/.well-known/oauth-protected-resource/mcp"')
        ->toContain('scope="mcp:use"')
        ->toContain('error="invalid_token"')
        ->toContain('error_description="Linket OAuth authorization is required"');
    expect(DB::table('oauth_access_tokens')->count())->toBe(0);
});

test('a pre-registered ChatGPT-shaped callback can authorize list read-only tools refresh and disconnect', function () {
    $this->enableMcpOAuth();
    [$creator, $workspaceId, $parameters] = $this->mcpCreator();

    // ChatGPT currently uses callback-ID-specific redirect URIs when the
    // authorization server does not advertise RFC 9207 issuer identification.
    // This URL is synthetic; no real ChatGPT OAuth registration is performed.
    $redirectUri = 'https://chatgpt.com/connector/oauth/'.Str::uuid();
    DB::table('oauth_clients')->where('id', $parameters['client_id'])
        ->update(['redirect_uris' => json_encode([$redirectUri], JSON_THROW_ON_ERROR)]);
    $parameters['redirect_uri'] = $redirectUri;

    $authorizationCode = $this->mcpConsent($creator, $workspaceId, $parameters);
    $tokenResponse = $this->mcpRedeem($authorizationCode, $parameters)->assertOk();
    assertMcpNoStoreCacheControl($tokenResponse);
    $tokens = $tokenResponse->json();

    expect($tokens['token_type'])->toBe('Bearer');
    expect($tokens['access_token'])->toBeString()->not->toBeEmpty();
    expect($tokens['refresh_token'])->toBeString()->not->toBeEmpty();

    // These are real HTTP transport/protocol routes in the Laravel test app,
    // not a call directly to the reporting facade.
    $list = $this->postJson('https://linket.example.test/mcp', [
        'jsonrpc' => '2.0', 'id' => 2, 'method' => 'tools/list',
        'params' => [
            '_meta' => [
                'io.modelcontextprotocol/protocolVersion' => '2026-07-28',
                'io.modelcontextprotocol/clientCapabilities' => (object) [],
            ],
        ],
    ], [
        'MCP-Protocol-Version' => '2026-07-28',
        'Mcp-Method' => 'tools/list',
        'Accept' => 'application/json, text/event-stream',
        'Authorization' => 'Bearer '.$tokens['access_token'],
    ])->assertOk();

    $names = array_column($list->json('result.tools') ?? [], 'name');
    expect($names)->toEqualCanonicalizing([
        'linket.get_sales_summary',
        'linket.get_sales_trends',
        'linket.get_order_insights',
        'linket.list_orders',
        'linket.get_product_performance',
    ]);
    // Explicit per-tool auth metadata is required to show ChatGPT OAuth
    // linking; no tool may silently fall back to anonymous access.
    $tools = $list->json('result.tools') ?? [];
    expect($tools)->toHaveCount(5);
    foreach ($tools as $tool) {
        expect($tool['securitySchemes'] ?? null)->toBe([
            ['type' => 'oauth2', 'scopes' => ['mcp:use']],
        ]);
    }
    expect($list->getContent())
        ->not->toContain('sales_forecast')
        ->not->toContain('payment_reference')
        ->not->toContain('receiver_account')
        ->not->toContain('download_url');

    $summary = $this->mcpCall($tokens['access_token'], 'get_sales_summary')->assertOk();
    expect($summary->json('result.isError') ?? false)->toBeFalse();

    $successor = $this->mcpRefresh($tokens['refresh_token'], $parameters)
        ->assertOk()->json();
    $this->mcpCall($tokens['access_token'])->assertUnauthorized();
    $this->mcpCall($successor['access_token'])->assertOk();

    $connectionId = DB::table('creator_ai_mcp_connections')
        ->where('creator_id', $creator->getKey())->value('id');
    expect($connectionId)->toBeString()->not->toBeEmpty();

    $this->actingAs($creator, 'web')
        ->withHeader('Referer', 'https://linket.example.test')
        ->withHeader('X-CSRF-TOKEN', session()->token())
        ->deleteJson('/api/v1/creator-ai/mcp-connections/'.$connectionId)
        ->assertNoContent();

    $this->mcpCall($successor['access_token'])->assertUnauthorized()
        ->assertExactJson(['error' => 'invalid_token']);
    $this->mcpRefresh($successor['refresh_token'], $parameters)->assertBadRequest()
        ->assertExactJson(['error' => 'invalid_grant']);
});
