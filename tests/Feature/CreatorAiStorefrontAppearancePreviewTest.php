<?php

use App\CreatorAi\Storefront\StorefrontAppearanceProposalService;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Stores\Models\Store;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Billing\Models\Product;
use Common\Billing\Models\Price;
use Common\Billing\Subscription;
use Illuminate\Support\Str;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

/** @return array{0:User,1:Store} */
function storefrontPreviewFixture(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $store = Store::factory()->create([
        'user_id' => $creator->getKey(),
        'workspace_id' => $workspace->getKey(),
        'builder_mode' => Store::BUILDER_MODE_CREATOR_PROFILE,
    ]);

    return [$creator, $store];
}

function storefrontPreviewActAs($test, User $creator): void
{
    $test->withSession(['_token' => 'preview-fixture'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'preview-fixture')
        ->actingAs($creator);
}

function storefrontPreviewVerifiedPro(User $creator): void
{
    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)
        ->where('currency', 'ETB')->firstOrFail();

    Subscription::query()->create([
        'user_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'gateway_name' => 'verify_et',
        'gateway_status' => 'active',
        'renews_at' => now()->addMonth(),
    ]);
    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'amount_cents' => 50000,
        'status' => 'paid',
        'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(),
        'subscription_period_end' => now()->addMonth(),
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'AI-STORE-PRO-'.Str::upper(Str::random(12)),
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

function storefrontPreviewFeatureOn(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.storefront_drafts', true);
    config()->set('creator_ai.storefront_preview.enabled', true);
}

test('PR09 preview is authentication protected and OFF even when other AI abilities are enabled', function () {
    [$creator, $store] = storefrontPreviewFixture();
    $url = '/api/v1/creator-ai/stores/'.$store->getKey().'/appearance-preview?preset=clear';
    $this->getJson($url)->assertUnauthorized();
    storefrontPreviewActAs($this, $creator);
    $this->getJson($url)->assertForbidden();
});

test('PR09 preview is Pro-only: no unverified upgrade or foreign-store leaks', function () {
    storefrontPreviewFeatureOn();
    [$free, $store] = storefrontPreviewFixture();
    [$other] = storefrontPreviewFixture();
    storefrontPreviewVerifiedPro($other);

    storefrontPreviewActAs($this, $free);
    $this->getJson('/api/v1/creator-ai/stores/'.$store->id.'/appearance-preview?preset=clear')
        ->assertForbidden();

    storefrontPreviewActAs($this, $other);
    $this->getJson('/api/v1/creator-ai/stores/'.$store->id.'/appearance-preview?preset=clear')
        ->assertNotFound();
    $this->postJson('/api/v1/creator-ai/stores/'.$store->id.'/appearance-revision', [
        'source_fingerprint' => str_repeat('a', 64),
    ])->assertNotFound();
});

test('PR09 preview returns only preset allowlist differences and leaves appearance, store, and AI spending unchanged', function () {
    storefrontPreviewFeatureOn();
    [$creator, $store] = storefrontPreviewFixture();
    storefrontPreviewVerifiedPro($creator);
    $store->appearance()->create(['config' => [
        'layout' => 'default',
        'btnConfig' => [
            'variant' => 'glass',
            'radius' => 'rounded-none',
            'color' => 'https://private.example.test/secret',
        ],
        'hideBranding' => false,
    ]]);
    storefrontPreviewActAs($this, $creator);
    $originalStoreUpdatedAt = $store->fresh()->updated_at->toISOString();
    $originalAppearance = $store->fresh()->appearance->config;
    $url = '/api/v1/creator-ai/stores/'.$store->id.'/appearance-preview?preset=clear';

    $response = $this->getJson($url)->assertOk()
        ->assertJsonPath('data.preset', 'clear')
        ->assertJsonPath('data.requires_review', true)
        ->assertJsonPath('data.read_only', true)
        ->assertJsonPath('data.changes.btnConfig.variant', 'solid')
        ->assertJsonPath('data.changes.btnConfig.radius', 'rounded-lg');

    $json = $response->getContent();
    expect($response->json('data.source_fingerprint'))->toMatch('/^[a-f0-9]{64}$/')
        ->and($json)->not->toContain('private.example.test')
        ->not->toContain('hideBranding')
        ->not->toContain('color')
        ->and($store->fresh()->appearance->config)->toBe($originalAppearance)
        ->and($store->fresh()->updated_at->toISOString())->toBe($originalStoreUpdatedAt)
        ->and(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
    expect($response->headers->get('Cache-Control'))->toContain('no-store');

    $this->postJson('/api/v1/creator-ai/stores/'.$store->id.'/appearance-revision', [
        'source_fingerprint' => $response->json('data.source_fingerprint'),
    ])->assertOk()->assertJsonPath('data.unchanged', true);

    $store->appearance()->first()->update(['config' => [
        'layout' => 'profile-sidebar',
        'btnConfig' => ['variant' => 'outline'],
    ]]);
    $this->postJson('/api/v1/creator-ai/stores/'.$store->id.'/appearance-revision', [
        'source_fingerprint' => $response->json('data.source_fingerprint'),
    ])->assertStatus(409);
});

test('PR09 rejects arbitrary presets and never allows raw CSS JS or HTML proposal injection', function () {
    storefrontPreviewFeatureOn();
    [$creator, $store] = storefrontPreviewFixture();
    storefrontPreviewVerifiedPro($creator);
    storefrontPreviewActAs($this, $creator);
    $path = '/api/v1/creator-ai/stores/'.$store->id.'/appearance-preview';
    $this->getJson($path.'?preset=%3Cscript%3Ealert(1)%3C%2Fscript%3E')
        ->assertUnprocessable();
    $this->getJson($path.'?preset=clear&css=body%7Bdisplay%3Anone%7D')
        ->assertOk()->assertDontSee('display:none');
    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
});
