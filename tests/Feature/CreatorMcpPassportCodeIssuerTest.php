<?php

use App\CreatorAi\Auth\CreatorMcpOAuthConsentFlow;
use App\CreatorAi\Auth\CreatorMcpPassportCodeIssuer;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

function codeGrantTestSetup($test): array
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.mcp', true);
    config()->set('creator_ai.features.mcp_oauth', true);
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');
    config()->set('app.url', 'https://linket.example.test');

    // RSA keypair exists only in test process memory; never commit keys.
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $private);
    config()->set('passport.private_key', $private);
    config()->set('passport.public_key', openssl_pkey_get_details($key)['key']);

    $user = User::factory()->create(['email_verified_at' => now()]);
    $workspaceId = (int) (new CreateWorkspace)->createPersonalWorkspace($user)->getKey();
    $product = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $product->id)->where('currency', 'ETB')->firstOrFail();
    Subscription::query()->create([
        'user_id' => $user->id, 'product_id' => $product->id, 'price_id' => $price->id,
        'gateway_name' => 'verify_et', 'gateway_status' => 'active',
        'renews_at' => now()->addMonth(),
    ]);
    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(), 'creator_id' => $user->id,
        'product_id' => $product->id, 'price_id' => $price->id,
        'amount_cents' => 50000, 'status' => 'paid', 'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(), 'subscription_period_end' => now()->addMonth(),
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'MCP-PKCE-'.Str::upper(Str::random(16)), 'payable_type' => ProSubscriptionPayment::class,
        'payable_id' => $payment->id, 'bank_code' => 'cbe',
        'settlement_account' => '1000123456789', 'amount_cents' => 50000,
        'currency' => 'ETB', 'status' => 'success', 'verified_at' => now()->subDay(),
    ]);

    $clientId = (string) Str::uuid();
    DB::table('oauth_clients')->insert([
        'id' => $clientId, 'owner_type' => null, 'owner_id' => null, 'secret' => null,
        'provider' => 'creator_mcp_users', 'name' => 'Synthetic public OAuth client',
        'redirect_uris' => json_encode(['https://client.example.test/oauth/callback']),
        'grant_types' => json_encode(['authorization_code', 'refresh_token']),
        'revoked' => false, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $params = [
        'client_id' => $clientId, 'redirect_uri' => 'https://client.example.test/oauth/callback',
        'response_type' => 'code', 'scope' => 'mcp:use', 'state' => str_repeat('s', 40),
        'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', str_repeat('x', 43), true)), '+/', '-_'), '='),
        'code_challenge_method' => 'S256', 'resource' => 'https://linket.example.test/mcp',
    ];
    $test->actingAs($user, 'web');
    $session = app('session')->driver('array');
    $session->flush();
    $session->start();
    return [$user, $workspaceId, $clientId, $params, $session];
}

function codeGrantBrowser($session): Request
{
    $request = Request::create('/internal-oauth-authorize', 'POST', ['_token' => $session->token()]);
    $request->setLaravelSession($session);
    return $request;
}

test('real Passport authorization code is issued only after explicit workspace consent and linked to that grant', function () {
    [$creator, $workspaceId, $clientId, $params, $session] = codeGrantTestSetup($this);
    $pending = app(CreatorMcpOAuthConsentFlow::class)->begin(codeGrantBrowser($session), $params);

    $response = app(CreatorMcpPassportCodeIssuer::class)
        ->complete(codeGrantBrowser($session), $pending['nonce'], $workspaceId);

    expect($response->getStatusCode())->toBe(302);
    $location = $response->getHeaderLine('Location');
    expect($location)->toStartWith('https://client.example.test/oauth/callback?');
    parse_str((string) parse_url($location, PHP_URL_QUERY), $query);
    expect($query['state'])->toBe($params['state']);
    expect($query['code'])->toBeString()->not->toBeEmpty();

    $authCode = DB::table('oauth_auth_codes')->first();
    $binding = DB::table('creator_ai_mcp_oauth_code_bindings')->first();
    expect($authCode)->not->toBeNull();
    expect($binding)->not->toBeNull();
    expect($binding->auth_code_id)->toBe($authCode->id);
    expect((int) $binding->creator_id)->toBe((int) $creator->id);
    expect($binding->oauth_client_id)->toBe($clientId);
    expect($binding->code_challenge)->toBe($params['code_challenge']);
    expect($binding->redirect_uri)->toBe($params['redirect_uri']);
    expect($binding->resource)->toBe($params['resource']);

    $grant = DB::table('creator_ai_mcp_connections')->where('id', $binding->connection_id)->first();
    expect((int) $grant->workspace_id)->toBe($workspaceId);
    expect(DB::table('oauth_access_tokens')->count())->toBe(0);
});

