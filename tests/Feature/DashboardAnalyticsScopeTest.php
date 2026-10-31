<?php

use App\Analytics\Models\TrackedEvent;
use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Stores\Models\Store;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('dashboard analytics includes only creator owned storefront events in the selected workspace and dates', function () {
    $creator = User::factory()->create();
    $other = User::factory()->create();
    $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
    $otherWorkspace = app(CreateWorkspace::class)->createPersonalWorkspace($other);
    $secondWorkspace = \Common\Workspaces\Models\Workspace::query()->create(['name' => 'Second', 'owner_id' => $creator->id, 'is_personal' => false]);
    $secondWorkspace->members()->create(['user_id' => $creator->id, 'is_owner' => true]);
    $ownStore = Store::factory()->create(['user_id' => $creator->id, 'workspace_id' => $workspace->id]);
    $otherStore = Store::factory()->create(['user_id' => $other->id, 'workspace_id' => $otherWorkspace->id]);
    $sharedStore = Store::factory()->create(['user_id' => $other->id, 'workspace_id' => $workspace->id]);
    $secondStore = Store::factory()->create(['user_id' => $creator->id, 'workspace_id' => $secondWorkspace->id]);
    foreach ([[$ownStore, 'ET', now()], [$otherStore, 'US', now()], [$sharedStore, 'FR', now()], [$secondStore, 'DE', now()], [$ownStore, 'GB', now()->subMonths(2)]] as [$store, $country, $date]) {
        TrackedEvent::query()->create(['linkeable_type' => Biolink::MODEL_TYPE, 'linkeable_id' => $store->id, 'user_id' => $store->user_id, 'workspace_id' => $store->workspace_id, 'location' => $country, 'crawler' => false, 'created_at' => $date]);
    }
    ActiveWorkspace::clearCache();
    $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($creator);
    $dates = '&start_date='.now()->subDays(7)->format('Y-m-d').'&end_date='.now()->addDay()->format('Y-m-d').'&timezone=UTC';
    $this->getJson('/api/v1/tracked-events/report?dashboard=1&metric=events'.$dates)->assertOk()->assertJsonPath('data.events.total', 1);
    $this->getJson('/api/v1/tracked-events/report?dashboard=1&metric=countries'.$dates)->assertOk()->assertJsonCount(1, 'data.countries.data')->assertJsonPath('data.countries.data.0.code', 'et');
    $this->getJson('/api/v1/tracked-events/report?dashboard=1&metric=events&workspace_id='.$otherWorkspace->id.$dates)->assertOk()->assertJsonPath('data.events.total', 1);
    $this->getJson('/api/v1/tracked-events/report?dashboard=1&metric=countries&workspace_id='.$secondWorkspace->id.$dates)->assertOk()->assertJsonCount(1, 'data.countries.data')->assertJsonPath('data.countries.data.0.code', 'de');
});
