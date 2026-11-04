<?php

namespace Tests\Support;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

trait InteractsWithCreatorMcpOAuth
{
    /** @var list<int> */
    protected array $mcpFixtureCreators = [];

    /** @var list<string> */
    protected array $mcpFixtureClients = [];

    protected function enableMcpOAuth(): void
    {
        Http::preventStrayRequests();
        config()->set('creator_ai.enabled', true);
        foreach (['mcp', 'mcp_oauth', 'mcp_http_oauth', 'mcp_http_token', 'mcp_http_discovery', 'mcp_http_server', 'sales_summary', 'sales_trends', 'order_insights', 'product_performance'] as $feature) {
            config()->set('creator_ai.features.'.$feature, true);
        }
        config()->set('creator_ai.oauth_issuer', 'https://linket.example.test');
        config()->set('creator_ai.mcp_resource_url', 'https://linket.example.test/mcp');
        config()->set('app.url', 'https://linket.example.test');
        config()->set('session.driver', 'array');
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $private);
        config()->set('passport.private_key', $private);
        config()->set('passport.public_key', openssl_pkey_get_details($key)['key']);
        require base_path('routes/creator-ai-mcp-oauth.php');
        Route::getRoutes()->refreshNameLookups();
    }

    /** @return array{0:User,1:int,2:array<string,string>} */
    protected function mcpCreator(): array
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);
        $this->mcpFixtureCreators[] = (int) $creator->id;
        $workspace = (new CreateWorkspace)->createPersonalWorkspace($creator);
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->firstOrFail();
        Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id,
            'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => now()->addMonth(),
        ]);
        $payment = ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id,
            'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000,
            'status' => 'paid', 'paid_at' => now()->subDay(),
            'subscription_period_start' => now()->subDay(), 'subscription_period_end' => now()->addMonth(),
        ]);
        DirectPaymentVerification::query()->create([
            'reference' => 'MCP-E2E-'.Str::upper(Str::random(16)),
            'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id,
            'bank_code' => 'cbe', 'settlement_account' => '1000123456789',
            'amount_cents' => 50000, 'currency' => 'ETB', 'status' => 'success', 'verified_at' => now()->subDay(),
        ]);
        $clientId = (string) Str::uuid();
        $this->mcpFixtureClients[] = $clientId;
        $redirect = 'https://client.example.test/'.$clientId.'/callback';
        DB::table('oauth_clients')->insert([
            'id' => $clientId, 'owner_type' => null, 'owner_id' => null, 'secret' => null,
            'provider' => 'creator_mcp_users', 'name' => 'Synthetic MCP client '.$clientId,
            'redirect_uris' => json_encode([$redirect]), 'grant_types' => json_encode(['authorization_code', 'refresh_token']),
            'revoked' => false, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return [$creator, (int) $workspace->id, [
            'client_id' => $clientId, 'redirect_uri' => $redirect, 'response_type' => 'code',
            'scope' => 'mcp:use', 'state' => Str::random(40),
            'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', str_repeat('x', 43), true)), '+/', '-_'), '='),
            'code_challenge_method' => 'S256', 'resource' => 'https://linket.example.test/mcp',
        ]];
    }

    /**
     * @param array<string,string> $parameters
     * @return array{_token:string,nonce:string}
     */
    protected function mcpBeginConsent(User $creator, array $parameters): array
    {
        $this->actingAs($creator, 'web');
        app('session')->flush();
        $response = $this->get('https://linket.example.test/oauth/linket/authorize?'.http_build_query($parameters));
        $response->assertOk()->assertSee('Approve connection');
        preg_match('/name="_token" value="([^"]+)"/', $response->getContent(), $csrf);
        preg_match('/name="nonce" value="([^"]+)"/', $response->getContent(), $nonce);
        expect($csrf[1] ?? null)->toBeString()->not->toBeEmpty();
        expect($nonce[1] ?? null)->toBeString()->toHaveLength(48);

        return ['_token' => $csrf[1], 'nonce' => $nonce[1]];
    }

    /** @param array<string,string> $parameters */
    protected function mcpConsent(User $creator, int $workspace, array $parameters): string
    {
        $credentials = $this->mcpBeginConsent($creator, $parameters);
        $response = $this->post('https://linket.example.test/oauth/linket/authorize/approve', [
            ...$credentials, 'workspace_id' => $workspace,
        ])->assertRedirect();
        expect($response->headers->get('Cache-Control'))->toContain('no-store');
        $location = $response->headers->get('Location');
        expect($location)->toStartWith($parameters['redirect_uri'].'?');
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);
        expect($query['state'] ?? null)->toBe($parameters['state']);
        expect($query['code'] ?? null)->toBeString()->not->toBeEmpty();

        return $query['code'];
    }

    /**
     * @param array<string,string> $parameters
     * @param array<string,string> $overrides
     */
    protected function mcpRedeem(string $code, array $parameters, array $overrides = []): TestResponse
    {
        return $this->post('https://linket.example.test/oauth/linket/token', [
            'grant_type' => 'authorization_code', 'client_id' => $parameters['client_id'], 'code' => $code,
            'code_verifier' => str_repeat('x', 43), 'redirect_uri' => $parameters['redirect_uri'],
            'resource' => $parameters['resource'], ...$overrides,
        ], ['Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json']);
    }

    /** @param array<string,string> $parameters */
    protected function mcpRefresh(string $refresh, array $parameters): TestResponse
    {
        return $this->post('https://linket.example.test/oauth/linket/token', [
            'grant_type' => 'refresh_token', 'client_id' => $parameters['client_id'],
            'refresh_token' => $refresh, 'resource' => $parameters['resource'],
        ], ['Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json']);
    }

    /**
     * @param array<string,mixed> $arguments
     * @param array<string,string> $headers
     */
    protected function mcpCall(?string $token, string $tool = 'get_sales_summary', array $arguments = [], array $headers = [], string $query = ''): TestResponse
    {
        return $this->postJson('https://linket.example.test/mcp'.$query, [
            'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call',
            'params' => [
                'name' => 'linket.'.$tool,
                'arguments' => ['from' => '2026-10-01', 'to' => '2026-10-31', ...$arguments],
                '_meta' => ['io.modelcontextprotocol/protocolVersion' => '2026-07-28', 'io.modelcontextprotocol/clientCapabilities' => (object) []],
            ],
        ], [
            'MCP-Protocol-Version' => '2026-07-28', 'Mcp-Method' => 'tools/call', 'Mcp-Name' => 'linket.'.$tool,
            'Accept' => 'application/json, text/event-stream',
            ...($token === null ? [] : ['Authorization' => 'Bearer '.$token]), ...$headers,
        ]);
    }
}
