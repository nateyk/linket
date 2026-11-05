<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Storefront\CreatorStorefrontAppearanceAgent;
use App\CreatorAi\Storefront\CreatorStorefrontTokenValidator;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Stores\Models\Store;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

uses(DatabaseTransactions::class);

/** @return array{0:User,1:Store} */
function creatorStorefrontProposalFixture(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $store = Store::query()->create([
        'name' => 'Example creator storefront',
        'back_half' => 'ai-preview-'.Str::lower(Str::random(10)),
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
        'builder_mode' => Store::BUILDER_MODE_CREATOR_PROFILE,
    ]);

    return [$creator, $store];
}

function creatorStorefrontProposalConfig(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.storefront_drafts', true);
    config()->set('creator_ai.storefront_proposal.enabled', true);
    config()->set('creator_ai.storefront_proposal.model', 'gpt-4o-mini');
    app(CreatorAiSettings::class)->update([
        'enabled' => true,
        'provider' => 'openai',
        'api_key' => 'sk-synthetic-storefront-test-key',
        'free_monthly_limit' => 10,
        'pro_monthly_limit' => 100,
        'provider_monthly_budget_microusd' => 3000000,
        'per_request_reservation_microusd' => 100000,
    ]);
}

function creatorStorefrontProposalPro(User $creator): void
{
    settings()->save(['billing.enable' => true]);
    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)->firstOrFail();
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
        'reference' => 'AI-STYLE-PRO-'.Str::upper(Str::random(10)),
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