test('existing Passport tokens or a missing nonce cannot bypass fresh Linket workspace consent', function () {
    [$creator, $workspaceId, $clientId, $params, $session] = codeGrantTestSetup($this);
    DB::table('oauth_access_tokens')->insert([
        'id' => Str::random(80), 'user_id' => $creator->id, 'client_id' => $clientId,
        'name' => null, 'scopes' => json_encode(['mcp:use']), 'revoked' => false,
        'expires_at' => now()->addHour(), 'created_at' => now(), 'updated_at' => now(),
    ]);

    try {
        app(CreatorMcpPassportCodeIssuer::class)
            ->complete(codeGrantBrowser($session), str_repeat('z', 48), $workspaceId);
        $this->fail('Previously granted scopes bypassed explicit workspace consent');
    } catch (HttpException $error) {
        expect($error->getStatusCode())->toBe(403);
    }

    expect(DB::table('oauth_auth_codes')->count())->toBe(0);
});

test('wrong workspace fails before any authorization code can be persisted', function () {
    [$creator, $workspaceId, $clientId, $params, $session] = codeGrantTestSetup($this);
    $foreign = User::factory()->create(['email_verified_at' => now()]);
    $foreignWorkspaceId = (int) (new CreateWorkspace)->createPersonalWorkspace($foreign)->getKey();
    $pending = app(CreatorMcpOAuthConsentFlow::class)->begin(codeGrantBrowser($session), $params);

    try {
        app(CreatorMcpPassportCodeIssuer::class)
            ->complete(codeGrantBrowser($session), $pending['nonce'], $foreignWorkspaceId);
        $this->fail('Foreign workspace was approved');
    } catch (HttpException $error) {
        expect($error->getStatusCode())->toBe(403);
    }

    expect(DB::table('oauth_auth_codes')->count())->toBe(0);
});

test('reused consent nonce cannot mint a second Passport authorization code', function () {
    [$creator, $workspaceId, $clientId, $params, $session] = codeGrantTestSetup($this);
    $pending = app(CreatorMcpOAuthConsentFlow::class)->begin(codeGrantBrowser($session), $params);
    $issuer = app(CreatorMcpPassportCodeIssuer::class);
    $issuer->complete(codeGrantBrowser($session), $pending['nonce'], $workspaceId);

    try {
        $issuer->complete(codeGrantBrowser($session), $pending['nonce'], $workspaceId);
        $this->fail('Consent nonce was replayed');
    } catch (HttpException $error) {
        expect($error->getStatusCode())->toBe(403);
    }
    expect(DB::table('oauth_auth_codes')->count())->toBe(1);
});

test('no public OAuth or MCP route is registered by the internal code issuer', function () {
    expect(Route::has('passport.authorizations.authorize'))->toBeFalse();
    expect(Route::has('passport.authorizations.approve'))->toBeFalse();
    expect(Route::has('passport.token'))->toBeFalse();
    expect(Route::has('linket.mcp'))->toBeFalse();
});


/**
 * The following tests exercise the real Passport/League code exchange
 * and resource-audience gate, not fabricated OAuth bearer strings.
 *
 * @return array{0:User,1:int,2:string,3:array<string,string>,4:string}
 */
function mcpExchangeTestCode($test): array
{
    [$creator, $workspaceId, $clientId, $params, $session] = codeGrantTestSetup($test);
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');
    $pending = app(CreatorMcpOAuthConsentFlow::class)->begin(codeGrantBrowser($session), $params);
    $response = app(CreatorMcpPassportCodeIssuer::class)
        ->complete(codeGrantBrowser($session), $pending['nonce'], $workspaceId);
    parse_str((string) parse_url($response->getHeaderLine('Location'), PHP_URL_QUERY), $query);

    return [$creator, $workspaceId, $clientId, $params, (string) $query['code']];
}

