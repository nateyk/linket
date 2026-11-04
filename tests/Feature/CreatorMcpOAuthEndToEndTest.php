<?php

use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use Common\Billing\Subscription;
use Common\Files\FileEntry;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\InteractsWithCreatorMcpOAuth;

uses(DatabaseTransactions::class, InteractsWithCreatorMcpOAuth::class);

test('two creators complete HTTP consent PKCE refresh and isolated MCP reporting with distinct clients', function () {
    $this->enableMcpOAuth();
    [$alice, $aliceWorkspace, $aliceParameters] = $this->mcpCreator();
    [$bob, $bobWorkspace, $bobParameters] = $this->mcpCreator();
    $products = [];
    $privateDownloads = [];
    foreach ([[$alice, $aliceWorkspace, 12300], [$bob, $bobWorkspace, 98700]] as [$creator, $workspace, $amount]) {
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace, 'user_id' => $creator->id, 'title' => 'Guide for '.$creator->id,
            'price_cents' => $amount, 'currency' => 'ETB', 'status' => 'approved', 'type' => 'digital',
        ]);
        $products[] = $product;
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'digital_product_id' => $product->id,
            'currency' => 'ETB', 'gross_amount_cents' => $amount, 'creator_earnings_cents' => $amount,
            'commission_bps' => 0, 'platform_fee_cents' => 0, 'payment_gateway' => 'verify_et', 'status' => 'paid',
            'created_at' => '2026-10-18 10:00:00', 'paid_at' => '2026-10-18 10:00:00',
            'buyer_name' => 'SYNTHETIC PRIVATE BUYER', 'buyer_email' => 'private-buyer@example.test',
            'payment_reference' => 'SYNTHETIC-PAYMENT-CREDENTIAL-'.$creator->id, 'payment_account_snapshot' => '1000999888777666',
            'payment_access_token_hash' => hash('sha256', 'synthetic-paid-download-credential'),
        ]);
        $file = FileEntry::query()->create([
            'name' => 'private-guide.pdf', 'file_name' => Str::random(16).'.pdf',
            'mime' => 'application/pdf', 'extension' => 'pdf', 'type' => 'file', 'file_size' => 100,
            'workspace_id' => $workspace, 'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $entitlement = DownloadEntitlement::query()->create([
            'storefront_order_id' => $order->id, 'file_entry_id' => $file->id,
            'token' => (string) Str::uuid(), 'download_limit' => 10, 'expires_at' => now()->addDay(),
        ]);
        $privateDownloads[] = $entitlement->token;
    }

    $aliceCode = $this->mcpConsent($alice, $aliceWorkspace, $aliceParameters);
    $bobCode = $this->mcpConsent($bob, $bobWorkspace, $bobParameters);
    $aliceTokens = $this->mcpRedeem($aliceCode, $aliceParameters)->assertOk()->json();
    $bobTokens = $this->mcpRedeem($bobCode, $bobParameters)->assertOk()->json();
    $aliceSuccessor = $this->mcpRefresh($aliceTokens['refresh_token'], $aliceParameters)->assertOk()->json();
    $bobSuccessor = $this->mcpRefresh($bobTokens['refresh_token'], $bobParameters)->assertOk()->json();

    // The browser is still Bob's; each report must use the signed bearer instead.
    foreach ([[$aliceSuccessor, 12300, $products[1]], [$bobSuccessor, 98700, $products[0]]] as [$tokens, $amount, $foreignProduct]) {
        foreach (['get_sales_summary', 'get_sales_trends', 'get_order_insights', 'list_orders', 'get_product_performance'] as $tool) {
            $response = $this->mcpCall($tokens['access_token'], $tool)->assertOk();
            expect($response->json('result.isError') ?? false)->toBeFalse();
            $report = json_decode($response->json('result.content.0.text'), true, 512, JSON_THROW_ON_ERROR);
            $revenue = match ($tool) {
                'get_sales_trends' => $report['points'][0]['verified_revenue_cents'],
                'get_product_performance' => $report['items'][0]['verified_revenue_cents'],
                default => $report['verified_revenue_cents'],
            };
            expect($revenue)->toBe($amount);
            foreach (['SYNTHETIC PRIVATE BUYER', 'private-buyer@example.test', 'SYNTHETIC-PAYMENT-CREDENTIAL', '1000999888777666', '1000123456789', 'synthetic-paid-download-credential', 'payment_access_token_hash', 'download_url', 'storefront/downloads/', $foreignProduct->title, ...$privateDownloads] as $private) {
                expect($response->getContent())->not->toContain($private);
            }
        }
    }
    $this->mcpCall($aliceTokens['access_token'])->assertUnauthorized();
    $this->mcpCall($bobTokens['access_token'])->assertUnauthorized();
    $this->mcpRedeem($aliceCode, $aliceParameters)->assertBadRequest()->assertExactJson(['error' => 'invalid_grant']);
    $this->mcpRefresh($aliceTokens['refresh_token'], $aliceParameters)->assertBadRequest()->assertExactJson(['error' => 'invalid_grant']);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->whereIn('creator_id', $this->mcpFixtureCreators)->count())->toBe(4);
});

