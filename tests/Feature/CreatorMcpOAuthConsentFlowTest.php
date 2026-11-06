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
use Illuminate\Http\Request;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

/** @return array{0:User,1:int} */
function consentCreator(): array
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($user);

    return [$user, (int) $workspace->getKey()];
}

function consentVerifiedPro(User $user): void
{
    $product = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $product->id)->where('currency', 'ETB')->firstOrFail();

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
        'reference' => 'MCP-APPROVE-'.Str::upper(Str::random(16)),
        'payable_type' => ProSubscriptionPayment::class,
        'payable_id' => $payment->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 50000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now()->subDay(),
    ]);
}

function consentClient(): string
{
    $id = (string) Str::uuid();

    DB::table('oauth_clients')->insert([
        'id' => $id,
        'owner_type' => null,
        'owner_id' => null,
        'name' => 'Test public ChatGPT client',
        'secret' => null,
        'provider' => 'creator_mcp_users',
        'redirect_uris' => json_encode(['https://client.example.test/oauth/callback']),
        'grant_types' => json_encode(['authorization_code', 'refresh_token']),
        'revoked' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $id;
}

function consentEnable(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.mcp', true);
    config()->set('creator_ai.features.mcp_oauth', true);
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');
    config()->set('app.url', 'https://linket.example.test');
}

/** @return array<string,string> */
function consentParams(string $clientId): array
{
    return [
        'client_id' => $clientId,
        'redirect_uri' => 'https://client.example.test/oauth/callback',
        'response_type' => 'code',
        'scope' => 'mcp:use',
        'state' => str_repeat('s', 40),
        'code_challenge' => str_repeat('A', 43),
        'code_challenge_method' => 'S256',
        'resource' => 'https://linket.example.test/mcp',
    ];
}

function consentSession(): Store
{
    /** @var Store $session */
    $session = app('session')->driver('array');
    $session->flush();
    $session->start();

    return $session;
}

function consentBrowser(Store $session, ?string $csrf = null): Request
{
    $request = Request::create('/internal-creator-mcp-consent', 'POST', [
        '_token' => $csrf ?? $session->token(),
    ]);
    $request->setLaravelSession($session);

    return $request;
}

/** @param callable():mixed $callback */
function consentAssertForbidden(callable $callback, int $expected = 403): void
{
    $caught = null;
    try {
        $callback();
    } catch (HttpException $error) {
        $caught = $error;
    }

    expect($caught)->toBeInstanceOf(HttpException::class);
    expect($caught?->getStatusCode())->toBe($expected);
}

test('the trusted consent browser requires web-session authentication instead of a supplied creator id', function () {
    consentEnable();
    [$creator] = consentCreator();
    $session = consentSession();
    $request = consentBrowser($session);

    consentAssertForbidden(
        fn () => app(CreatorMcpOAuthConsentFlow::class)->begin($request, consentParams(consentClient())),
        401,
    );

    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
});

test('beginning authenticated OAuth consent never creates a grant or automatically accepts old Passport tokens', function () {
    consentEnable();
    [$creator, $workspaceId] = consentCreator();
    consentVerifiedPro($creator);
    $clientId = consentClient();

    DB::table('oauth_access_tokens')->insert([
        'id' => Str::random(80), 'user_id' => $creator->id, 'client_id' => $clientId,
        'name' => null, 'scopes' => json_encode(['mcp:use']), 'revoked' => false,
        'created_at' => now(), 'updated_at' => now(), 'expires_at' => now()->addHour(),
    ]);

    $this->actingAs($creator, 'web');
    $session = consentSession();
    $flow = app(CreatorMcpOAuthConsentFlow::class);
    $pending = $flow->begin(consentBrowser($session), consentParams($clientId));

    expect($pending['client_id'])->toBe($clientId);
    expect($pending['nonce'])->toBeString()->not->toBeEmpty();
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);

    // Existing Passport scopes must NOT allow approval without the new nonce.
    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), str_repeat('x', 48), $workspaceId));
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
});