/** @return array<string,mixed> */
function mcpExchangeTokenResult(string $code, string $clientId, array $params): array
{
    $response = app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class)
        ->exchangeAuthorizationCode(
            $code,
            $clientId,
            $params['redirect_uri'],
            str_repeat('x', 43),
            $params['resource'],
        );

    expect($response->getStatusCode())->toBe(200);
    return json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
}

/** @param callable():mixed $action */
function mcpExchangeAssertDenied(callable $action): void
{
    try {
        $action();
        test()->fail('Untrusted OAuth input was accepted.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }
}

test('actual Passport authorization code exchanges with S256 into grant-bound access and refresh tokens', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $tokens = mcpExchangeTokenResult($code, $clientId, $params);

    expect($tokens['access_token'] ?? null)->toBeString()->not->toBeEmpty();
    expect($tokens['refresh_token'] ?? null)->toBeString()->not->toBeEmpty();
    expect($tokens['token_type'] ?? null)->toBe('Bearer');
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(1);
    expect(DB::table('oauth_refresh_tokens')->count())->toBe(1);

    expect(app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($tokens['access_token']))->toBe($workspaceId);
});

test('wrong PKCE verifier and authorization code replay cannot mint any second token', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $exchange = app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class);

    mcpExchangeAssertDenied(fn () => $exchange->exchangeAuthorizationCode(
        $code, $clientId, $params['redirect_uri'], str_repeat('z', 43), $params['resource'],
    ));
    expect(DB::table('oauth_access_tokens')->count())->toBe(0);

    mcpExchangeTokenResult($code, $clientId, $params);

    mcpExchangeAssertDenied(fn () => $exchange->exchangeAuthorizationCode(
        $code, $clientId, $params['redirect_uri'], str_repeat('x', 43), $params['resource'],
    ));
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(1);
});

test('refresh rotates actual Passport access and refresh credentials while preserving one workspace grant', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $tokens = mcpExchangeTokenResult($code, $clientId, $params);
    $oldTokenId = DB::table('creator_ai_mcp_oauth_token_bindings')->value('access_token_id');

    $response = app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class)
        ->refresh($tokens['refresh_token'], $clientId, $params['resource']);
    $newTokens = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);

    expect($newTokens['access_token'])->not->toBe($tokens['access_token']);
    expect($newTokens['refresh_token'])->not->toBe($tokens['refresh_token']);
    expect(DB::table('oauth_access_tokens')->where('id', $oldTokenId)->value('revoked'))->toBe(1);
    expect(DB::table('oauth_refresh_tokens')->where('access_token_id', $oldTokenId)->value('revoked'))->toBe(1);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(2);
    expect(app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($newTokens['access_token']))->toBe($workspaceId);

    mcpExchangeAssertDenied(fn () => app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class)
        ->refresh($tokens['refresh_token'], $clientId, $params['resource']));
});

test('revoke or expired Pro prevents fresh Passport tokens and invalidates existing bearer access', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $tokens = mcpExchangeTokenResult($code, $clientId, $params);
    $grantId = DB::table('creator_ai_mcp_oauth_token_bindings')->value('connection_id');

    app(\App\CreatorAi\Services\CreatorMcpConnectionRegistry::class)->revoke($creator, $grantId);

    mcpExchangeAssertDenied(fn () => app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class)
        ->refresh($tokens['refresh_token'], $clientId, $params['resource']));
    mcpExchangeAssertDenied(fn () => app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($tokens['access_token']));

    expect(DB::table('oauth_access_tokens')->where('revoked', true)->count())->toBe(1);
    expect(DB::table('oauth_refresh_tokens')->where('revoked', true)->count())->toBe(1);
});

