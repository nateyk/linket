<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Writing\CreatorProductCopyAgent;
use App\CreatorAi\Writing\ProductCopyDraftValidator;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

uses(DatabaseTransactions::class);

/** @return array{0:User,1:int,2:DigitalProduct} */
function creatorCopyFixture(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Creator sample worksheet',
        'description' => '<p>Printable exercise worksheets.</p>',
        'type' => 'digital',
        'status' => 'draft',
        'price_cents' => 12000,
        'currency' => 'ETB',
    ]);

    return [$creator, (int) $workspace->id, $product];
}

function creatorCopyTestConfiguration(): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.writing_basic', true);
    config()->set('creator_ai.features.writing_advanced', true);
    config()->set('creator_ai.product_copy_provider.enabled', true);
    config()->set('creator_ai.product_copy_provider.model', 'gpt-4o-mini');

    app(CreatorAiSettings::class)->update([
        'enabled' => true,
        'provider' => 'openai',
        'api_key' => 'sk-synthetic-copy-fixture',
        'free_monthly_limit' => 10,
        'pro_monthly_limit' => 100,
        'provider_monthly_budget_microusd' => 3000000,
        'per_request_reservation_microusd' => 100000,
    ]);
}

function creatorCopyActAs($test, User $user): void
{
    $test->withSession(['_token' => 'creator-copy-test'])
        ->withHeader('X-CSRF-TOKEN', 'creator-copy-test')
        ->actingAs($user);
}

test('creator product copy capability fails closed without flags and unauthenticated users cannot read it', function () {
    [$creator, , $product] = creatorCopyFixture();
    $path = '/api/v1/creator-ai/products/'.$product->id;
    $this->getJson($path.'/copy-availability')->assertUnauthorized();
    creatorCopyActAs($this, $creator);
    $this->getJson($path.'/copy-availability')
        ->assertOk()->assertJsonPath('data.available', false);
    $this->postJson($path.'/copy-proposals', ['tone' => 'clear'])
        ->assertForbidden();

    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
});

test('free creator gets a review-only structured suggestion without product mutation or untracked provider cost', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake([[
        'title' => 'Printable practice worksheets',
        'description' => 'A simple collection of printable exercises.',
    ]])->preventStrayPrompts();

    $keyBefore = config('ai.providers.openai.key');
    $path = '/api/v1/creator-ai/products/'.$product->id;
    $this->getJson($path.'/copy-availability')->assertOk()->assertJsonPath('data.available', true);
    $result = $this->postJson($path.'/copy-proposals', [
        'tone' => 'clear',
        'language' => 'en',
    ])->assertOk()
        ->assertJsonPath('data.title', 'Printable practice worksheets')
        ->assertJsonPath('data.requires_review', true)
        ->assertJsonPath('data.cost_state', 'reserved_pending_reconciliation');

    expect($result->json('data.source_fingerprint'))->toMatch('/^[a-f0-9]{64}$/')
        ->and(config('ai.providers.openai.key'))->toBe($keyBefore)
        ->and($product->fresh()->title)->toBe('Creator sample worksheet')
        ->and($product->fresh()->status)->toBe('draft')
        ->and($product->fresh()->description)->toBe('<p>Printable exercise worksheets.</p>')
        ->and(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1)
        ->and(app(CreatorAiUsageService::class)->summary($creator)['completed'])->toBe(0);

    $this->postJson($path.'/copy-revision', [
        'source_fingerprint' => $result->json('data.source_fingerprint'),
    ])->assertOk()->assertJsonPath('data.unchanged', true);

    expect($result->getContent())->not->toContain('sk-synthetic-copy-fixture');
    expect($result->headers->get('Cache-Control'))->toContain('no-store');
});

test('drafts are stale after product edits and cannot be applied against a new revision', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake([[
        'title' => 'A suggested title',
        'description' => 'Practice worksheets suitable for printing.',
    ]])->preventStrayPrompts();

    $path = '/api/v1/creator-ai/products/'.$product->id;
    $proposal = $this->postJson($path.'/copy-proposals', [])->assertOk()->json('data');
    $product->update(['title' => 'Updated by the creator']);

    $this->postJson($path.'/copy-revision', [
        'source_fingerprint' => $proposal['source_fingerprint'],
    ])->assertStatus(409);
});

test('cross-creator product copy attempts do not leak information or debit quota', function () {
    creatorCopyTestConfiguration();
    [, , $product] = creatorCopyFixture();
    [$other] = creatorCopyFixture();
    creatorCopyActAs($this, $other);
    CreatorProductCopyAgent::fake()->preventStrayPrompts();
    $path = '/api/v1/creator-ai/products/'.$product->id;

    $this->getJson($path.'/copy-availability')->assertNotFound();
    $this->postJson($path.'/copy-proposals', [])->assertForbidden();
    $this->postJson($path.'/copy-revision', [
        'source_fingerprint' => str_repeat('a', 64),
    ])->assertForbidden();
    CreatorProductCopyAgent::assertNeverPrompted();
    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
});

test('advanced tone is Pro-only and cannot reserve credits for a Free creator', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake()->preventStrayPrompts();

    $this->postJson('/api/v1/creator-ai/products/'.$product->id.'/copy-proposals', [
        'tone' => 'warm',
        'language' => 'am',
    ])->assertForbidden();

    expect(DB::table('creator_ai_generation_attempts')->count())->toBe(0);
    CreatorProductCopyAgent::assertNeverPrompted();
});

test('unsafe copy is rejected and an uncertain provider charge stays reserved', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake([[
        'title' => 'Practice worksheets',
        'description' => 'Guaranteed income from these worksheets.',
    ]])->preventStrayPrompts();

    $this->postJson('/api/v1/creator-ai/products/'.$product->id.'/copy-proposals', [])
        ->assertStatus(503);
    expect(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1);
});

test('strict structured copy validator rejects script tags and excessive length', function () {
    $validator = app(ProductCopyDraftValidator::class);
    expect(fn () => $validator->clean([
        'title' => 'Worksheet',
        'description' => '<script>alert(1)</script>',
    ]))->toThrow(ValidationException::class);

    expect(fn () => $validator->clean([
        'title' => str_repeat('x', 161),
        'description' => 'Short.',
    ]))->toThrow(ValidationException::class);

    expect($validator->clean([
        'title' => ' Practice worksheets ',
        'description' => " Printable practice pages.\nReady to use. ",
    ]))->toBe([
        'title' => 'Practice worksheets',
        'description' => 'Printable practice pages. Ready to use.',
    ]);
});

test('approved and archived products cannot escape ordinary moderation via AI drafting', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake()->preventStrayPrompts();

    foreach (['approved', 'archived'] as $status) {
        $product->update(['status' => $status]);
        $this->postJson('/api/v1/creator-ai/products/'.$product->id.'/copy-proposals', [])
            ->assertForbidden();
    }

    CreatorProductCopyAgent::assertNeverPrompted();
});
