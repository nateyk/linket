<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;

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
    // The real dashboard sends a same-origin Referer. Without it the
    // existing VerifyApiAccess middleware correctly treats this test request
    // as a third-party API client and requires a separate api.access grant.
    // Keep the protection enabled; emulate the authenticated browser instead.
    $test->withSession(['_token' => 'creator-copy-test'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'creator-copy-test')
        ->actingAs($user);
}