test('signed bearer must match configured issuer and MCP audience, and tampering fails validation', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $tokens = mcpExchangeTokenResult($code, $clientId, $params);
    $bearer = app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class);

    config()->set('creator_ai.oauth_issuer', 'https://wrong-issuer.example.test');
    mcpExchangeAssertDenied(fn () => $bearer->workspaceForBearer($tokens['access_token']));
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');

    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/another-mcp');
    mcpExchangeAssertDenied(fn () => $bearer->workspaceForBearer($tokens['access_token']));
    config()->set('creator_ai.mcp_resource_url', $params['resource']);

    $altered = substr($tokens['access_token'], 0, -1).
        (substr($tokens['access_token'], -1) === 'A' ? 'B' : 'A');
    mcpExchangeAssertDenied(fn () => $bearer->workspaceForBearer($altered));

    expect($bearer->workspaceForBearer($tokens['access_token']))->toBe($workspaceId);
});


test('a new request lifecycle can issue and bind a second approved code using the existing Passport singleton', function () {
    [$creator, $workspaceId, $clientId, $params, $session] = codeGrantTestSetup($this);
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');

    $issueCode = function () use ($session, $params, $workspaceId): string {
        $pending = app(CreatorMcpOAuthConsentFlow::class)->begin(codeGrantBrowser($session), $params);
        $response = app(CreatorMcpPassportCodeIssuer::class)
            ->complete(codeGrantBrowser($session), $pending['nonce'], $workspaceId);
        parse_str((string) parse_url($response->getHeaderLine('Location'), PHP_URL_QUERY), $query);

        return (string) $query['code'];
    };

    $firstCode = $issueCode();
    $firstTokens = mcpExchangeTokenResult($firstCode, $clientId, $params);
    expect(app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($firstTokens['access_token']))->toBe($workspaceId);

    // Laravel Octane/queue-style lifecycle reset: Passport's AuthorizationServer
    // singleton still holds its repository instances after scoped instances flush.
    app()->forgetScopedInstances();

    $secondCode = $issueCode();
    $secondTokens = mcpExchangeTokenResult($secondCode, $clientId, $params);

    expect(DB::table('creator_ai_mcp_oauth_code_bindings')->count())->toBe(2);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(2);
    expect(app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($secondTokens['access_token']))->toBe($workspaceId);
});

test('refresh issuance after a new request lifecycle binds the rotated token to the original workspace', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $tokens = mcpExchangeTokenResult($code, $clientId, $params);

    app()->forgetScopedInstances();

    $response = app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class)
        ->refresh($tokens['refresh_token'], $clientId, $params['resource']);

    expect($response->getStatusCode())->toBe(200);
    $rotated = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);

    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(2);
    expect(app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($rotated['access_token']))->toBe($workspaceId);
});


test('an expired access record can rotate a still-valid unrevoked refresh token for its original workspace', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $tokens = mcpExchangeTokenResult($code, $clientId, $params);
    $oldAccessId = DB::table('creator_ai_mcp_oauth_token_bindings')->value('access_token_id');

    // Access-token expiry is normal and independent of the longer-lived
    // refresh credential. Simulate database-side access expiration without
    // revoking the separate refresh credential or creator workspace consent.
    DB::table('oauth_access_tokens')->where('id', $oldAccessId)
        ->update(['expires_at' => now()->subSecond()]);

    expect((int) DB::table('oauth_access_tokens')->where('id', $oldAccessId)->value('revoked'))->toBe(0);
    expect((int) DB::table('oauth_refresh_tokens')->where('access_token_id', $oldAccessId)->value('revoked'))->toBe(0);

    mcpExchangeAssertDenied(fn () => app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($tokens['access_token']));

    $response = app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class)
        ->refresh($tokens['refresh_token'], $clientId, $params['resource']);
    expect($response->getStatusCode())->toBe(200);

    $rotated = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR);
    expect($rotated['access_token'])->not->toBe($tokens['access_token']);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(2);
    expect(app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($rotated['access_token']))->toBe($workspaceId);
    expect((int) DB::table('oauth_access_tokens')->where('id', $oldAccessId)->value('revoked'))->toBe(1);
    expect((int) DB::table('oauth_refresh_tokens')->where('access_token_id', $oldAccessId)->value('revoked'))->toBe(1);
});

