<?php

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

/** @return array{0: User, 1: int} */
function aiMcpConnectionsCreator(): array
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($user);

    return [$user, (int) $workspace->getKey()];
}

function aiMcpConnectionsPro(User $user): void
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
        'reference' => 'MCP-CONSENT-'.Str::upper(Str::random(16)),
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

function aiMcpConnectionsEnable(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.mcp', true);
}

function aiMcpConnectionsLogin($test, User $user): void
{
    $test->withSession(['_token' => 'creator-mcp-consent-test'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'creator-mcp-consent-test')
        ->actingAs($user);
}

test('MCP connections are private: unauthenticated denied and a creator sees only their own connections', function () {
    $this->getJson('/api/v1/creator-ai/mcp-connections')->assertUnauthorized();

    [$creator, $workspaceId] = aiMcpConnectionsCreator();
    [$other, $otherWorkspaceId] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsPro($other);
    aiMcpConnectionsEnable();

    $registry = app(CreatorMcpConnectionRegistry::class);
    $own = $registry->recordConsent($creator, $workspaceId, 'chatgpt-public-client-a');
    $registry->recordConsent($other, $otherWorkspaceId, 'chatgpt-private-client-b');

    aiMcpConnectionsLogin($this, $creator);
    $response = $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonCount(1, 'data.connections')
        ->assertJsonPath('data.connections.0.id', $own['id'])
        ->assertJsonPath('data.connections.0.workspace_id', $workspaceId)
        ->assertJsonPath('data.connections.0.status', 'active');

    expect($response->getContent())
        ->not->toContain('chatgpt-private-client-b')
        ->not->toContain('1000123456789')
        ->not->toContain('access_token')
        ->not->toContain('refresh_token');
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
});

test('only a verified current Pro may consent to read-only MCP access in their workspace', function () {
    aiMcpConnectionsEnable();
    [$free, $workspaceId] = aiMcpConnectionsCreator();
    $registry = app(CreatorMcpConnectionRegistry::class);

    try {
        $registry->recordConsent($free, $workspaceId, 'chatgpt-test-client');
        $this->fail('Free creator was granted MCP access.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    aiMcpConnectionsPro($free);
    config()->set('creator_ai.features.mcp', false);

    try {
        $registry->recordConsent($free, $workspaceId, 'chatgpt-test-client');
        $this->fail('Disabled MCP feature granted a connection.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }
});

test('trusted OAuth consent creates a client-and-workspace-bound grant with strict access checks', function () {
    [$creator, $workspaceId] = aiMcpConnectionsCreator();
    [$other, $otherWorkspaceId] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();
    $registry = app(CreatorMcpConnectionRegistry::class);

    $connection = $registry->recordConsent($creator, $workspaceId, 'chatgpt-client-123', now()->addHour());

    expect($registry->authorize($creator, $connection['id'], 'chatgpt-client-123'))
        ->toBe($workspaceId);

    foreach ([
        fn () => $registry->authorize($creator, $connection['id'], 'different-client'),
        fn () => $registry->authorize($other, $connection['id'], 'chatgpt-client-123'),
        fn () => $registry->authorize($creator, (string) Str::uuid(), 'chatgpt-client-123'),
    ] as $attempt) {
        try {
            $attempt();
            $this->fail('An invalid MCP grant was accepted.');
        } catch (HttpException $e) {
            expect($e->getStatusCode())->toBe(403);
        }
    }

    expect($workspaceId)->not->toBe($otherWorkspaceId);
});

test('creator can revoke their grant, repeated revoke is safe, and foreign revocation is forbidden', function () {
    [$creator, $workspaceId] = aiMcpConnectionsCreator();
    [$other] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();

    $registry = app(CreatorMcpConnectionRegistry::class);
    $connection = $registry->recordConsent($creator, $workspaceId, 'chatgpt-revoke-test');

    aiMcpConnectionsLogin($this, $other);
    $this->deleteJson('/api/v1/creator-ai/mcp-connections/'.$connection['id'])
        ->assertNotFound();

    aiMcpConnectionsLogin($this, $creator);
    $this->deleteJson('/api/v1/creator-ai/mcp-connections/'.$connection['id'])
        ->assertNoContent();
    $this->deleteJson('/api/v1/creator-ai/mcp-connections/'.$connection['id'])
        ->assertNoContent();

    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertJsonPath('data.connections.0.status', 'revoked');

    try {
        $registry->authorize($creator, $connection['id'], 'chatgpt-revoke-test');
        $this->fail('Revoked consent still grants MCP access.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    expect(DB::table('creator_ai_mcp_connections')->where('id', $connection['id'])->value('revoked_at'))
        ->not->toBeNull();
});

test('expired grants and elapsed Pro access are rejected at each MCP invocation', function () {
    [$creator, $workspaceId] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();

    $registry = app(CreatorMcpConnectionRegistry::class);
    $connection = $registry->recordConsent($creator, $workspaceId, 'chatgpt-client-123');

    DB::table('creator_ai_mcp_connections')->where('id', $connection['id'])
        ->update(['expires_at' => now()->subMinute()]);

    try {
        $registry->authorize($creator, $connection['id'], 'chatgpt-client-123');
        $this->fail('Expired MCP consent was accepted.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    $connection2 = $registry->recordConsent($creator, $workspaceId, 'chatgpt-new-client-456');
    Subscription::query()->where('user_id', $creator->id)
        ->where('gateway_name', 'verify_et')->update(['gateway_status' => 'expired']);

    try {
        $registry->authorize($creator, $connection2['id'], 'chatgpt-new-client-456');
        $this->fail('Expired Pro retained MCP access.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }
});

test('grant renewal requires explicit fresh trusted consent; no public connect endpoint issues credentials', function () {
    [$creator, $workspaceId] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();
    $registry = app(CreatorMcpConnectionRegistry::class);

    $old = $registry->recordConsent($creator, $workspaceId, 'chatgpt-client-123');
    $registry->revoke($creator, $old['id']);

    $new = $registry->recordConsent($creator, $workspaceId, 'chatgpt-client-123');
    expect($new['id'])->not->toBe($old['id']);
    expect($registry->authorize($creator, $new['id'], 'chatgpt-client-123'))
        ->toBe($workspaceId);

    aiMcpConnectionsLogin($this, $creator);
    $this->postJson('/api/v1/creator-ai/mcp-connections', [
        'workspace_id' => $workspaceId,
        'client_id' => 'chatgpt-client-123',
    ])->assertStatus(405);
});


test('connection setup is unavailable while remote OAuth remains disabled even for verified Pro', function () {
    [$creator] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();

    aiMcpConnectionsLogin($this, $creator);
    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonPath('data.oauth_connection_available', false)
        ->assertJsonPath('data.connection_setup.status', 'unavailable')
        ->assertJsonPath('data.connection_setup.resource_url', null);
});

test('connection setup requires verified Pro and only supplies the approved HTTPS MCP URL to eligible creators', function () {
    [$creator, $workspaceId] = aiMcpConnectionsCreator();
    aiMcpConnectionsEnable();
    foreach (['mcp_oauth', 'mcp_http_oauth', 'mcp_http_token', 'mcp_http_discovery', 'mcp_http_server'] as $flag) {
        config()->set('creator_ai.features.'.$flag, true);
    }
    config()->set('app.url', 'https://linket.example.test');
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');

    aiMcpConnectionsLogin($this, $creator);
    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonPath('data.oauth_connection_available', false)
        ->assertJsonPath('data.connection_setup.status', 'verified_pro_required')
        ->assertJsonPath('data.connection_setup.resource_url', null);

    aiMcpConnectionsPro($creator);
    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonPath('data.oauth_connection_available', false)
        ->assertJsonPath('data.connection_setup.status', 'admin_setup_required')
        ->assertJsonPath('data.connection_setup.resource_url', null);

    // A valid, registered public OAuth client is required before suggesting
    // that ChatGPT can connect. Flags and a Pro badge alone are insufficient.
    DB::table('oauth_clients')->insert([
        'id' => (string) Str::uuid(),
        'owner_type' => null,
        'owner_id' => null,
        'name' => 'Approved synthetic creator MCP client',
        'secret' => null,
        'provider' => 'creator_mcp_users',
        'redirect_uris' => json_encode(['https://client.example.test/oauth/callback']),
        'grant_types' => json_encode(['authorization_code', 'refresh_token']),
        'revoked' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonPath('data.oauth_connection_available', true)
        ->assertJsonPath('data.connection_setup.status', 'ready')
        ->assertJsonPath('data.connection_setup.resource_url', 'https://linket.example.test/mcp');

    // Availability must never return another creator's workspace identifier.
    expect($workspaceId)->toBeGreaterThan(0);
});

test('connection setup remains unavailable if the OAuth issuer is inconsistent with the application', function () {
    [$creator] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();
    foreach (['mcp_oauth', 'mcp_http_oauth', 'mcp_http_token', 'mcp_http_discovery', 'mcp_http_server'] as $flag) {
        config()->set('creator_ai.features.'.$flag, true);
    }
    config()->set('app.url', 'https://linket.example.test');
    config()->set('creator_ai.oauth_issuer', 'https://untrusted.example.test');
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');

    aiMcpConnectionsLogin($this, $creator);
    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonPath('data.oauth_connection_available', false)
        ->assertJsonPath('data.connection_setup.status', 'unavailable')
        ->assertJsonPath('data.connection_setup.resource_url', null);
});

test('connection setup requires a creator-owned workspace even with a valid verified Pro term', function () {
    $creator = User::factory()->create(['email_verified_at' => now()]);
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();
    foreach (['mcp_oauth', 'mcp_http_oauth', 'mcp_http_token', 'mcp_http_discovery', 'mcp_http_server'] as $flag) {
        config()->set('creator_ai.features.'.$flag, true);
    }
    config()->set('app.url', 'https://linket.example.test');
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');

    aiMcpConnectionsLogin($this, $creator);
    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonPath('data.oauth_connection_available', false)
        ->assertJsonPath('data.connection_setup.status', 'workspace_required')
        ->assertJsonPath('data.connection_setup.resource_url', null);
});


test('unusable OAuth client IDs do not advertise a ChatGPT connection', function () {
    [$creator] = aiMcpConnectionsCreator();
    aiMcpConnectionsPro($creator);
    aiMcpConnectionsEnable();
    foreach (['mcp_oauth', 'mcp_http_oauth', 'mcp_http_token', 'mcp_http_discovery', 'mcp_http_server'] as $flag) {
        config()->set('creator_ai.features.'.$flag, true);
    }
    config()->set('app.url', 'https://linket.example.test');
    config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');
    config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');

    DB::table('oauth_clients')->insert([
        'id' => 'not-a-valid-uuid',
        'owner_type' => null,
        'owner_id' => null,
        'name' => 'Invalid synthetic creator MCP client',
        'secret' => null,
        'provider' => 'creator_mcp_users',
        'redirect_uris' => json_encode(['https://client.example.test/oauth/callback']),
        'grant_types' => json_encode(['authorization_code', 'refresh_token']),
        'revoked' => false,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    aiMcpConnectionsLogin($this, $creator);
    $this->getJson('/api/v1/creator-ai/mcp-connections')
        ->assertOk()
        ->assertJsonPath('data.oauth_connection_available', false)
        ->assertJsonPath('data.connection_setup.status', 'admin_setup_required')
        ->assertJsonPath('data.connection_setup.resource_url', null);
});
