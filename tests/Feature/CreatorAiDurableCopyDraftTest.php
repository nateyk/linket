<?php

use App\CreatorAi\Writing\CreatorProductCopyDraftService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

require_once __DIR__.'/../Support/creator-copy-fixtures.php';

test('private proposals are durable and encrypted without changing the product', function () {
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($this, $creator);
    \App\CreatorAi\Writing\CreatorProductCopyAgent::fake([[
        'title' => 'Private worksheet draft', 'description' => 'Private printable exercises.',
    ]])->preventStrayPrompts();
    $path = '/api/v1/creator-ai/products/'.$product->id;
    $proposal = $this->postJson($path.'/copy-proposals')->assertOk()->json('data');
    expect($proposal)->toHaveKeys(['draft_id', 'draft_version', 'state']);
    $this->getJson($path.'/copy-drafts/'.$proposal['draft_id'])
        ->assertOk()->assertJsonPath('data.description', 'Private printable exercises.')
        ->assertJsonPath('data.state', 'proposed')->assertHeader('Cache-Control', 'no-store, private');
    expect(DB::table('creator_ai_copy_drafts')->value('encrypted_content'))->not->toContain('Private printable');
    expect($product->fresh()->description)->toBe('<p>Printable exercise worksheets.</p>');
});

/** @return array{0:App\Models\User,1:App\Storefront\Models\DigitalProduct,2:string,3:array<string,mixed>} */
function durableCopyProposal($test): array
{
    creatorCopyTestConfiguration();
    [$creator, , $product] = creatorCopyFixture();
    creatorCopyActAs($test, $creator);
    \App\CreatorAi\Writing\CreatorProductCopyAgent::fake([[
        'title' => 'Private worksheet draft', 'description' => 'Private printable exercises.',
    ]])->preventStrayPrompts();
    $path = '/api/v1/creator-ai/products/'.$product->id;
    $proposal = $test->postJson($path.'/copy-proposals')->assertOk()->json('data');

    return [$creator, $product, $path, $proposal];
}

/** @return array<string,mixed> */
function durableCopyPayload($product, array $draft): array
{
    return ['title' => $product->title, 'description' => $draft['description'], 'type' => 'digital',
        'file_ids' => [], 'biolink_ids' => [], 'ai_copy_source_fingerprint' => $draft['source_fingerprint'],
        'ai_copy_draft_id' => $draft['draft_id'], 'ai_copy_draft_version' => $draft['draft_version']];
}

test('review edits survive reopening and identical apply retries commit only once', function () {
    [, $product, $path, $draft] = durableCopyProposal($this);
    $review = $this->patchJson($path.'/copy-drafts/'.$draft['draft_id'], [
        'version' => 0, 'description' => 'My reviewed printable exercises.',
    ])->assertOk()->assertJsonPath('data.state', 'reviewed')->json('data');
    $this->getJson($path.'/copy-drafts')->assertOk()->assertJsonPath('data.description', $review['description']);
    $payload = durableCopyPayload($product, $review);
    $save = '/api/v1/items/'.$product->id.'/draft';
    $this->putJson($save, $payload)->assertOk();
    $this->putJson($save, $payload)->assertOk();
    expect($product->fresh()->content_revision)->toBe(1);
    expect($product->reviewEvents()->count())->toBe(1);
    $this->getJson($path.'/copy-drafts/'.$draft['draft_id'])->assertOk()->assertJsonPath('data.state', 'applied');
    $this->putJson($save, [...$payload, 'title' => 'Different replay'])->assertConflict();
    expect($product->fresh()->title)->toBe($product->title);
});

test('discard is idempotent and cannot change product content', function () {
    [, $product, $path, $draft] = durableCopyProposal($this);
    $before = $product->fresh()->getAttributes();
    $discard = $path.'/copy-drafts/'.$draft['draft_id'].'/discard';
    $this->postJson($discard, ['version' => 0])->assertOk();
    $this->postJson($discard, ['version' => 0])->assertOk()->assertJsonPath('data.state', 'discarded');
    $this->putJson('/api/v1/items/'.$product->id.'/draft', durableCopyPayload($product, $draft))->assertConflict();
    expect($product->fresh()->getAttributes())->toBe($before);
});

test('another creator and a switched product cannot read review discard or apply private drafts', function () {
    [, $product, $path, $draft] = durableCopyProposal($this);
    [$other, , $otherProduct] = creatorCopyFixture();
    creatorCopyActAs($this, $other);
    $id = $draft['draft_id'];
    foreach ([$path, '/api/v1/creator-ai/products/'.$otherProduct->id] as $base) {
        $this->getJson($base.'/copy-drafts/'.$id)->assertNotFound();
        $this->patchJson($base.'/copy-drafts/'.$id, ['version' => 0, 'description' => 'Stolen edit'])->assertNotFound();
        $this->postJson($base.'/copy-drafts/'.$id.'/discard', ['version' => 0])->assertNotFound();
    }
    $this->putJson('/api/v1/items/'.$otherProduct->id.'/draft', durableCopyPayload($otherProduct, $draft))->assertNotFound();
    expect($product->fresh()->content_revision)->toBe(0);
});