test('a revoked access token cannot be refreshed even when the refresh credential itself is not revoked', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $tokens = mcpExchangeTokenResult($code, $clientId, $params);
    $oldAccessId = DB::table('creator_ai_mcp_oauth_token_bindings')->value('access_token_id');

    DB::table('oauth_access_tokens')->where('id', $oldAccessId)->update(['revoked' => true]);
    expect((int) DB::table('oauth_refresh_tokens')->where('access_token_id', $oldAccessId)->value('revoked'))->toBe(0);

    mcpExchangeAssertDenied(fn () => app(\App\CreatorAi\Auth\CreatorMcpPassportTokenExchange::class)
        ->refresh($tokens['refresh_token'], $clientId, $params['resource']));

    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(1);
});


test('HTTP token endpoint stays absent until the independent deployment flag is on', function () {
    expect(config('creator_ai.features.mcp_http_token'))->toBeFalse();
    expect(Route::has('creator-ai.oauth.token'))->toBeFalse();
    expect(Route::has('passport.token'))->toBeFalse();
});

test('HTTPS form token request redeems a consent-bound PKCE code and rotates refresh without a web session', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    config()->set('creator_ai.features.mcp_http_token', true);
    require base_path('routes/creator-ai-mcp-oauth.php');

    // Refresh names after this test dynamically registers routes post-boot.
    Route::getRoutes()->refreshNameLookups();
    $route = Route::getRoutes()->getByName('creator-ai.oauth.token');
    expect($route)->not->toBeNull();
    expect($route->excludedMiddleware())->toContain('web');

    $form = [
        'grant_type' => 'authorization_code', 'client_id' => $clientId,
        'code' => $code, 'code_verifier' => str_repeat('x', 43),
        'redirect_uri' => $params['redirect_uri'], 'resource' => $params['resource'],
    ];
    $headers = ['Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json'];
    $firstResponse = $this->post('https://linket.example.test/oauth/linket/token', $form, $headers);
    $firstResponse->assertOk()->assertJsonPath('token_type', 'Bearer');
    expect($firstResponse->headers->get('Cache-Control'))->toContain('no-store');
    $first = $firstResponse->json();

    $refresh = [
        'grant_type' => 'refresh_token', 'client_id' => $clientId,
        'refresh_token' => $first['refresh_token'], 'resource' => $params['resource'],
    ];
    $secondResponse = $this->post('https://linket.example.test/oauth/linket/token', $refresh, $headers);
    $secondResponse->assertOk()->assertJsonPath('token_type', 'Bearer');
    $second = $secondResponse->json();
    expect($second['access_token'])->not->toBe($first['access_token']);
    expect(app(\App\CreatorAi\Auth\CreatorMcpPassportBearerAccess::class)
        ->workspaceForBearer($second['access_token']))->toBe($workspaceId);

    $this->post('https://linket.example.test/oauth/linket/token', $refresh, $headers)
        ->assertStatus(400)->assertJsonPath('error', 'invalid_grant');
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(2);
});

test('HTTP token endpoint rejects wrong PKCE, resource, client and unsupported grants without issuing tokens', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    config()->set('creator_ai.features.mcp_http_token', true);
    require base_path('routes/creator-ai-mcp-oauth.php');

    $form = [
        'grant_type' => 'authorization_code', 'client_id' => $clientId,
        'code' => $code, 'code_verifier' => str_repeat('x', 43),
        'redirect_uri' => $params['redirect_uri'], 'resource' => $params['resource'],
    ];
    $headers = ['Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json'];
    foreach ([
        [...$form, 'code_verifier' => str_repeat('z', 43)],
        [...$form, 'resource' => 'https://linket.example.test/foreign'],
        [...$form, 'client_id' => (string) Str::uuid()],
        [...$form, 'grant_type' => 'client_credentials'],
        [...$form, 'scope' => 'admin'],
    ] as $invalid) {
        $this->post('https://linket.example.test/oauth/linket/token', $invalid, $headers)
            ->assertStatus(400);
    }
    expect(DB::table('oauth_access_tokens')->count())->toBe(0);
    $this->post('https://linket.example.test/oauth/linket/token', $form, $headers)->assertOk();
});


