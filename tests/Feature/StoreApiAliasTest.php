<?php

use App\Stores\Models\Store;
use App\Models\User;
use Common\Auth\Middleware\VerifyApiAccessMiddleware;
use Illuminate\Support\Facades\Hash;
use Common\Workspaces\ActiveWorkspace;

it('exposes canonical stores route and keeps legacy with deprecation', function () {
    $user = User::factory()->create();
    $workspace = $user->workspaces()->first() ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id'=>$user->id]);
    $workspace->members()->firstOrCreate(['user_id' => $user->id], ['is_owner' => true]);
    $store = Store::factory()->create(['workspace_id'=>$workspace->id,'user_id'=>$user->id]);
    $this->actingAs($user);

    $canonical = $this->withHeader('Referer', 'http://localhost')->getJson('/api/v1/stores/'.$store->id);
    $canonical->assertOk()->assertJsonPath('data.model_type','store');

    $legacy = $this->withHeader('Referer', 'http://localhost')->getJson('/api/v1/biolinks/'.$store->id);
    $legacy->assertOk()->assertHeader('Deprecation','true');
});

it('accepts the correct password for an authorized api storefront request', function () {
    $user = User::factory()->create();
    $workspace = $user->workspaces()->first() ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id' => $user->id]);
    $workspace->members()->firstOrCreate(['user_id' => $user->id], ['is_owner' => true]);
    $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $user->id, 'password' => Hash::make('store-secret')]);
    $this->withoutMiddleware(VerifyApiAccessMiddleware::class)->actingAs($user);

    $this->getJson('/api/v1/stores/'.$store->id.'?password=incorrect')->assertForbidden();
    $this->getJson('/api/v1/stores/'.$store->id.'?password=store-secret')->assertOk();
});

it('does not reuse another signed-in user’s workspace cache', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();
    $firstWorkspace = \Common\Workspaces\Models\Workspace::factory()->create(['owner_id' => $first->id]);
    $secondWorkspace = \Common\Workspaces\Models\Workspace::factory()->create(['owner_id' => $second->id]);
    $firstWorkspace->members()->create(['user_id' => $first->id, 'is_owner' => true]);
    $secondWorkspace->members()->create(['user_id' => $second->id, 'is_owner' => true]);
    ActiveWorkspace::clearCache();

    $this->actingAs($first);
    expect(ActiveWorkspace::getAll()->pluck('id')->all())->toContain($firstWorkspace->id);
    $this->actingAs($second);
    expect(ActiveWorkspace::getAll()->pluck('id')->all())->toContain($secondWorkspace->id)->not->toContain($firstWorkspace->id);
});

it('includes actual storefront clicks in list cards', function () {
    $user = User::factory()->create();
    $workspace = $user->workspaces()->first() ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id' => $user->id]);
    $workspace->members()->firstOrCreate(['user_id' => $user->id], ['is_owner' => true]);
    $store = Store::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $user->id,
        'clicks_count' => 17,
    ]);

    $this->actingAs($user)->withHeader('Referer', 'http://localhost')
        ->getJson('/api/v1/stores?per_page=100')
        ->assertOk()
        ->assertJsonFragment(['id' => $store->id, 'clicks_count' => 17]);
});