function creatorStorefrontProposalActAs($test, User $creator): void
{
    $test->withSession(['_token' => 'ai-style-synthetic'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'ai-style-synthetic')
        ->actingAs($creator);
}

test('storefront AI suggestion endpoints are private and disabled by default', function () {
    [$creator, $store] = creatorStorefrontProposalFixture();
    $path = '/api/v1/creator-ai/stores/'.$store->id;

    $this->getJson($path.'/appearance-availability')->assertUnauthorized();
    creatorStorefrontProposalActAs($this, $creator);
    $this->getJson($path.'/appearance-availability')
        ->assertOk()->assertJsonPath('data.available', false);
    $this->postJson($path.'/appearance-proposals', ['intent' => 'Clean modern layout'])
        ->assertForbidden();
    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
});

test('Pro creator receives a fixed token preview without mutating storefront appearance or publishing', function () {
    creatorStorefrontProposalConfig();
    [$creator, $store] = creatorStorefrontProposalFixture();
    creatorStorefrontProposalPro($creator);
    creatorStorefrontProposalActAs($this, $creator);
    CreatorStorefrontAppearanceAgent::fake([[
        'preset' => 'clean',
        'reason' => 'A restrained outline style keeps attention on the content.',
    ]])->preventStrayPrompts();
    $path = '/api/v1/creator-ai/stores/'.$store->id;

    $this->getJson($path.'/appearance-availability')
        ->assertOk()->assertJsonPath('data.available', true);
    $originalRevision = (string) $store->fresh()->updated_at;
    $keyBefore = config('ai.providers.openai.key');
    $result = $this->postJson($path.'/appearance-proposals', [
        'intent' => 'Quiet and minimal storefront',
    ])->assertOk()
        ->assertJsonPath('data.preset', 'clean')
        ->assertJsonPath('data.btnConfig.variant', 'outline')
        ->assertJsonPath('data.btnConfig.radius', 'rounded-sm')
        ->assertJsonPath('data.btnConfig.shadow', 'none')
        ->assertJsonPath('data.requires_review', true)
        ->assertJsonPath('data.cost_state', 'reserved_pending_reconciliation');

    expect($result->json('data.source_fingerprint'))->toMatch('/^[a-f0-9]{64}$/')
        ->and($store->fresh()->appearance)->toBeNull()
        ->and((string) $store->fresh()->updated_at)->toBe($originalRevision)
        ->and(config('ai.providers.openai.key'))->toBe($keyBefore)
        ->and(DB::table('creator_ai_generation_metering')->count())->toBe(1)
        ->and(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1);

    $this->postJson($path.'/appearance-revision', [
        'source_fingerprint' => $result->json('data.source_fingerprint'),
    ])->assertOk()->assertJsonPath('data.unchanged', true);

    expect($result->getContent())->not->toContain('sk-synthetic-storefront-test-key');
    expect($result->headers->get('Cache-Control'))->toContain('no-store');
});

test('storefront proposal cannot be used against a later saved storefront revision', function () {
    creatorStorefrontProposalConfig();
    [$creator, $store] = creatorStorefrontProposalFixture();
    creatorStorefrontProposalPro($creator);
    creatorStorefrontProposalActAs($this, $creator);
    CreatorStorefrontAppearanceAgent::fake([[
        'preset' => 'soft',
        'reason' => 'Soft pill buttons work with a welcoming creator profile.',
    ]])->preventStrayPrompts();
    $path = '/api/v1/creator-ai/stores/'.$store->id;

    $suggestion = $this->postJson($path.'/appearance-proposals', [
        'intent' => 'Friendly and welcoming',
    ])->assertOk()->json('data');
    $store->update(['name' => 'Changed storefront after preview']);

    $this->postJson($path.'/appearance-revision', [
        'source_fingerprint' => $suggestion['source_fingerprint'],
    ])->assertStatus(409);
});

test('foreign creator cannot view or generate another creator storefront suggestions', function () {
    creatorStorefrontProposalConfig();
    [, $store] = creatorStorefrontProposalFixture();
    [$other] = creatorStorefrontProposalFixture();
    creatorStorefrontProposalActAs($this, $other);
    CreatorStorefrontAppearanceAgent::fake()->preventStrayPrompts();
    $path = '/api/v1/creator-ai/stores/'.$store->id;

    $this->getJson($path.'/appearance-availability')->assertNotFound();
    $this->postJson($path.'/appearance-proposals', [
        'intent' => 'Minimal profile',
    ])->assertNotFound();
    $this->postJson($path.'/appearance-revision', [
        'source_fingerprint' => str_repeat('a', 64),
    ])->assertNotFound();
    CreatorStorefrontAppearanceAgent::assertNeverPrompted();
    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
});

test('Free creator is denied Pro-only storefront generation without any budget reserve', function () {
    creatorStorefrontProposalConfig();
    [$creator, $store] = creatorStorefrontProposalFixture();
    creatorStorefrontProposalActAs($this, $creator);
    CreatorStorefrontAppearanceAgent::fake()->preventStrayPrompts();

    $this->postJson('/api/v1/creator-ai/stores/'.$store->id.'/appearance-proposals', [
        'intent' => 'Minimal style',
    ])->assertForbidden();
    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
    CreatorStorefrontAppearanceAgent::assertNeverPrompted();
});

test('invalid model token output fails closed and holds possibly charged usage for review', function () {
    creatorStorefrontProposalConfig();
    [$creator, $store] = creatorStorefrontProposalFixture();
    creatorStorefrontProposalPro($creator);
    creatorStorefrontProposalActAs($this, $creator);
    CreatorStorefrontAppearanceAgent::fake([[
        'preset' => '<script>alert(1)</script>',
        'reason' => 'Please override the app with my CSS style.',
    ]])->preventStrayPrompts();

    $this->postJson('/api/v1/creator-ai/stores/'.$store->id.'/appearance-proposals', [
        'intent' => 'Modern creator storefront',
    ])->assertStatus(503);

    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(1)
        ->and(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1)
        ->and($store->fresh()->appearance)->toBeNull();
});

test('storefront token validator accepts only supported button tokens and plain-text rationale', function () {
    $validator = app(CreatorStorefrontTokenValidator::class);
    $valid = $validator->clean([
        'preset' => 'editorial',
        'reason' => 'Bold buttons emphasize the primary storefront actions.',
    ]);
    expect($valid['btnConfig'])->toBe([
        'variant' => 'solid', 'radius' => 'rounded-sm', 'shadow' => 'soft',
    ]);
    foreach ([
        ['preset' => 'neon', 'reason' => 'Any unsafe style should be rejected.'],
        ['preset' => 'clean', 'reason' => 'Bad <script>alert(1)</script> element'],
        ['preset' => 'soft', 'reason' => 'Please visit https://example.com'],
        ['preset' => 'clean', 'reason' => 'Reasonable words.', 'css' => 'body{display:none}'],
    ] as $candidate) {
        expect(fn () => $validator->clean($candidate))->toThrow(ValidationException::class);
    }
});