test('HTTP token endpoint rejects unexpected query parameters without consuming the authorization code', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    config()->set('creator_ai.features.mcp_http_token', true);
    require base_path('routes/creator-ai-mcp-oauth.php');

    $form = [
        'grant_type' => 'authorization_code', 'client_id' => $clientId,
        'code' => $code, 'code_verifier' => str_repeat('x', 43),
        'redirect_uri' => $params['redirect_uri'], 'resource' => $params['resource'],
    ];
    $headers = ['Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json'];

    $this->post('https://linket.example.test/oauth/linket/token?scope=admin', $form, $headers)
        ->assertStatus(400)->assertJsonPath('error', 'invalid_request');
    expect(DB::table('oauth_access_tokens')->count())->toBe(0);

    // Rejected requests must not burn an otherwise valid, one-use PKCE code.
    $this->post('https://linket.example.test/oauth/linket/token', $form, $headers)
        ->assertOk()->assertJsonPath('token_type', 'Bearer');
});


/**
 * Real HTTP MCP integration. No fake JWTs: these tests redeem a genuine
 * consent-bound Passport code and exercise Laravel MCP's transport.
 */
function mcpRemoteRoutes(bool $discovery = true, bool $server = true): void
{
    config()->set('creator_ai.features.mcp_http_discovery', $discovery);
    config()->set('creator_ai.features.mcp_http_server', $server);
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');
    config()->set('app.url', 'https://linket.example.test');

    require base_path('routes/creator-ai-mcp-oauth.php');
    Route::getRoutes()->refreshNameLookups();
}

function mcpRemoteMessage(string $method, ?array $params = null): array
{
    return [
        'jsonrpc' => '2.0', 'id' => 7, 'method' => $method,
        'params' => [
            ...($params ?? []),
            '_meta' => [
                'io.modelcontextprotocol/protocolVersion' => '2026-07-28',
                'io.modelcontextprotocol/clientCapabilities' => (object) [],
            ],
        ],
    ];
}

function mcpRemoteHeaders(string $method, ?string $token = null, ?string $name = null): array
{
    return [
        'MCP-Protocol-Version' => '2026-07-28',
        'Mcp-Method' => $method,
        ...($name !== null ? ['Mcp-Name' => $name] : []),
        'Accept' => 'application/json, text/event-stream',
        ...($token !== null ? ['Authorization' => 'Bearer '.$token] : []),
    ];
}

test('remote MCP and OAuth discovery routes are absent unless separately enabled', function () {
    expect(config('creator_ai.features.mcp_http_discovery'))->toBeFalse();
    expect(config('creator_ai.features.mcp_http_server'))->toBeFalse();
    expect(Route::has('creator-ai.oauth.resource-metadata'))->toBeFalse();
    expect(Route::has('creator-ai.oauth.server-metadata'))->toBeFalse();
    expect(Route::has('creator-ai.mcp.http'))->toBeFalse();
    expect(Route::has('mcp.oauth.register'))->toBeFalse();
});

test('HTTPS OAuth metadata advertises exactly one resource and restricted public PKCE endpoints', function () {
    mcpRemoteRoutes(true, false);

    $this->get('https://linket.example.test/.well-known/oauth-protected-resource/mcp')
        ->assertOk()
        ->assertJsonPath('resource', 'https://linket.example.test/mcp')
        ->assertJsonPath('authorization_servers.0', 'https://linket.example.test')
        ->assertJsonPath('scopes_supported.0', 'mcp:use')
        ->assertJsonMissingPath('registration_endpoint');

    $this->get('https://linket.example.test/.well-known/oauth-authorization-server')
        ->assertOk()
        ->assertJsonPath('issuer', 'https://linket.example.test')
        ->assertJsonPath('authorization_endpoint', 'https://linket.example.test/oauth/linket/authorize')
        ->assertJsonPath('token_endpoint', 'https://linket.example.test/oauth/linket/token')
        ->assertJsonPath('grant_types_supported.0', 'authorization_code')
        ->assertJsonPath('grant_types_supported.1', 'refresh_token')
        ->assertJsonPath('code_challenge_methods_supported.0', 'S256')
        ->assertJsonPath('token_endpoint_auth_methods_supported.0', 'none')
        ->assertJsonMissingPath('registration_endpoint');

    expect(Route::has('mcp.oauth.register'))->toBeFalse();
    expect(Route::has('passport.token'))->toBeFalse();
    $this->get('https://foreign.example.test/.well-known/oauth-authorization-server')->assertStatus(403);
    $this->get('http://linket.example.test/.well-known/oauth-protected-resource/mcp')->assertStatus(403);
});

