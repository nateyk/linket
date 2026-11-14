<?php

use App\Analytics\Models\TrackedEvent;
use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Stores\Models\Store;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

it('shows lifetime profile clicks and distinct non-crawler visitor IPs in list and detail APIs', function () {
    $user = User::factory()->create();
    $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($user);

    $store = Store::factory()->create([
        'user_id' => $user->id,
        'workspace_id' => $workspace->id,
        'clicks_count' => 5,
    ]);
    $otherStore = Store::factory()->create([
        'user_id' => $user->id,
        'workspace_id' => $workspace->id,
        'clicks_count' => 1,
    ]);

    foreach ([
        [$store->id, Biolink::MODEL_TYPE, '198.51.100.10', false, 'click'],
        [$store->id, Biolink::MODEL_TYPE, '198.51.100.10', false, 'click'],
        [$store->id, Store::MODEL_TYPE, '198.51.100.20', false, 'click'],
        [$store->id, Biolink::MODEL_TYPE, '198.51.100.30', true, 'click'],
        [$store->id, Biolink::MODEL_TYPE, '198.51.100.40', false, 'scan'],
        [$store->id, Biolink::MODEL_TYPE, null, false, 'click'],
        [$otherStore->id, Biolink::MODEL_TYPE, '198.51.100.50', false, 'click'],
    ] as [$id, $type, $ip, $crawler, $eventType]) {
        TrackedEvent::query()->create([
            'linkeable_id' => $id,
            'linkeable_type' => $type,
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'ip' => $ip,
            'crawler' => $crawler,
            'event_type' => $eventType,
            'created_at' => now(),
        ]);
    }

    ActiveWorkspace::clearCache();
    $this->withSession(['_token' => 'test-token'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'test-token')
        ->actingAs($user);

    $list = $this->getJson('/api/v1/stores?per_page=100');
    $list->assertOk();
    $row = collect($list->json('data'))->firstWhere('id', $store->id);
    expect($row)->not->toBeNull()
        ->and($row['clicks_count'])->toBe(5)
        ->and($row['unique_visitors_count'])->toBe(2)
        ->and(json_encode($row))->not->toContain('198.51.100.10');

    $other = collect($list->json('data'))->firstWhere('id', $otherStore->id);
    expect($other['unique_visitors_count'])->toBe(1);

    $this->getJson('/api/v1/stores/' . $store->id)
        ->assertOk()
        ->assertJsonPath('data.clicks_count', 5)
        ->assertJsonPath('data.unique_visitors_count', 2);

    // The compatibility endpoint must not silently revert to zero.
    $legacy = $this->getJson('/api/v1/biolinks');
    $legacy->assertOk();
    $legacyRow = collect($legacy->json('data'))->firstWhere('id', $store->id);
    expect($legacyRow['clicks_count'])->toBe(5)
        ->and($legacyRow['unique_visitors_count'])->toBe(2);
});

it('includes both canonical and legacy storefront visit events in the insights filter', function () {
    $user = User::factory()->create();
    $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($user);
    $store = Store::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $user->id,
    ]);

    foreach ([Biolink::MODEL_TYPE, Store::MODEL_TYPE] as $type) {
        TrackedEvent::query()->create([
            'linkeable_id' => $store->id,
            'linkeable_type' => $type,
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'ip' => '198.51.100.10',
            'crawler' => false,
            'event_type' => 'click',
            'created_at' => now(),
        ]);
    }

    ActiveWorkspace::clearCache();
    $this->withSession(['_token' => 'test-token'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'test-token')
        ->actingAs($user);
    $start = now()->subDay()->toDateString();
    $end = now()->addDay()->toDateString();

    $this->getJson(
        "/api/v1/tracked-events/report?metric=events&event_type=click&biolink_id={$store->id}&start_date={$start}&end_date={$end}&timezone=UTC",
    )->assertOk()->assertJsonPath('data.events.total', 2);
});

it('does not count dashboard shortcuts or QR preview routes as public profile visits', function () {
    $user = User::factory()->create();
    $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($user);
    $store = Store::factory()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $user->id,
        'clicks_count' => 0,
    ]);

    $this->get("/{$store->back_half}+")->assertRedirect();
    $this->get("/{$store->back_half}/qr")->assertOk();

    expect((int) $store->fresh()->clicks_count)->toBe(0);
    expect(TrackedEvent::query()
        ->where('linkeable_id', $store->id)
        ->whereIn('linkeable_type', [Biolink::MODEL_TYPE, Store::MODEL_TYPE])
        ->count())->toBe(0);
});