test('HTTP code exchange rejects another registered client resource redirect or verifier without consuming the code', function (string $attack) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    [, , $otherParameters] = $this->mcpCreator();
    $code = $this->mcpConsent($creator, $workspace, $parameters);
    $overrides = match ($attack) {
        'client' => ['client_id' => $otherParameters['client_id']],
        'resource' => ['resource' => 'https://linket.example.test/other-mcp'],
        'redirect' => ['redirect_uri' => $otherParameters['redirect_uri']],
        'verifier' => ['code_verifier' => str_repeat('z', 43)],
    };

    $this->mcpRedeem($code, $parameters, $overrides)->assertBadRequest()->assertExactJson(['error' => 'invalid_grant']);

    expect(DB::table('oauth_access_tokens')->whereIn('user_id', $this->mcpFixtureCreators)->count())->toBe(0);
    $this->mcpRedeem($code, $parameters)->assertOk();
})->with(['client', 'resource', 'redirect', 'verifier']);

test('HTTP consent rejects a foreign workspace or a creator switch before issuing credentials', function (string $attack) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    [$other, $foreignWorkspace] = $this->mcpCreator();
    $credentials = $this->mcpBeginConsent($creator, $parameters);
    if ($attack === 'creator') {
        $this->actingAs($other, 'web');
    }

    $this->post('https://linket.example.test/oauth/linket/authorize/approve', [
        ...$credentials, 'workspace_id' => $attack === 'workspace' ? $foreignWorkspace : $workspace,
    ])->assertForbidden();

    expect(DB::table('oauth_auth_codes')->whereIn('user_id', $this->mcpFixtureCreators)->count())->toBe(0);
    expect(DB::table('creator_ai_mcp_connections')->whereIn('creator_id', $this->mcpFixtureCreators)->count())->toBe(0);
})->with(['workspace', 'creator']);

test('MCP rejects a correctly signed token with mismatched OAuth claims', function (string $claim) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    [$other, , $otherParameters] = $this->mcpCreator();
    $token = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json('access_token');
    $segments = explode('.', $token);
    $claims = json_decode(base64_decode(strtr($segments[1], '-_', '+/')), true, 512, JSON_THROW_ON_ERROR);
    $claims[$claim === 'resource' ? 'aud' : $claim] = match ($claim) {
        'iss' => 'https://foreign.example.test',
        'aud' => [$otherParameters['client_id'], $parameters['resource']],
        'resource' => [$parameters['client_id'], 'https://linket.example.test/foreign'],
        'scopes' => ['mcp:use', 'admin'], 'sub' => (string) $other->id,
        'exp' => time() - 60, 'jti' => str_repeat('0', 80),
    };
    $encode = static fn (string $value): string => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    $segments[1] = $encode(json_encode($claims, JSON_THROW_ON_ERROR));
    $signed = $segments[0].'.'.$segments[1];
    openssl_sign($signed, $signature, config('passport.private_key'), OPENSSL_ALGO_SHA256);

    $this->mcpCall($signed.'.'.$encode($signature))->assertUnauthorized()->assertExactJson(['error' => 'invalid_token']);
    $this->mcpCall($token)->assertOk();
})->with(['iss', 'aud', 'resource', 'scopes', 'sub', 'exp', 'jti']);