test('verified Pro explicitly approves one authorized workspace with same browser session and fresh nonce', function () {
    consentEnable();
    [$creator, $workspaceId] = consentCreator();
    consentVerifiedPro($creator);
    $clientId = consentClient();

    $this->actingAs($creator, 'web');
    $session = consentSession();
    $flow = app(CreatorMcpOAuthConsentFlow::class);
    $pending = $flow->begin(consentBrowser($session), consentParams($clientId));
    $approved = $flow->approve(consentBrowser($session), $pending['nonce'], $workspaceId);

    expect($approved['connection']['workspace_id'])->toBe($workspaceId);
    expect($approved['connection']['client_id'])->toBe($clientId);
    expect($approved['authorization'])->toBe(consentParams($clientId));
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(1);

    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), $pending['nonce'], $workspaceId));

    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(1);
});

test('OAuth consent denial consumes the pending request and never records a grant', function () {
    consentEnable();
    [$creator, $workspaceId] = consentCreator();
    consentVerifiedPro($creator);
    $this->actingAs($creator, 'web');

    $session = consentSession();
    $flow = app(CreatorMcpOAuthConsentFlow::class);
    $pending = $flow->begin(consentBrowser($session), consentParams(consentClient()));

    $flow->deny(consentBrowser($session), $pending['nonce']);
    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), $pending['nonce'], $workspaceId));

    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
});

test('invalid anti-CSRF token does not grant consent and a changed browser user cannot approve the original request', function () {
    consentEnable();
    [$creator, $workspaceId] = consentCreator();
    [$other] = consentCreator();
    consentVerifiedPro($creator);
    $this->actingAs($creator, 'web');

    $session = consentSession();
    $flow = app(CreatorMcpOAuthConsentFlow::class);
    $pending = $flow->begin(consentBrowser($session), consentParams(consentClient()));

    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session, 'forged-csrf'), $pending['nonce'], $workspaceId));
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);

    Auth::guard('web')->setUser($other);
    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), $pending['nonce'], $workspaceId));
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
});

test('even current verified Pro cannot approve a workspace belonging only to a different creator', function () {
    consentEnable();
    [$creator] = consentCreator();
    [$other, $otherWorkspaceId] = consentCreator();
    consentVerifiedPro($creator);
    consentVerifiedPro($other);
    $this->actingAs($creator, 'web');

    $session = consentSession();
    $flow = app(CreatorMcpOAuthConsentFlow::class);
    $pending = $flow->begin(consentBrowser($session), consentParams(consentClient()));

    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), $pending['nonce'], $otherWorkspaceId));
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
});

test('Pro expiry, revoked client, expired session and feature gate close pending consent without issuing access', function () {
    consentEnable();
    [$creator, $workspaceId] = consentCreator();
    consentVerifiedPro($creator);
    $this->actingAs($creator, 'web');

    $session = consentSession();
    $flow = app(CreatorMcpOAuthConsentFlow::class);
    $clientId = consentClient();

    $pending = $flow->begin(consentBrowser($session), consentParams($clientId));
    $stored = $session->get('creator_ai.oauth.pending');
    $stored['expires_at'] = now()->subSecond()->timestamp;
    $session->put('creator_ai.oauth.pending', $stored);
    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), $pending['nonce'], $workspaceId));

    $pending = $flow->begin(consentBrowser($session), consentParams($clientId));
    DB::table('oauth_clients')->where('id', $clientId)->update(['revoked' => true]);
    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), $pending['nonce'], $workspaceId), 400);

    DB::table('oauth_clients')->where('id', $clientId)->update(['revoked' => false]);
    $pending = $flow->begin(consentBrowser($session), consentParams($clientId));
    Subscription::query()->where('user_id', $creator->id)
        ->where('gateway_name', 'verify_et')->update(['gateway_status' => 'expired']);
    consentAssertForbidden(fn () => $flow->approve(consentBrowser($session), $pending['nonce'], $workspaceId));

    config()->set('creator_ai.features.mcp_oauth', false);
    consentAssertForbidden(fn () => $flow->begin(consentBrowser($session), consentParams($clientId)), 404);
    expect(DB::table('creator_ai_mcp_connections')->count())->toBe(0);
});

test('no Passport OAuth endpoint can bypass fresh workspace consent while the live protocol is disabled', function () {
    consentEnable();

    foreach ([
        'passport.authorizations.authorize',
        'passport.authorizations.approve',
        'passport.token',
        'mcp.oauth.register',
        'linket.mcp',
    ] as $route) {
        expect(Route::has($route))->toBeFalse();
    }
});