test('MCP HTTP transport challenges missing and malformed bearer credentials before listing tools', function () {
    mcpRemoteRoutes(true, true);

    $method = 'tools/list';
    $message = mcpRemoteMessage($method);
    $unauth = $this->postJson('https://linket.example.test/mcp', $message, mcpRemoteHeaders($method));
    $unauth->assertStatus(401);
    expect($unauth->headers->get('WWW-Authenticate'))
        ->toContain('resource_metadata="https://linket.example.test/.well-known/oauth-protected-resource/mcp"');

    $this->postJson('https://linket.example.test/mcp', $message, [
        ...mcpRemoteHeaders($method),
        'Authorization' => 'Bearer fake.unsig.ned',
    ])->assertStatus(401);

    $this->postJson('https://linket.example.test/mcp', $message, [
        ...mcpRemoteHeaders($method),
        'Cookie' => 'laravel_session=bad',
    ])->assertStatus(401);

    $this->postJson('https://linket.example.test/mcp?access_token=abc', $message, mcpRemoteHeaders($method))
        ->assertStatus(400);
});

test('signed creator bearer lists only Linket read tools and invokes sales in its live workspace', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $token = mcpExchangeTokenResult($code, $clientId, $params)['access_token'];
    mcpRemoteRoutes(true, true);

    $listing = $this->postJson(
        'https://linket.example.test/mcp',
        mcpRemoteMessage('tools/list'),
        mcpRemoteHeaders('tools/list', $token),
    );
    $listing->assertOk();
    $names = array_column($listing->json('result.tools'), 'name');
    expect($names)->toEqualCanonicalizing([
        'sales_summary', 'sales_trends', 'order_insights', 'list_orders', 'product_performance',
    ]);
    expect($listing->json('result.tools.0.annotations.readOnlyHint'))->toBeTrue();

    $args = ['from' => now()->subDays(7)->toDateString(), 'to' => now()->toDateString()];
    $called = $this->postJson(
        'https://linket.example.test/mcp',
        mcpRemoteMessage('tools/call', ['name' => 'sales_summary', 'arguments' => $args]),
        mcpRemoteHeaders('tools/call', $token, 'sales_summary'),
    );
    $called->assertOk();
    expect($called->json('result.isError') ?? false)->toBeFalse();
    expect((string) $called->json('result.content.0.text'))->toContain('ETB');

    $this->postJson(
        'https://linket.example.test/mcp',
        mcpRemoteMessage('tools/call', [
            'name' => 'sales_summary',
            'arguments' => [...$args, 'workspace_id' => $workspaceId],
        ]),
        mcpRemoteHeaders('tools/call', $token, 'sales_summary'),
    )->assertOk()->assertJsonPath('result.isError', true);
});

test('MCP bearer immediately loses access after disconnect and Verify.et Pro expiry', function () {
    [$creator, $workspaceId, $clientId, $params, $code] = mcpExchangeTestCode($this);
    $token = mcpExchangeTokenResult($code, $clientId, $params)['access_token'];
    mcpRemoteRoutes(true, true);
    $message = mcpRemoteMessage('tools/list');
    $headers = mcpRemoteHeaders('tools/list', $token);

    $this->postJson('https://linket.example.test/mcp', $message, $headers)->assertOk();
    \Common\Billing\Subscription::query()
        ->where('user_id', $creator->id)->where('gateway_name', 'verify_et')
        ->update(['gateway_status' => 'expired']);
    $this->postJson('https://linket.example.test/mcp', $message, $headers)->assertStatus(401);

    \Common\Billing\Subscription::query()
        ->where('user_id', $creator->id)->where('gateway_name', 'verify_et')
        ->update(['gateway_status' => 'active']);
    $grantId = DB::table('creator_ai_mcp_oauth_token_bindings')->value('connection_id');
    app(\App\CreatorAi\Services\CreatorMcpConnectionRegistry::class)->revoke($creator, $grantId);
    $this->postJson('https://linket.example.test/mcp', $message, $headers)->assertStatus(401);
});
