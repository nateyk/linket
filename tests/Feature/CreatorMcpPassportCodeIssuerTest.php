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