test('MCP and refresh recheck live consent entitlement membership client and bearer revocation', function (string $revocation) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    [$other, $otherWorkspace, $otherParameters] = $this->mcpCreator();
    $tokens = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json();
    $otherTokens = $this->mcpRedeem($this->mcpConsent($other, $otherWorkspace, $otherParameters), $otherParameters)->assertOk()->json();
    $this->mcpCall($tokens['access_token'])->assertOk();

    if ($revocation === 'membership') {
        DB::table('workspace_user')->where('workspace_id', $workspace)->where('user_id', $creator->id)->delete();
    }
    if ($revocation === 'consent') {
        $this->withHeader('Referer', 'https://linket.example.test')
            ->withHeader('X-CSRF-TOKEN', session()->token());
    }

    match ($revocation) {
        'consent' => $this->actingAs($creator, 'web')->deleteJson('/api/v1/creator-ai/mcp-connections/'.DB::table('creator_ai_mcp_connections')->where('creator_id', $creator->id)->value('id'))->assertNoContent(),
        'pro' => Subscription::query()->where('user_id', $creator->id)->update(['renews_at' => now()->subSecond(), 'ends_at' => now()->subSecond()]),
        'payment' => ProSubscriptionPayment::query()->where('creator_id', $creator->id)->update(['subscription_period_end' => now()->subSecond()]),
        'membership' => Workspace::query()->whereKey($workspace)->update(['owner_id' => $other->id]),
        'client' => DB::table('oauth_clients')->where('id', $parameters['client_id'])->update(['revoked' => true]),
        'bearer' => DB::table('oauth_access_tokens')->where('user_id', $creator->id)->update(['revoked' => true]),
    };

    $this->mcpCall($tokens['access_token'])->assertUnauthorized()->assertExactJson(['error' => 'invalid_token']);
    $this->mcpRefresh($tokens['refresh_token'], $parameters)->assertBadRequest()->assertExactJson(['error' => 'invalid_grant']);
    $this->mcpCall($otherTokens['access_token'])->assertOk();
    expect(DB::table('oauth_access_tokens')->whereIn('user_id', $this->mcpFixtureCreators)->count())->toBe(2);
})->with(['consent', 'pro', 'payment', 'membership', 'client', 'bearer']);

test('MCP ignores browser identity and refuses Sanctum cookies query credentials and forged bearers', function (string $attack) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $token = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json('access_token');
    $credential = match ($attack) {
        'session', 'query' => null,
        'sanctum' => $creator->createToken('Synthetic MCP isolation test')->plainTextToken,
        'cookie' => $token, 'malformed' => 'fake.unsig.ned',
        'forged' => substr($token, 0, strrpos($token, '.') + 1).str_repeat('a', 342),
    };

    $response = $this->mcpCall($credential,
        headers: $attack === 'cookie' ? ['Cookie' => 'laravel_session=synthetic'] : [],
        query: $attack === 'query' ? '?access_token='.urlencode($token) : '',
    );

    $response->assertStatus($attack === 'query' ? 400 : 401);
    expect($response->getContent())->not->toContain($token);
    $this->mcpCall($token)->assertOk();
})->with(['session', 'sanctum', 'cookie', 'query', 'malformed', 'forged']);

test('MCP rejects caller supplied workspace or creator arguments even with a valid signed bearer', function (string $argument) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    [$other, $otherWorkspace] = $this->mcpCreator();
    $token = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json('access_token');

    $this->mcpCall($token, arguments: [$argument => $argument === 'workspace_id' ? $otherWorkspace : $other->id])
        ->assertOk()->assertJsonPath('result.isError', true);
})->with(['workspace_id', 'creator_id']);

test('production consent fails closed before session handling when its effective lock store is unsafe', function (string $store) {
    $this->enableMcpOAuth();
    [$creator, , $parameters] = $this->mcpCreator();
    $this->actingAs($creator, 'web');
    config()->set('session.driver', 'file');
    config()->set('cache.default', 'file');
    config()->set('session.block_store', $store);
    app()->instance('env', 'production');

    try {
        $this->get('https://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters))
            ->assertServiceUnavailable();
    } finally {
        app()->instance('env', 'testing');
        \Illuminate\Http\Request::setTrustedHosts([]);
    }

    expect(DB::table('creator_ai_mcp_connections')->whereIn('creator_id', $this->mcpFixtureCreators)->count())->toBe(0);
    expect(DB::table('oauth_auth_codes')->whereIn('user_id', $this->mcpFixtureCreators)->count())->toBe(0);
})->with(['array', 'unconfigured-oauth-lock-store']);

test('MCP reads do not consume the separate OAuth token endpoint rate limit', function () {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $tokens = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json();
    for ($read = 0; $read < 11; $read++) {
        $this->mcpCall($tokens['access_token'])->assertOk();
    }

    $this->mcpRefresh($tokens['refresh_token'], $parameters)->assertOk()->assertJsonPath('token_type', 'Bearer');
});

test('HTTP refresh rejects a different registered client or resource without burning the credential', function (string $attack) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    [, , $otherParameters] = $this->mcpCreator();
    $tokens = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json();
    $invalid = [...$parameters, ...($attack === 'client'
        ? ['client_id' => $otherParameters['client_id']]
        : ['resource' => 'https://linket.example.test/foreign'])];

    $this->mcpRefresh($tokens['refresh_token'], $invalid)->assertBadRequest()->assertExactJson(['error' => 'invalid_grant']);

    expect(DB::table('oauth_access_tokens')->whereIn('user_id', $this->mcpFixtureCreators)->count())->toBe(1);
    $this->mcpCall($tokens['access_token'])->assertOk();
    $this->mcpRefresh($tokens['refresh_token'], $parameters)->assertOk();
})->with(['client', 'resource']);

