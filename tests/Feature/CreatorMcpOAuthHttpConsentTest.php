<?php

use App\CreatorAi\Auth\CreatorMcpOAuthConsentFlow;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function mcpBrowserRoutes(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.mcp', true);
    config()->set('creator_ai.features.mcp_oauth', true);
    config()->set('creator_ai.features.mcp_http_oauth', true);
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');
    config()->set('app.url', 'https://linket.example.test');
    config()->set('session.driver', 'array');

    require base_path('routes/creator-ai-mcp-oauth.php');
}

/** @return array{0:User,1:int,2:array<string,string>} */
function mcpBrowserCreator(): array
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace)->createPersonalWorkspace($user);
    $product = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $product->id)
        ->where('currency', 'ETB')->firstOrFail();

    Subscription::query()->create([
        'user_id' => $user->id,
        'product_id' => $product->id,
        'price_id' => $price->id,
        'gateway_name' => 'verify_et',
        'gateway_status' => 'active',
        'renews_at' => now()->addMonth(),
    ]);
    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $user->id,
        'product_id' => $product->id,
        'price_id' => $price->id,
        'amount_cents' => 50000,
        'status' => 'paid',
        'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(),
        'subscription_period_end' => now()->addMonth(),
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'MCP-HTTP-'.Str::upper(Str::random(16)),
        'payable_type' => ProSubscriptionPayment::class,
        'payable_id' => $payment->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 50000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now()->subDay(),
    ]);

    $clientId = (string) Str::uuid();
    DB::table('oauth_clients')->insert([
        'id' => $clientId,
        'owner_type' => null,
        'owner_id' => null,
        'name' => 'Registered MCP Client',
        'secret' => null,
        'provider' => 'creator_mcp_users',
        'redirect_uris' => json_encode(['https://client.example.test/oauth/callback']),
        'grant_types' => json_encode(['authorization_code', 'refresh_token']),
        'revoked' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $verifier = str_repeat('x', 43);
    return [$user, (int) $workspace->getKey(), [
        'client_id' => $clientId,
        'redirect_uri' => 'https://client.example.test/oauth/callback',
        'response_type' => 'code',
        'scope' => 'mcp:use',
        'state' => str_repeat('s', 40),
        'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
        'code_challenge_method' => 'S256',
        'resource' => 'https://linket.example.test/mcp',
    ]];
}

/** @return array{0:string,1:string} */
function mcpBrowserCredentials(string $html): array
{
    preg_match('/name="_token" value="([^"]+)"/', $html, $csrf);
    preg_match('/name="nonce" value="([^"]+)"/', $html, $nonce);
    expect($csrf[1] ?? null)->toBeString()->not->toBeEmpty();
    expect($nonce[1] ?? null)->toBeString()->toHaveLength(48);
    return [$csrf[1], $nonce[1]];
}

test('a separate default-off HTTP feature flag leaves all Linket OAuth browser routes unregistered', function () {
    expect(config('creator_ai.features.mcp_http_oauth'))->toBeFalse();
    expect(Route::has('creator-ai.oauth.authorize'))->toBeFalse();
    expect(Route::has('creator-ai.oauth.approve'))->toBeFalse();
    expect(Route::has('creator-ai.oauth.deny'))->toBeFalse();
    expect(Route::has('passport.authorizations.authorize'))->toBeFalse();
    expect(Route::has('passport.token'))->toBeFalse();
});

test('guarded browser route rejects insecure transport and unauthenticated requests before starting consent', function () {
    mcpBrowserRoutes();
    [, , $parameters] = mcpBrowserCreator();

    $this->get('http://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters))
        ->assertStatus(403);
    $this->get('https://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters))
        ->assertRedirect();

    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
    expect(DB::table('oauth_auth_codes')->count())->toBe(0);
});

test('authenticated verified-Pro creator sees explicit workspace consent without automatic grant', function () {
    mcpBrowserRoutes();
    [$creator, $workspaceId, $parameters] = mcpBrowserCreator();
    $this->actingAs($creator, 'web');

    $response = $this->get('https://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters));
    $response->assertOk()->assertSee('Registered MCP Client')->assertSee('Approve connection');
    [$csrf, $nonce] = mcpBrowserCredentials($response->getContent());
    expect($nonce)->toHaveLength(48);
    expect($csrf)->not->toBeEmpty();
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
    expect(DB::table('oauth_auth_codes')->count())->toBe(0);
});

test('HTTPS browser approve requires selected workspace and emits real Passport authorization code, then forbids nonce replay', function () {
    mcpBrowserRoutes();
    [$creator, $workspaceId, $parameters] = mcpBrowserCreator();
    $this->actingAs($creator, 'web');

    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $private);
    config()->set('passport.private_key', $private);
    config()->set('passport.public_key', openssl_pkey_get_details($key)['key']);

    $response = $this->get('https://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters));
    $response->assertOk();
    [$csrf, $nonce] = mcpBrowserCredentials($response->getContent());

    $post = ['_token' => $csrf, 'nonce' => $nonce, 'workspace_id' => $workspaceId];
    $approve = $this->post('https://linket.example.test/oauth/linket/authorize/approve', $post);
    $approve->assertStatus(302)->assertHeader('Cache-Control', 'no-store');
    $redirect = $approve->headers->get('Location');
    expect($redirect)->toStartWith($parameters['redirect_uri'].'?');
    parse_str((string) parse_url($redirect, PHP_URL_QUERY), $query);
    expect($query['state'] ?? null)->toBe($parameters['state']);
    expect($query['code'] ?? null)->toBeString()->not->toBeEmpty();
    expect(DB::table('creator_ai_mcp_oauth_code_bindings')->count())->toBe(1);

    $this->post('https://linket.example.test/oauth/linket/authorize/approve', $post)
        ->assertStatus(403);
    expect(DB::table('oauth_auth_codes')->count())->toBe(1);
});

test('HTTPS consent denial consumes nonce and never issues a Passport grant or token', function () {
    mcpBrowserRoutes();
    [$creator, $workspaceId, $parameters] = mcpBrowserCreator();
    $this->actingAs($creator, 'web');

    $response = $this->get('https://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters));
    $response->assertOk();
    [$csrf, $nonce] = mcpBrowserCredentials($response->getContent());

    $post = ['_token' => $csrf, 'nonce' => $nonce];
    $this->post('https://linket.example.test/oauth/linket/authorize/deny', $post)
        ->assertOk()->assertSee('Connection denied');

    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
    expect(DB::table('oauth_auth_codes')->count())->toBe(0);
    $this->post('https://linket.example.test/oauth/linket/authorize/approve', [
        ...$post, 'workspace_id' => $workspaceId,
    ])->assertStatus(403);
});
