<?php

use App\CreatorAi\Auth\CreatorMcpPassportTokenBindings;
use App\CreatorAi\Services\CreatorMcpConnectionRegistry;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

/** @return array{0: User, 1:int} */
function boundTokenCreator(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    return [$creator, (int) $workspace->id];
}

function boundTokenPro(User $creator): void
{
    $product = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $product->id)->where('currency', 'ETB')->firstOrFail();
    Subscription::query()->create([
        'user_id' => $creator->id,
        'product_id' => $product->id,
        'price_id' => $price->id,
        'gateway_name' => 'verify_et',
        'gateway_status' => 'active',
        'renews_at' => now()->addMonth(),
    ]);
    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id,
        'product_id' => $product->id, 'price_id' => $price->id,
        'amount_cents' => 50000, 'status' => 'paid',
        'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(),
        'subscription_period_end' => now()->addMonth(),
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'MCP-TOKEN-'.Str::upper(Str::random(15)),
        'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id,
        'bank_code' => 'cbe', 'settlement_account' => '1000123456789',
        'amount_cents' => 50000, 'currency' => 'ETB',
        'status' => 'success', 'verified_at' => now()->subDay(),
    ]);
}

function boundTokenEnable(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.mcp', true);
    config()->set('creator_ai.features.mcp_oauth', true);
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');
}

function boundTokenClient(): string
{
    $id = (string) Str::uuid();
    DB::table('oauth_clients')->insert([
        'id' => $id, 'owner_type' => null, 'owner_id' => null,
        'name' => 'MCP public test client', 'secret' => null,
        'provider' => 'creator_mcp_users',
        'redirect_uris' => json_encode(['https://client.example.test/callback']),
        'grant_types' => json_encode(['authorization_code', 'refresh_token']),
        'revoked' => false, 'created_at' => now(), 'updated_at' => now(),
    ]);
    return $id;
}

function boundTokenAccess(User $creator, string $clientId, array $overrides = []): string
{
    $tokenId = Str::random(80);
    DB::table('oauth_access_tokens')->insert(array_replace([
        'id' => $tokenId, 'user_id' => $creator->id, 'client_id' => $clientId,
        'name' => null, 'scopes' => json_encode(['mcp:use']),
        'revoked' => false, 'expires_at' => now()->addHour(),
        'created_at' => now(), 'updated_at' => now(),
    ], $overrides));
    return $tokenId;
}

/** @return array{0:User,1:int,2:string,3:string} */
function boundTokenReady(): array
{
    boundTokenEnable();
    [$creator, $workspaceId] = boundTokenCreator();
    boundTokenPro($creator);
    $clientId = boundTokenClient();
    $connection = app(CreatorMcpConnectionRegistry::class)->recordConsent($creator, $workspaceId, $clientId);
    return [$creator, $workspaceId, $clientId, $connection['id']];
}

/** @param callable():mixed $fn */
function boundTokenDenied(callable $fn): void
{
    $caught = null;
    try { $fn(); } catch (HttpException $exception) { $caught = $exception; }
    expect($caught)->toBeInstanceOf(HttpException::class);
    expect($caught?->getStatusCode())->toBe(403);
}

test('OAuth access token metadata binds only to the authorized creator, client, grant, and resource', function () {
    [$creator, $workspaceId, $clientId, $grantId] = boundTokenReady();
    $tokenId = boundTokenAccess($creator, $clientId);
    $bindings = app(CreatorMcpPassportTokenBindings::class);

    $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $tokenId, 'https://linket.example.test/mcp');

    expect($bindings->authorizeBoundAccessToken($creator, $tokenId, $clientId, 'https://linket.example.test/mcp'))->toBe($workspaceId);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(1);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->first(['connection_id'])->connection_id)->toBe($grantId);
});

test('unbound and foreign creator or client or resource access tokens fail closed', function () {
    [$creator, $workspaceId, $clientId, $grantId] = boundTokenReady();
    [$other] = boundTokenCreator();
    $tokenId = boundTokenAccess($creator, $clientId);
    $bindings = app(CreatorMcpPassportTokenBindings::class);

    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($creator, $tokenId, $clientId, 'https://linket.example.test/mcp'));

    $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $tokenId, 'https://linket.example.test/mcp');

    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($other, $tokenId, $clientId, 'https://linket.example.test/mcp'));
    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($creator, $tokenId, (string) Str::uuid(), 'https://linket.example.test/mcp'));
    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($creator, $tokenId, $clientId, 'https://other.example.test/mcp'));
    boundTokenDenied(fn () => $bindings->bindIssuedAccessToken($other, $grantId, $clientId, $tokenId, 'https://linket.example.test/mcp'));
});