test('moving the product to another workspace denies the old draft', function () {
    [, $product, $path, $draft] = durableCopyProposal($this);
    [, $workspace] = creatorCopyFixture();
    $product->update(['workspace_id' => $workspace]);
    $this->getJson($path.'/copy-drafts/'.$draft['draft_id'])->assertForbidden();
});

test('stale and expired suggestions retain private edits but cannot apply', function (bool $expired) {
    [, $product, $path, $draft] = durableCopyProposal($this);
    if ($expired) {
        DB::table('creator_ai_copy_drafts')->where('id', $draft['draft_id'])->update(['expires_at' => now()->subMinute()]);
    } else {
        $product->update(['title' => 'Newer product work']);
    }
    $review = $this->patchJson($path.'/copy-drafts/'.$draft['draft_id'], [
        'version' => 0, 'description' => 'Keep this creator text.',
    ])->assertOk()->assertJsonPath('data.state', $expired ? 'expired' : 'invalidated')->json('data');
    $this->putJson('/api/v1/items/'.$product->id.'/draft', durableCopyPayload($product, $review))->assertConflict();
    $this->getJson($path.'/copy-drafts/'.$draft['draft_id'])->assertOk()->assertJsonPath('data.description', 'Keep this creator text.');
    expect($product->fresh()->content_revision)->toBe(0);
})->with([true, false]);

test('a failed normal product mutation rolls back applied state and preserves reviewed text', function () {
    [, $product, $path, $draft] = durableCopyProposal($this);
    $review = $this->patchJson($path.'/copy-drafts/'.$draft['draft_id'], [
        'version' => 0, 'description' => 'Creator text survives failure.',
    ])->assertOk()->json('data');
    $payload = durableCopyPayload($product, $review);
    $this->putJson('/api/v1/items/'.$product->id.'/draft', [...$payload, 'file_ids' => [999999999]])->assertUnprocessable();
    $this->getJson($path.'/copy-drafts/'.$draft['draft_id'])->assertOk()->assertJsonPath('data.state', 'reviewed');
    expect($product->fresh()->content_revision)->toBe(0);
    $this->putJson('/api/v1/items/'.$product->id.'/draft', $payload)->assertOk();
});

test('concurrent review versions cannot overwrite a newer private edit', function () {
    [, , $path, $draft] = durableCopyProposal($this);
    $url = $path.'/copy-drafts/'.$draft['draft_id'];
    $this->patchJson($url, ['version' => 0, 'description' => 'First tab edit.'])->assertOk();
    $this->patchJson($url, ['version' => 0, 'description' => 'First tab edit.'])->assertOk();
    $this->patchJson($url, ['version' => 0, 'description' => 'Second tab edit.'])->assertConflict();
    $this->getJson($url)->assertOk()->assertJsonPath('data.description', 'First tab edit.');
});

test('proposed drafts require review and complete approval identity', function () {
    [, $product, , $draft] = durableCopyProposal($this);
    $payload = durableCopyPayload($product, $draft);
    $path = '/api/v1/items/'.$product->id.'/draft';
    $this->putJson($path, $payload)->assertConflict();
    foreach (['ai_copy_source_fingerprint', 'ai_copy_draft_version', 'ai_copy_draft_id'] as $field) {
        $incomplete = $payload;
        unset($incomplete[$field]);
        $this->putJson($path, $incomplete)->assertUnprocessable();
    }
    expect($product->fresh()->content_revision)->toBe(0);
});

test('applied drafts cannot be reviewed or discarded and cannot replay over newer work', function () {
    [, $product, $path, $draft] = durableCopyProposal($this);
    $url = $path.'/copy-drafts/'.$draft['draft_id'];
    $review = $this->patchJson($url, ['version' => 0, 'description' => 'Approved text.'])->assertOk()->json('data');
    $payload = durableCopyPayload($product, $review);
    $save = '/api/v1/items/'.$product->id.'/draft';
    $this->putJson($save, $payload)->assertOk();
    $this->patchJson($url, ['version' => 1, 'description' => 'Changed private text.'])->assertConflict();
    $this->postJson($url.'/discard', ['version' => 1])->assertConflict();
    $ordinary = $payload;
    unset($ordinary['ai_copy_draft_id'], $ordinary['ai_copy_draft_version'], $ordinary['ai_copy_source_fingerprint']);
    $this->putJson($save, [...$ordinary, 'description' => 'Newer saved work.'])->assertOk();
    $this->putJson($save, $payload)->assertConflict();
    expect($product->fresh()->description)->toBe('Newer saved work.');
});

test('unsafe private edits are rejected while the saved suggestion remains recoverable', function () {
    [, , $path, $draft] = durableCopyProposal($this);
    $url = $path.'/copy-drafts/'.$draft['draft_id'];
    $this->patchJson($url, ['version' => 0, 'description' => '<script>secret()</script>'])->assertUnprocessable();
    $this->getJson($url)->assertOk()->assertJsonPath('data.description', $draft['description'])
        ->assertJsonPath('data.draft_version', 0);
});
