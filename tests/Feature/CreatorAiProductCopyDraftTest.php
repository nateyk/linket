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

require_once __DIR__.'/../Support/creator-copy-fixtures.php';

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

test('a product type change invalidates a copy revision even within the same timestamp', function () {
    $this->freezeTime();
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake([[
        'title' => 'A suggested title',
        'description' => 'Practice worksheets suitable for printing.',
    ]])->preventStrayPrompts();
    $path = '/api/v1/creator-ai/products/'.$product->id;
    $proposal = $this->postJson($path.'/copy-proposals', [])->assertOk()->json('data');
    $product->update(['type' => 'audio']);

    $this->postJson($path.'/copy-revision', [
        'source_fingerprint' => $proposal['source_fingerprint'],
    ])->assertConflict();
});

test('generation rechecks the product after provider latency without releasing a possibly billable hold', function (array $change, int $status) {
    $this->freezeTime();
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake(function () use ($product, $change): array {
        $product->update($change);

        return [
            'title' => 'A private suggestion',
            'description' => 'Printable exercises for practice.',
        ];
    })->preventStrayPrompts();

    $response = $this->postJson('/api/v1/creator-ai/products/'.$product->id.'/copy-proposals', [])
        ->assertStatus($status);

    expect($response->getContent())->not->toContain('A private suggestion', 'sk-synthetic-copy-fixture');
    expect($product->fresh()->only(array_keys($change)))->toBe($change);
    expect(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1);
    expect(app(CreatorAiUsageService::class)->summary($creator)['completed'])->toBe(0);
    expect(DB::table('creator_ai_provider_usage_months')->sum('spent_microusd'))->toBe(0);
    CreatorProductCopyAgent::assertPromptedTimes(1);
})->with([
    'edited description' => [['description' => 'Creator edited during generation.'], 409],
    'changed type with unchanged clock' => [['type' => 'audio'], 409],
    'submitted for moderation' => [['status' => 'pending_approval'], 403],
]);

test('a creator loses access to an in-flight suggestion after product ownership changes', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    [$other] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake(function () use ($product, $other): array {
        $product->update(['user_id' => $other->id]);

        return ['title' => 'Private copy', 'description' => 'Printable practice exercises.'];
    })->preventStrayPrompts();

    $response = $this->postJson('/api/v1/creator-ai/products/'.$product->id.'/copy-proposals', [])
        ->assertForbidden();

    expect($response->getContent())->not->toContain('Private copy');
    expect(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1);
    CreatorProductCopyAgent::assertPromptedTimes(1);
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


test('approved AI copy is saved only once through the ordinary draft endpoint', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake([[
        'title' => 'Updated workbook title',
        'description' => 'Creator-reviewed exercise details.',
    ]])->preventStrayPrompts();

    $proposal = $this->postJson('/api/v1/creator-ai/products/'.$product->id.'/copy-proposals', [])
        ->assertOk()->json('data');
    $payload = [
        'title' => $product->title,
        'description' => 'Creator-reviewed exercise details.',
        'type' => 'digital',
        'file_ids' => [],
        'biolink_ids' => [],
        'ai_copy_source_fingerprint' => $proposal['source_fingerprint'],
    ];
    $path = '/api/v1/items/'.$product->id.'/draft';
    $this->putJson($path, $payload)->assertOk()
        ->assertJsonPath('data.description', 'Creator-reviewed exercise details.')
        ->assertJsonPath('data.content_revision', 1);

    // Timestamp precision and a byte-for-byte identical replay must never
    // make the previously approved fingerprint reusable.
    $this->putJson($path, $payload)->assertConflict();
    expect($product->fresh()->description)->toBe('Creator-reviewed exercise details.');
    expect($product->fresh()->content_revision)->toBe(1);
});

test('stale AI copy is rejected by the normal save before any product mutation', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    CreatorProductCopyAgent::fake([[
        'title' => 'Private recommendation',
        'description' => 'Safer practice worksheets.',
    ]])->preventStrayPrompts();

    $proposal = $this->postJson('/api/v1/creator-ai/products/'.$product->id.'/copy-proposals', [])
        ->assertOk()->json('data');
    $product->update(['title' => 'Fresh creator title']);
    $this->putJson('/api/v1/items/'.$product->id.'/draft', [
        'title' => 'Stale AI title',
        'description' => 'Safer practice worksheets.',
        'type' => 'digital',
        'file_ids' => [],
        'biolink_ids' => [],
        'ai_copy_source_fingerprint' => $proposal['source_fingerprint'],
    ])->assertConflict();

    expect($product->fresh()->title)->toBe('Fresh creator title');
    expect($product->fresh()->description)->toBe('<p>Printable exercise worksheets.</p>');
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