test('invalid, revoked, expired, wrong-scope, and wrong-client Passport token rows cannot be bound', function () {
    [$creator, $workspaceId, $clientId, $grantId] = boundTokenReady();
    $bindings = app(CreatorMcpPassportTokenBindings::class);
    $foreignClient = boundTokenClient();

    foreach ([
        ['revoked' => true],
        ['expires_at' => now()->subMinute()],
        ['scopes' => json_encode([])],
        ['scopes' => json_encode(['*'])],
        ['scopes' => json_encode(['mcp:use', 'payments:write'])],
        ['client_id' => $foreignClient],
    ] as $overrides) {
        $tokenId = boundTokenAccess($creator, $clientId, $overrides);
        boundTokenDenied(fn () => $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $tokenId, 'https://linket.example.test/mcp'));
    }

    boundTokenDenied(fn () => $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, Str::random(80), 'https://linket.example.test/mcp'));
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(0);
});

test('binding the same access token is idempotent but cannot reassign it to another workspace grant', function () {
    [$creator, $workspaceId, $clientId, $grantId] = boundTokenReady();
    [$other, $otherWorkspaceId] = boundTokenCreator();
    boundTokenPro($other);
    $tokenId = boundTokenAccess($creator, $clientId);
    $bindings = app(CreatorMcpPassportTokenBindings::class);

    $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $tokenId, 'https://linket.example.test/mcp');
    $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $tokenId, 'https://linket.example.test/mcp');

    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->count())->toBe(1);
    $otherGrant = app(CreatorMcpConnectionRegistry::class)->recordConsent($other, $otherWorkspaceId, $clientId);
    boundTokenDenied(fn () => $bindings->bindIssuedAccessToken($other, $otherGrant['id'], $clientId, $tokenId, 'https://linket.example.test/mcp'));
});

test('disconnect revokes all bound Passport access and refresh tokens without touching unrelated tokens', function () {
    [$creator, $workspaceId, $clientId, $grantId] = boundTokenReady();
    $bindings = app(CreatorMcpPassportTokenBindings::class);
    $firstId = boundTokenAccess($creator, $clientId);
    $secondId = boundTokenAccess($creator, $clientId);
    $unrelatedId = boundTokenAccess($creator, $clientId);

    foreach ([$firstId, $secondId, $unrelatedId] as $id) {
        DB::table('oauth_refresh_tokens')->insert([
            'id' => Str::random(80), 'access_token_id' => $id,
            'revoked' => false, 'expires_at' => now()->addDays(3),
        ]);
    }

    $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $firstId, 'https://linket.example.test/mcp');
    $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $secondId, 'https://linket.example.test/mcp');

    app(CreatorMcpConnectionRegistry::class)->revoke($creator, $grantId);
    app(CreatorMcpConnectionRegistry::class)->revoke($creator, $grantId);

    expect(DB::table('oauth_access_tokens')->whereIn('id', [$firstId, $secondId])->where('revoked', true)->count())->toBe(2);
    expect(DB::table('oauth_refresh_tokens')->whereIn('access_token_id', [$firstId, $secondId])->where('revoked', true)->count())->toBe(2);
    expect(DB::table('oauth_access_tokens')->where('id', $unrelatedId)->value('revoked'))->toBe(0);
    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($creator, $firstId, $clientId, 'https://linket.example.test/mcp'));
});

test('expired Pro, revoked client and OAuth feature switch immediately deny a previously bound token', function () {
    [$creator, $workspaceId, $clientId, $grantId] = boundTokenReady();
    $tokenId = boundTokenAccess($creator, $clientId);
    $bindings = app(CreatorMcpPassportTokenBindings::class);
    $bindings->bindIssuedAccessToken($creator, $grantId, $clientId, $tokenId, 'https://linket.example.test/mcp');

    config()->set('creator_ai.features.mcp_oauth', false);
    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($creator, $tokenId, $clientId, 'https://linket.example.test/mcp'));
    config()->set('creator_ai.features.mcp_oauth', true);

    DB::table('oauth_clients')->where('id', $clientId)->update(['revoked' => true]);
    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($creator, $tokenId, $clientId, 'https://linket.example.test/mcp'));
    DB::table('oauth_clients')->where('id', $clientId)->update(['revoked' => false]);

    Subscription::query()->where('user_id', $creator->id)->where('gateway_name', 'verify_et')->update(['gateway_status' => 'expired']);
    boundTokenDenied(fn () => $bindings->authorizeBoundAccessToken($creator, $tokenId, $clientId, 'https://linket.example.test/mcp'));
});
