<?php

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Database\Seeders\NateeDemoServicesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

afterEach(function () {
    ActiveWorkspace::clearCache();
});

function createNateeDemoStore(): Biolink
{
    $token = Str::lower(Str::random(12));

    $creator = User::query()->forceCreate([
        'name' => 'Demo creator '.$token,
        'username' => $token,
        'email' => "{$token}@example.test",
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);

    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

    $store = Biolink::query()->create([
        'back_half' => 'natee',
        'name' => 'Natee demo storefront',
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
    ]);

    ActiveWorkspace::clearCache();

    return $store;
}

test('it seeds the natee demo services idempotently', function () {
    $store = createNateeDemoStore();

    $this->seed(NateeDemoServicesSeeder::class);
    $this->seed(NateeDemoServicesSeeder::class);

    $services = CreatorService::query()
        ->where('store_id', $store->id)
        ->with(['packages', 'faqs'])
        ->get()
        ->keyBy('slug');

    expect($services)->toHaveCount(3)
        ->and($services->keys()->sort()->values()->all())->toBe([
            'custom-illustration-pack',
            'social-media-management',
            'website-design-development',
        ]);

    $website = $services['website-design-development'];

    expect($website->status)->toBe('published')
        ->and($website->workspace_id)->toBe($store->workspace_id)
        ->and($website->user_id)->toBe($store->user_id)
        ->and($website->packages)->toHaveCount(3)
        ->and($website->packages->min('price_cents'))->toBe(49900)
        ->and($website->faqs)->toHaveCount(3)
        ->and($website->contact_channels)->toHaveCount(3);

    $social = $services['social-media-management'];

    expect($social->packages->min('price_cents'))->toBe(29900)
        ->and($social->faqs)->toHaveCount(3);

    $illustration = $services['custom-illustration-pack'];

    expect($illustration->packages)->toHaveCount(3)
        ->and($illustration->packages->every(fn ($package) => $package->price_cents === null))->toBeTrue()
        ->and($illustration->faqs)->toHaveCount(3);
});

test('it skips the demo when the natee storefront does not exist', function () {
    $this->seed(NateeDemoServicesSeeder::class);

    expect(CreatorService::query()->whereIn('slug', [
        'website-design-development',
        'social-media-management',
        'custom-illustration-pack',
    ])->count())->toBe(0);
});