test('failed Passport persistence rolls back code consumption or refresh revocation and all successor records', function (string $grant) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $code = $this->mcpConsent($creator, $workspace, $parameters);
    $tokens = $grant === 'refresh_token' ? $this->mcpRedeem($code, $parameters)->assertOk()->json() : null;
    $failNextRefreshWrite = true;
    DB::connection()->beforeExecuting(function (string $query) use (&$failNextRefreshWrite): void {
        if ($failNextRefreshWrite && str_starts_with($query, 'insert into `oauth_refresh_tokens`')) {
            $failNextRefreshWrite = false;
            throw new RuntimeException('Synthetic refresh persistence failure');
        }
    });

    ($tokens === null ? $this->mcpRedeem($code, $parameters) : $this->mcpRefresh($tokens['refresh_token'], $parameters))
        ->assertInternalServerError();

    expect($failNextRefreshWrite)->toBeFalse();
    expect(DB::table('oauth_access_tokens')->whereIn('user_id', $this->mcpFixtureCreators)->count())->toBe($tokens === null ? 0 : 1);
    expect(DB::table('oauth_refresh_tokens')->whereIn('access_token_id', DB::table('oauth_access_tokens')->whereIn('user_id', $this->mcpFixtureCreators)->select('id'))->count())->toBe($tokens === null ? 0 : 1);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->whereIn('creator_id', $this->mcpFixtureCreators)->count())->toBe($tokens === null ? 0 : 1);
    if ($tokens === null) {
        $this->mcpRedeem($code, $parameters)->assertOk();
    } else {
        $this->mcpCall($tokens['access_token'])->assertOk();
        $this->mcpRefresh($tokens['refresh_token'], $parameters)->assertOk();
    }
})->with(['authorization_code', 'refresh_token']);

test('consent accepts a named file lock store and checks its driver rather than its name', function () {
    $this->enableMcpOAuth();
    [$creator, , $parameters] = $this->mcpCreator();
    $this->actingAs($creator, 'web');
    config()->set('session.driver', 'file');
    config()->set('session.block_store', 'oauth-locks');
    config()->set('cache.stores.oauth-locks', config('cache.stores.file'));
    app()->instance('env', 'production');

    try {
        $this->get('https://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters))
            ->assertOk()->assertSee('Approve connection');
    } finally {
        app()->instance('env', 'testing');
        \Illuminate\Http\Request::setTrustedHosts([]);
    }
});

test('untrusted forwarded headers cannot upgrade HTTP or replace a foreign OAuth host', function (string $url) {
    $this->enableMcpOAuth();
    config()->set('trustedproxy.proxies', ['10.0.0.1']);
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $tokens = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json();

    $this->postJson($url, [], [
        'Authorization' => 'Bearer '.$tokens['access_token'],
        'X-Forwarded-Proto' => 'https', 'X-Forwarded-Host' => 'linket.example.test',
        'X-Forwarded-Port' => '443',
    ])->assertForbidden();

    $this->mcpCall($tokens['access_token'])->assertOk();
})->with(['http://linket.example.test/mcp', 'https://foreign.example.test/mcp']);

test('runtime feature shutdown rejects already registered MCP OAuth and metadata routes', function () {
    $this->enableMcpOAuth();
    config()->set('creator_ai.features.mcp_oauth', false);

    $this->get('https://linket.example.test/.well-known/oauth-authorization-server')->assertNotFound();
    $this->get('https://linket.example.test/.well-known/oauth-protected-resource/mcp')->assertNotFound();
    $this->get('https://linket.example.test/oauth/linket/authorize')->assertNotFound();
    $this->post('https://linket.example.test/oauth/linket/token')->assertNotFound();
    $this->postJson('https://linket.example.test/mcp')->assertNotFound();
});

test('the isolated token limiter still enforces ten attempts without exhausting the MCP read limit', function () {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $tokens = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json();
    for ($attempt = 1; $attempt < 10; $attempt++) {
        $this->mcpRefresh('synthetic-invalid-refresh', $parameters)->assertBadRequest();
    }

    $this->mcpRefresh($tokens['refresh_token'], $parameters)->assertTooManyRequests();

    $this->mcpCall($tokens['access_token'])->assertOk();
});
